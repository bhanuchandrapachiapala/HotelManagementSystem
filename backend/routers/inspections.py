import time
import traceback
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.inspection import (
    CreateInspectorRequest,
    CreateInspectionRequest,
    UpdateInspectionRequest,
    SubmitInspectionRequest,
    CreateIssueRequest,
    UpdateIssueStatusRequest,
    PhotoUploadUrlRequest,
    VALID_INSPECTION_TYPES,
    VALID_CONDITIONS,
    VALID_CATEGORIES,
    VALID_SEVERITIES,
    VALID_ISSUE_STATUSES,
    INSPECTION_TYPE_LABELS,
    CATEGORY_LABELS,
    CATEGORY_EMOJIS,
    SEVERITY_LABELS,
    SLA_HOURS,
    QUICK_CHECK_ITEMS,
    compute_floor,
    compute_sla_status,
    compute_time_open_hours,
)

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _enrich_issue(row: dict) -> dict:
    """Add computed sla_status and time_open_hours to an issue row."""
    severity = row.get('severity', 'standard')
    created_at = row.get('created_at')
    resolved_at = row.get('resolved_at')
    if created_at:
        row['time_open_hours'] = compute_time_open_hours(created_at, resolved_at)
        row['sla_status'] = compute_sla_status(severity, created_at, resolved_at)
    else:
        row['time_open_hours'] = None
        row['sla_status'] = 'no_sla'
    return row


def _flatten_inspection(row: dict) -> dict:
    """Pull inspector name out of the nested join object."""
    inspector = row.pop('inspectors', None)
    row['inspector_name'] = inspector['name'] if isinstance(inspector, dict) else None
    return row


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


# ── Inspectors ────────────────────────────────────────────────────────────────

@router.get('/inspectors')
def get_inspectors(include_inactive: bool = Query(default=False)):
    db = get_supabase()
    query = db.table('inspectors').select('*').order('name')
    if not include_inactive:
        query = query.eq('is_active', True)
    result = query.execute()
    return {'inspectors': result.data or []}


@router.post('/inspectors', status_code=201)
def add_inspector(body: CreateInspectorRequest):
    db = get_supabase()
    try:
        result = db.table('inspectors').insert({'name': body.name}).execute()
        return {'message': 'Inspector added', 'inspector': result.data[0]}
    except Exception as exc:
        traceback.print_exc()
        if 'unique' in str(exc).lower() or 'duplicate' in str(exc).lower():
            raise HTTPException(status_code=409, detail='Inspector with this name already exists')
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete('/inspectors/{inspector_id}')
def deactivate_inspector(inspector_id: int):
    db = get_supabase()
    existing = db.table('inspectors').select('*').eq('id', inspector_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Inspector not found')
    result = db.table('inspectors').update({'is_active': False}).eq('id', inspector_id).execute()
    inspector = result.data[0] if result.data else existing.data[0]
    return {'message': 'Inspector deactivated', 'inspector': inspector}


# ── Inspection start / update / submit ────────────────────────────────────────

@router.post('/start', status_code=201)
def start_inspection(body: CreateInspectionRequest):
    db = get_supabase()

    # Verify inspector exists and is active
    insp = db.table('inspectors').select('id, name').eq('id', body.inspector_id).eq('is_active', True).execute()
    if not insp.data:
        raise HTTPException(status_code=404, detail='Inspector not found')

    floor = compute_floor(body.room_number)

    row = {
        'room_number': body.room_number,
        'floor': floor,
        'inspector_id': body.inspector_id,
        'inspection_type': body.inspection_type,
        'status': 'in_progress',
        'quick_checks': {},
    }

    try:
        result = db.table('inspections').insert(row).execute()
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))

    inspection = result.data[0]
    inspection['inspector_name'] = insp.data[0]['name']
    return {'message': 'Inspection started', 'inspection': inspection}


# ── Routes that must come BEFORE /{inspection_id} ─────────────────────────────

@router.get('/issues/open')
def get_open_issues(
    severity: Optional[str] = Query(default=None),
    room_number: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
):
    db = get_supabase()
    query = (
        db.table('inspection_issues')
        .select('*')
        .in_('status', ['open', 'in_progress'])
    )
    if severity:
        query = query.eq('severity', severity)
    if room_number:
        query = query.eq('room_number', room_number)
    if category:
        query = query.eq('category', category)

    result = query.execute()
    issues = [_enrich_issue(r) for r in (result.data or [])]

    severity_order = {'urgent': 0, 'standard': 1, 'minor': 2, 'note': 3}
    issues.sort(key=lambda i: (severity_order.get(i.get('severity', 'note'), 9), i.get('created_at') or ''))

    counts = defaultdict(int)
    for i in issues:
        counts[i.get('severity', 'note')] += 1

    return {
        'total': len(issues),
        'urgent': counts['urgent'],
        'standard': counts['standard'],
        'minor': counts['minor'],
        'note': counts['note'],
        'issues': issues,
    }


@router.get('/log')
def get_inspection_log(
    limit: int = Query(default=20, le=50, ge=1),
    offset: int = Query(default=0, ge=0),
    room_number: Optional[str] = Query(default=None),
    inspector_id: Optional[int] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
):
    db = get_supabase()

    base = db.table('inspections').select('*, inspectors(name)', count='exact').eq('status', 'submitted')
    if room_number:
        base = base.eq('room_number', room_number)
    if inspector_id is not None:
        base = base.eq('inspector_id', inspector_id)
    if date_from:
        base = base.gte('submitted_at', date_from)
    if date_to:
        base = base.lte('submitted_at', date_to)

    result = base.order('submitted_at', desc=True).range(offset, offset + limit - 1).execute()
    rows = [_flatten_inspection(r) for r in (result.data or [])]

    # For each inspection, get issue counts
    inspection_ids = [r['id'] for r in rows]
    issues_by_inspection: dict[int, list[dict]] = defaultdict(list)
    if inspection_ids:
        issues_result = (
            db.table('inspection_issues')
            .select('inspection_id, status, severity')
            .in_('inspection_id', inspection_ids)
            .execute()
        )
        for issue in issues_result.data or []:
            issues_by_inspection[issue['inspection_id']].append(issue)

    inspections = []
    for r in rows:
        inspection_issues = issues_by_inspection.get(r['id'], [])
        open_count = sum(1 for i in inspection_issues if i.get('status') in ('open', 'in_progress'))
        inspections.append({
            **r,
            'issues_count': len(inspection_issues),
            'open_issues_count': open_count,
        })

    total = result.count if hasattr(result, 'count') and result.count is not None else len(inspections)
    return {'total': total, 'inspections': inspections}


@router.get('/room-status')
def get_room_status():
    db = get_supabase()

    # Build full 136-room scaffold
    rooms: dict[str, dict] = {}
    for floor in [1, 2, 3, 4]:
        for n in range(1, 35):
            rn = f'{floor}{n:02d}'
            rooms[rn] = {
                'room_number': rn,
                'floor': floor,
                'last_inspection_date': None,
                'last_inspection_type': None,
                'overall_condition': None,
                'open_issues': 0,
                'urgent_issues': 0,
                'status': 'never_inspected',
            }

    # Latest inspection per room
    inspections_result = (
        db.table('inspections')
        .select('room_number, inspection_type, overall_condition, submitted_at, started_at, status')
        .eq('status', 'submitted')
        .order('submitted_at', desc=True)
        .execute()
    )
    seen: set[str] = set()
    for r in inspections_result.data or []:
        rn = r['room_number']
        if rn in rooms and rn not in seen:
            seen.add(rn)
            rooms[rn]['last_inspection_date'] = (r.get('submitted_at') or '').split('T')[0] if r.get('submitted_at') else None
            rooms[rn]['last_inspection_type'] = r.get('inspection_type')
            rooms[rn]['overall_condition'] = r.get('overall_condition')

    # Open issues per room
    issues_result = (
        db.table('inspection_issues')
        .select('room_number, severity, status')
        .in_('status', ['open', 'in_progress'])
        .execute()
    )
    for issue in issues_result.data or []:
        rn = issue.get('room_number')
        if rn in rooms:
            rooms[rn]['open_issues'] += 1
            if issue.get('severity') == 'urgent':
                rooms[rn]['urgent_issues'] += 1

    # Compute final status
    for rn, room in rooms.items():
        if room['last_inspection_date'] is None:
            room['status'] = 'never_inspected'
        elif room['urgent_issues'] > 0:
            room['status'] = 'urgent'
        elif room['open_issues'] == 0:
            room['status'] = 'clear'
        else:
            # Non-urgent issues — check severity mix
            sev_query = (
                db.table('inspection_issues')
                .select('severity')
                .eq('room_number', rn)
                .in_('status', ['open', 'in_progress'])
                .execute()
            )
            severities = [s.get('severity') for s in (sev_query.data or [])]
            if any(s == 'standard' for s in severities):
                room['status'] = 'standard_issues'
            elif any(s in ('minor', 'note') for s in severities):
                room['status'] = 'minor_issues'
            else:
                room['status'] = 'clear'

    return {'rooms': rooms}


@router.get('/analytics')
def get_analytics(days: int = Query(default=30, ge=1, le=90)):
    db = get_supabase()
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=days)).isoformat()

    # Inspections in period
    inspections_result = (
        db.table('inspections')
        .select('*, inspectors(name)')
        .gte('started_at', cutoff)
        .execute()
    )
    inspections = [_flatten_inspection(r) for r in (inspections_result.data or [])]
    submitted = [i for i in inspections if i.get('status') == 'submitted']

    # Issues in period
    issues_result = (
        db.table('inspection_issues')
        .select('*')
        .gte('created_at', cutoff)
        .execute()
    )
    issues = issues_result.data or []

    open_count = sum(1 for i in issues if i.get('status') in ('open', 'in_progress'))
    urgent_open = sum(1 for i in issues if i.get('status') in ('open', 'in_progress') and i.get('severity') == 'urgent')

    # Avg inspection duration
    durations = [float(i['duration_minutes']) for i in submitted if i.get('duration_minutes') is not None]
    avg_duration = round(sum(durations) / len(durations), 2) if durations else None

    # Avg resolution hours by severity
    resolved = [i for i in issues if i.get('resolved_at')]
    resolution_by_sev: dict[str, list[float]] = defaultdict(list)
    for i in resolved:
        try:
            created = _parse_dt(i.get('created_at'))
            res = _parse_dt(i.get('resolved_at'))
            if created and res:
                hours = (res - created).total_seconds() / 3600
                resolution_by_sev[i.get('severity', 'standard')].append(hours)
        except Exception:
            pass
    avg_resolution = {
        sev: round(sum(vals) / len(vals), 2) if vals else None
        for sev, vals in resolution_by_sev.items()
    }

    # Issues by category
    cat_counts: dict[str, int] = defaultdict(int)
    for i in issues:
        cat_counts[i.get('category', 'maintenance')] += 1
    total_issues = len(issues)
    issues_by_category = sorted(
        [
            {
                'category': cat,
                'label': CATEGORY_LABELS.get(cat, cat.title()),
                'emoji': CATEGORY_EMOJIS.get(cat, '🔧'),
                'count': count,
                'percentage': round(count / total_issues * 100, 1) if total_issues else 0,
            }
            for cat, count in cat_counts.items()
        ],
        key=lambda x: x['count'],
        reverse=True,
    )

    # Issues by severity (with resolved + sla_met)
    sev_data: dict[str, dict[str, int]] = defaultdict(lambda: {'count': 0, 'resolved': 0, 'sla_met': 0})
    for i in issues:
        sev = i.get('severity', 'standard')
        sev_data[sev]['count'] += 1
        if i.get('resolved_at'):
            sev_data[sev]['resolved'] += 1
            sla_status = compute_sla_status(sev, i.get('created_at'), i.get('resolved_at'))
            if sla_status == 'within_sla':
                sev_data[sev]['sla_met'] += 1
    issues_by_severity = [
        {'severity': sev, 'count': data['count'], 'resolved': data['resolved'], 'sla_met': data['sla_met']}
        for sev, data in sev_data.items()
    ]

    # Most problematic rooms
    room_issues: dict[str, dict] = defaultdict(lambda: {'total_issues': 0, 'open_issues': 0, 'inspection_count': 0})
    for i in issues:
        rn = i.get('room_number')
        if rn:
            room_issues[rn]['total_issues'] += 1
            if i.get('status') in ('open', 'in_progress'):
                room_issues[rn]['open_issues'] += 1
    for insp in submitted:
        rn = insp.get('room_number')
        if rn:
            room_issues[rn]['inspection_count'] += 1
    most_problematic = sorted(
        [
            {
                'room_number': rn,
                'floor': int(rn[0]) if rn and rn[0].isdigit() else 0,
                'total_issues': data['total_issues'],
                'open_issues': data['open_issues'],
                'inspection_count': data['inspection_count'],
                'avg_issues_per_inspection': round(data['total_issues'] / data['inspection_count'], 2) if data['inspection_count'] else 0,
            }
            for rn, data in room_issues.items()
        ],
        key=lambda x: x['total_issues'],
        reverse=True,
    )[:10]

    # Inspector stats
    inspector_data: dict[int, dict] = defaultdict(lambda: {
        'name': '',
        'total_inspections': 0,
        'durations': [],
    })
    inspections_by_inspector: dict[int, list[int]] = defaultdict(list)
    for insp in submitted:
        iid = insp.get('inspector_id')
        if iid:
            inspector_data[iid]['name'] = insp.get('inspector_name') or ''
            inspector_data[iid]['total_inspections'] += 1
            if insp.get('duration_minutes') is not None:
                inspector_data[iid]['durations'].append(float(insp['duration_minutes']))
            inspections_by_inspector[iid].append(insp['id'])

    # Issues found per inspector
    inspector_issues: dict[int, int] = defaultdict(int)
    inspection_id_to_inspector: dict[int, int] = {}
    for insp in submitted:
        if insp.get('inspector_id'):
            inspection_id_to_inspector[insp['id']] = insp['inspector_id']
    for issue in issues:
        iid = inspection_id_to_inspector.get(issue.get('inspection_id'))
        if iid:
            inspector_issues[iid] += 1

    inspector_stats = sorted(
        [
            {
                'inspector_id': iid,
                'inspector_name': data['name'],
                'total_inspections': data['total_inspections'],
                'avg_duration_minutes': round(sum(data['durations']) / len(data['durations']), 2) if data['durations'] else None,
                'total_issues_found': inspector_issues.get(iid, 0),
                'avg_issues_per_inspection': round(inspector_issues.get(iid, 0) / data['total_inspections'], 2) if data['total_inspections'] else 0,
            }
            for iid, data in inspector_data.items()
        ],
        key=lambda x: x['total_inspections'],
        reverse=True,
    )

    # SLA compliance
    sla_compliance: dict[str, dict] = {}
    for sev in ['urgent', 'standard', 'minor']:
        sev_issues = [i for i in issues if i.get('severity') == sev]
        within = sum(1 for i in sev_issues if i.get('resolved_at') and compute_sla_status(sev, i.get('created_at'), i.get('resolved_at')) == 'within_sla')
        # For unresolved, treat as breached if past SLA
        for i in sev_issues:
            if not i.get('resolved_at'):
                status = compute_sla_status(sev, i.get('created_at'))
                if status == 'breached':
                    pass  # not within SLA
        total_sev = len(sev_issues)
        sla_compliance[sev] = {
            'total': total_sev,
            'within_sla': within,
            'compliance_rate': round(within / total_sev * 100, 1) if total_sev else 0,
        }

    # Monthly trend (last 6 months)
    months_data: dict[str, dict] = defaultdict(lambda: {'inspections': 0, 'issues': 0})
    six_months_ago = datetime.now(tz=timezone.utc) - timedelta(days=180)
    six_cutoff = six_months_ago.isoformat()
    inspections_6m = (
        db.table('inspections')
        .select('id, started_at, status')
        .gte('started_at', six_cutoff)
        .eq('status', 'submitted')
        .execute()
    ).data or []
    issues_6m = (
        db.table('inspection_issues')
        .select('id, created_at')
        .gte('created_at', six_cutoff)
        .execute()
    ).data or []
    for insp in inspections_6m:
        ts = insp.get('started_at')
        if ts:
            month = ts[:7]  # YYYY-MM
            months_data[month]['inspections'] += 1
    for issue in issues_6m:
        ts = issue.get('created_at')
        if ts:
            month = ts[:7]
            months_data[month]['issues'] += 1
    monthly_trend = sorted(
        [{'month': m, 'inspections': d['inspections'], 'issues': d['issues']} for m, d in months_data.items()],
        key=lambda x: x['month'],
    )

    return {
        'period_days': days,
        'total_inspections': len(submitted),
        'total_issues': total_issues,
        'open_issues': open_count,
        'urgent_open': urgent_open,
        'avg_inspection_duration_minutes': avg_duration,
        'avg_resolution_hours_by_severity': avg_resolution,
        'issues_by_category': issues_by_category,
        'issues_by_severity': issues_by_severity,
        'most_problematic_rooms': most_problematic,
        'inspector_stats': inspector_stats,
        'sla_compliance': sla_compliance,
        'monthly_trend': monthly_trend,
    }


@router.post('/photos/upload-url')
def get_photo_upload_url(body: PhotoUploadUrlRequest):
    db = get_supabase()
    timestamp = int(time.time())
    ext = body.file_extension.lstrip('.').lower() or 'jpg'
    issue_part = str(body.issue_id) if body.issue_id else 'pending'
    file_path = f'{body.inspection_id}/{issue_part}/{body.photo_type}_{timestamp}.{ext}'

    bucket = 'inspection-photos'

    try:
        signed = db.storage.from_(bucket).create_signed_upload_url(file_path)
        upload_url = None
        token = None
        if isinstance(signed, dict):
            upload_url = signed.get('signed_url') or signed.get('signedUrl') or signed.get('signedURL')
            token = signed.get('token')
        # Public URL
        public_url_response = db.storage.from_(bucket).get_public_url(file_path)
        public_url = public_url_response if isinstance(public_url_response, str) else (
            public_url_response.get('publicUrl') if isinstance(public_url_response, dict) else None
        )
        return {
            'upload_url': upload_url,
            'token': token,
            'public_url': public_url,
            'path': file_path,
            'bucket': bucket,
        }
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f'Failed to create upload URL: {exc}')


# ── Issue endpoints (parameterized — /issues/{issue_id} after /issues/open) ───

@router.patch('/issues/{issue_id}/status')
def update_issue_status(issue_id: int, body: UpdateIssueStatusRequest):
    db = get_supabase()
    existing = db.table('inspection_issues').select('*').eq('id', issue_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Issue not found')

    row = existing.data[0]
    now_iso = datetime.now(tz=timezone.utc).isoformat()
    updates: dict = {'status': body.status}

    if body.status == 'in_progress':
        if not row.get('work_started_at'):
            updates['work_started_at'] = now_iso
    elif body.status == 'resolved':
        if not body.resolved_by or not body.resolved_by.strip():
            raise HTTPException(status_code=400, detail='resolved_by is required when marking resolved')
        updates['resolved_at'] = now_iso
        updates['resolved_by'] = body.resolved_by.strip()
        if body.resolution_notes is not None:
            updates['resolution_notes'] = body.resolution_notes
        if body.after_photo_url:
            updates['after_photo_url'] = body.after_photo_url
    elif body.status == 'closed':
        updates['closed_at'] = now_iso
        if body.resolution_notes is not None:
            updates['resolution_notes'] = body.resolution_notes
    elif body.status == 'open':
        # Reverting back — keep timestamps but clear close-state
        updates['closed_at'] = None

    try:
        result = db.table('inspection_issues').update(updates).eq('id', issue_id).execute()
        updated = result.data[0] if result.data else {**row, **updates}
        updated = _enrich_issue(updated)
        return {'message': f'Issue marked {body.status}', 'issue': updated}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ── Inspection by id (must come AFTER all specific routes) ────────────────────

@router.patch('/{inspection_id}')
def update_inspection(inspection_id: int, body: UpdateInspectionRequest):
    db = get_supabase()
    existing = db.table('inspections').select('*').eq('id', inspection_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Inspection not found')

    updates: dict = {}
    if body.overall_cleanliness is not None:
        updates['overall_cleanliness'] = body.overall_cleanliness
    if body.overall_condition is not None:
        updates['overall_condition'] = body.overall_condition
    if body.quick_checks is not None:
        updates['quick_checks'] = body.quick_checks
    if body.general_notes is not None:
        updates['general_notes'] = body.general_notes

    if not updates:
        return {'message': 'No changes', 'inspection': existing.data[0]}

    try:
        result = db.table('inspections').update(updates).eq('id', inspection_id).execute()
        return {'message': 'Inspection updated', 'inspection': result.data[0] if result.data else existing.data[0]}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/{inspection_id}/submit', status_code=201)
def submit_inspection(inspection_id: int, body: SubmitInspectionRequest):
    db = get_supabase()
    existing = db.table('inspections').select('*').eq('id', inspection_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Inspection not found')
    row = existing.data[0]
    if row.get('status') != 'in_progress':
        raise HTTPException(status_code=400, detail=f'Cannot submit inspection with status {row.get("status")}')

    now_iso = datetime.now(tz=timezone.utc).isoformat()
    updates = {
        'overall_cleanliness': body.overall_cleanliness,
        'overall_condition': body.overall_condition,
        'quick_checks': body.quick_checks,
        'general_notes': body.general_notes,
        'submitted_at': now_iso,
        'status': 'submitted',
    }

    try:
        result = db.table('inspections').update(updates).eq('id', inspection_id).execute()
        updated = result.data[0] if result.data else {**row, **updates}

        # Fetch issues
        issues_result = db.table('inspection_issues').select('*').eq('inspection_id', inspection_id).execute()
        issues = [_enrich_issue(i) for i in (issues_result.data or [])]

        # Fetch inspector name
        insp = db.table('inspectors').select('name').eq('id', updated['inspector_id']).execute()
        if insp.data:
            updated['inspector_name'] = insp.data[0]['name']

        updated['issues'] = issues
        return {
            'message': 'Inspection submitted',
            'inspection': updated,
            'duration_minutes': updated.get('duration_minutes'),
            'issues_count': len(issues),
        }
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/{inspection_id}/issues', status_code=201)
def add_issue(inspection_id: int, body: CreateIssueRequest):
    db = get_supabase()
    existing = db.table('inspections').select('*').eq('id', inspection_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Inspection not found')

    row = {
        'inspection_id': inspection_id,
        'room_number': body.room_number,
        'category': body.category,
        'severity': body.severity,
        'location_in_room': body.location_in_room,
        'description': body.description,
        'before_photo_url': body.before_photo_url,
        'status': 'open',
    }

    try:
        result = db.table('inspection_issues').insert(row).execute()
        issue = _enrich_issue(result.data[0])
        return {'message': 'Issue logged', 'issue': issue}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get('/{inspection_id}')
def get_inspection(inspection_id: int):
    db = get_supabase()
    result = (
        db.table('inspections')
        .select('*, inspectors(name)')
        .eq('id', inspection_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail='Inspection not found')

    inspection = _flatten_inspection(result.data[0])

    issues_result = (
        db.table('inspection_issues')
        .select('*')
        .eq('inspection_id', inspection_id)
        .order('created_at')
        .execute()
    )
    inspection['issues'] = [_enrich_issue(i) for i in (issues_result.data or [])]

    return {'inspection': inspection}


# ── Constants endpoint (helpful for FE) ───────────────────────────────────────

@router.get('/meta/constants')
def get_constants():
    return {
        'inspection_types': VALID_INSPECTION_TYPES,
        'inspection_type_labels': INSPECTION_TYPE_LABELS,
        'conditions': VALID_CONDITIONS,
        'categories': VALID_CATEGORIES,
        'category_labels': CATEGORY_LABELS,
        'category_emojis': CATEGORY_EMOJIS,
        'severities': VALID_SEVERITIES,
        'severity_labels': SEVERITY_LABELS,
        'issue_statuses': VALID_ISSUE_STATUSES,
        'sla_hours': SLA_HOURS,
        'quick_check_items': QUICK_CHECK_ITEMS,
    }
