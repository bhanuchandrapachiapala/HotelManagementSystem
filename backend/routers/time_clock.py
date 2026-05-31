from datetime import datetime, timezone, timedelta, date, time

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.time_clock import (
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    ClockActionRequest,
    EditEntryRequest,
    DEPARTMENT_LABELS,
)

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts) -> datetime:
    """Parse an ISO timestamp (possibly with trailing Z) into a tz-aware datetime."""
    if isinstance(ts, datetime):
        dt = ts
    else:
        dt = datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _start_of_day(d: date) -> str:
    return datetime.combine(d, time.min, tzinfo=timezone.utc).isoformat()


def _entry_status(row: dict, today: date) -> str:
    if row.get('clock_out_at'):
        return 'completed'
    if _parse(row['clock_in_at']).date() >= today:
        return 'active'
    return 'incomplete'


def _entry_hours(row: dict, now: datetime) -> float:
    """Hours worked for an entry. Completed → exact; active today → elapsed; incomplete past → 0."""
    ci = _parse(row['clock_in_at'])
    co = row.get('clock_out_at')
    if co:
        return round(max(0.0, (_parse(co) - ci).total_seconds() / 3600), 2)
    if ci.date() == now.date():
        return round(max(0.0, (now - ci).total_seconds() / 3600), 2)
    return 0.0


def _total_hours(row: dict) -> float | None:
    tm = row.get('total_minutes')
    return round(float(tm) / 60, 2) if tm is not None else None


def _date_label(d: date, today: date) -> str:
    if d == today:
        return 'Today'
    if d == today - timedelta(days=1):
        return 'Yesterday'
    return d.strftime('%a, %b %-d')


def _shape_entry(row: dict, today: date) -> dict:
    emp = row.pop('time_clock_employees', None) or {}
    return {
        'id': row['id'],
        'employee_id': row['employee_id'],
        'employee_name': emp.get('name'),
        'department': emp.get('department'),
        'clock_in_at': row['clock_in_at'],
        'clock_out_at': row.get('clock_out_at'),
        'total_minutes': float(row['total_minutes']) if row.get('total_minutes') is not None else None,
        'total_hours': _total_hours(row),
        'status': _entry_status(row, today),
        'notes': row.get('notes'),
        'edited_by': row.get('edited_by'),
        'created_at': row.get('created_at'),
    }


# ── GET /employees ─────────────────────────────────────────────────────────────

@router.get('/employees')
def list_employees(include_inactive: bool = Query(default=False)):
    db = get_supabase()
    now = _now()
    today = now.date()

    emp_query = db.table('time_clock_employees').select('*')
    if not include_inactive:
        emp_query = emp_query.eq('is_active', True)
    employees = emp_query.order('name').execute().data or []

    today_entries = (
        db.table('time_clock_entries')
        .select('*')
        .gte('clock_in_at', _start_of_day(today))
        .execute()
        .data or []
    )

    by_emp: dict[int, list] = {}
    for e in today_entries:
        by_emp.setdefault(e['employee_id'], []).append(e)

    result = []
    for emp in employees:
        entries = by_emp.get(emp['id'], [])
        open_entry = next((e for e in entries if e.get('clock_out_at') is None), None)
        hours_today = round(sum(_entry_hours(e, now) for e in entries), 2)
        result.append({
            'id': emp['id'],
            'name': emp['name'],
            'department': emp['department'],
            'is_active': emp['is_active'],
            'is_clocked_in': open_entry is not None,
            'current_entry_id': open_entry['id'] if open_entry else None,
            'clocked_in_at': open_entry['clock_in_at'] if open_entry else None,
            'hours_today': hours_today,
        })

    return {'employees': result}


# ── POST /clock — toggle in/out ───────────────────────────────────────────────

@router.post('/clock')
def clock_action(body: ClockActionRequest):
    db = get_supabase()
    now = _now()
    today = now.date()

    emp = db.table('time_clock_employees').select('*').eq('id', body.employee_id).execute().data
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')

    open_entries = (
        db.table('time_clock_entries')
        .select('*')
        .eq('employee_id', body.employee_id)
        .is_('clock_out_at', 'null')
        .gte('clock_in_at', _start_of_day(today))
        .order('clock_in_at', desc=True)
        .execute()
        .data or []
    )

    if open_entries:
        entry_id = open_entries[0]['id']
        updated = (
            db.table('time_clock_entries')
            .update({'clock_out_at': now.isoformat()})
            .eq('id', entry_id)
            .execute()
            .data[0]
        )
        ci = _parse(updated['clock_in_at'])
        total_hours = round(max(0.0, (_parse(updated['clock_out_at']) - ci).total_seconds() / 3600), 2)
        return {
            'action': 'clocked_out',
            'entry': _shape_entry(dict(updated), today),
            'total_hours': total_hours,
        }

    inserted = (
        db.table('time_clock_entries')
        .insert({'employee_id': body.employee_id, 'clock_in_at': now.isoformat()})
        .execute()
        .data[0]
    )
    return {'action': 'clocked_in', 'entry': _shape_entry(dict(inserted), today)}


# ── GET /today — full roster ──────────────────────────────────────────────────

@router.get('/today')
def get_today_roster():
    db = get_supabase()
    now = _now()
    today = now.date()

    rows = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name, department)')
        .gte('clock_in_at', _start_of_day(today))
        .order('clock_in_at', desc=True)
        .execute()
        .data or []
    )

    entries = [_shape_entry(dict(r), today) for r in rows]
    currently_in = sum(1 for e in entries if e['status'] == 'active')

    return {
        'date': today.isoformat(),
        'currently_in': currently_in,
        'total_today': len(entries),
        'entries': entries,
    }


# ── GET /entries — full history ───────────────────────────────────────────────

@router.get('/entries')
def list_entries(
    employee_id: int = Query(default=None),
    date_from: str = Query(default=None),
    date_to: str = Query(default=None),
    department: str = Query(default=None),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
):
    db = get_supabase()
    today = _now().date()

    query = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name, department)')
        .order('clock_in_at', desc=True)
    )
    if employee_id is not None:
        query = query.eq('employee_id', employee_id)
    if date_from:
        query = query.gte('clock_in_at', f'{date_from}T00:00:00+00:00')
    if date_to:
        query = query.lte('clock_in_at', f'{date_to}T23:59:59+00:00')

    rows = query.execute().data or []
    entries = [_shape_entry(dict(r), today) for r in rows]

    if department:
        entries = [e for e in entries if e['department'] == department]

    total = len(entries)
    paged = entries[offset:offset + limit]

    return {'entries': paged, 'total': total, 'limit': limit, 'offset': offset}


# ── PATCH /entries/{entry_id} — manager edit ──────────────────────────────────

@router.patch('/entries/{entry_id}')
def edit_entry(entry_id: int, body: EditEntryRequest):
    db = get_supabase()
    today = _now().date()

    existing = db.table('time_clock_entries').select('*').eq('id', entry_id).execute().data
    if not existing:
        raise HTTPException(status_code=404, detail='Entry not found')
    current = existing[0]

    new_in = _parse(body.clock_in_at) if body.clock_in_at else _parse(current['clock_in_at'])
    new_out = None
    if body.clock_out_at:
        new_out = _parse(body.clock_out_at)
    elif current.get('clock_out_at'):
        new_out = _parse(current['clock_out_at'])

    if new_out is not None and new_out <= new_in:
        raise HTTPException(status_code=400, detail='clock_out_at must be after clock_in_at')

    updates: dict = {'edited_by': body.edited_by}
    if body.clock_in_at:
        updates['clock_in_at'] = new_in.isoformat()
    if body.clock_out_at:
        updates['clock_out_at'] = new_out.isoformat()
    if body.notes is not None:
        updates['notes'] = body.notes

    db.table('time_clock_entries').update(updates).eq('id', entry_id).execute()
    row = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name, department)')
        .eq('id', entry_id)
        .execute()
        .data[0]
    )
    return {'message': 'Entry updated', 'entry': _shape_entry(dict(row), today)}


# ── GET /analytics ─────────────────────────────────────────────────────────────

@router.get('/analytics')
def get_analytics(days: int = Query(default=7, le=90)):
    db = get_supabase()
    now = _now()
    today = now.date()
    start = today - timedelta(days=days - 1)

    rows = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name, department)')
        .gte('clock_in_at', _start_of_day(start))
        .order('clock_in_at')
        .execute()
        .data or []
    )

    entries = [_shape_entry(dict(r), today) for r in rows]
    entries = [e for e in entries if e['employee_name'] is not None]

    # ── by employee ──
    emp_map: dict[int, dict] = {}
    for e in entries:
        eid = e['employee_id']
        hours = _entry_hours(_entry_raw(e), now)
        d = _parse(e['clock_in_at']).date().isoformat()
        if eid not in emp_map:
            emp_map[eid] = {
                'employee_id': eid,
                'employee_name': e['employee_name'],
                'department': e['department'],
                'days': {},
            }
        emp_map[eid]['days'].setdefault(d, {'hours': 0.0, 'status': e['status']})
        emp_map[eid]['days'][d]['hours'] += hours
        emp_map[eid]['days'][d]['status'] = e['status']

    by_employee = []
    for eid, data in emp_map.items():
        day_entries = [
            {'date': d, 'hours': round(v['hours'], 2), 'status': v['status']}
            for d, v in sorted(data['days'].items())
        ]
        total_hours = round(sum(de['hours'] for de in day_entries), 2)
        days_worked = len([de for de in day_entries if de['hours'] > 0])
        overtime_days = len([de for de in day_entries if de['hours'] > 8])
        avg = round(total_hours / days_worked, 2) if days_worked else 0.0
        by_employee.append({
            'employee_id': eid,
            'employee_name': data['employee_name'],
            'department': data['department'],
            'days_worked': days_worked,
            'total_hours': total_hours,
            'avg_hours_per_day': avg,
            'overtime_days': overtime_days,
            'entries': day_entries,
        })
    by_employee.sort(key=lambda x: x['total_hours'], reverse=True)

    # ── by department ──
    dept_map: dict[str, dict] = {}
    for emp in by_employee:
        dep = emp['department'] or 'other'
        if dep not in dept_map:
            dept_map[dep] = {'total_hours': 0.0, 'employees': set()}
        dept_map[dep]['total_hours'] += emp['total_hours']
        dept_map[dep]['employees'].add(emp['employee_id'])
    by_department = [
        {
            'department': dep,
            'department_label': DEPARTMENT_LABELS.get(dep, dep.title()),
            'total_hours': round(v['total_hours'], 2),
            'employee_count': len(v['employees']),
        }
        for dep, v in dept_map.items()
    ]
    by_department.sort(key=lambda x: x['total_hours'], reverse=True)

    # ── daily totals ──
    daily_map: dict[str, dict] = {}
    for emp in by_employee:
        for de in emp['entries']:
            d = de['date']
            if d not in daily_map:
                daily_map[d] = {'total_hours': 0.0, 'employees': set()}
            daily_map[d]['total_hours'] += de['hours']
            if de['hours'] > 0:
                daily_map[d]['employees'].add(emp['employee_id'])
    daily_totals = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        ds = d.isoformat()
        v = daily_map.get(ds, {'total_hours': 0.0, 'employees': set()})
        daily_totals.append({
            'date': ds,
            'label': _date_label(d, today),
            'total_hours': round(v['total_hours'], 2),
            'employee_count': len(v['employees']),
        })

    # ── overtime alerts (over 40h in the period) ──
    overtime_alerts = []
    for emp in by_employee:
        if emp['total_hours'] > 40:
            overtime_alerts.append({
                'employee_name': emp['employee_name'],
                'period': 'this_week',
                'total_hours': emp['total_hours'],
                'overtime_hours': round(emp['total_hours'] - 40, 2),
            })

    return {
        'period_days': days,
        'by_employee': by_employee,
        'by_department': by_department,
        'daily_totals': daily_totals,
        'overtime_alerts': overtime_alerts,
    }


def _entry_raw(shaped: dict) -> dict:
    """Reconstruct the minimal raw shape _entry_hours expects from a shaped entry."""
    return {
        'clock_in_at': shaped['clock_in_at'],
        'clock_out_at': shaped['clock_out_at'],
    }


# ── POST /employees — add ──────────────────────────────────────────────────────

@router.post('/employees', status_code=201)
def create_employee(body: CreateEmployeeRequest):
    db = get_supabase()

    existing = db.table('time_clock_employees').select('id').eq('name', body.name).execute().data
    if existing:
        raise HTTPException(status_code=409, detail='An employee with that name already exists')

    row = (
        db.table('time_clock_employees')
        .insert({'name': body.name, 'department': body.department})
        .execute()
        .data[0]
    )
    return {'message': 'Employee added', 'employee': row}


# ── PATCH /employees/{employee_id} — update ───────────────────────────────────

@router.patch('/employees/{employee_id}')
def update_employee(employee_id: int, body: UpdateEmployeeRequest):
    db = get_supabase()

    existing = db.table('time_clock_employees').select('*').eq('id', employee_id).execute().data
    if not existing:
        raise HTTPException(status_code=404, detail='Employee not found')

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail='No fields to update')

    if 'name' in updates:
        dupe = (
            db.table('time_clock_employees')
            .select('id')
            .eq('name', updates['name'])
            .neq('id', employee_id)
            .execute()
            .data
        )
        if dupe:
            raise HTTPException(status_code=409, detail='An employee with that name already exists')

    row = db.table('time_clock_employees').update(updates).eq('id', employee_id).execute().data[0]
    return {'message': 'Employee updated', 'employee': row}
