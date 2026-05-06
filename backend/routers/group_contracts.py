import traceback
from datetime import date as date_cls, timedelta

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.group_contract import (
    AddActivityNoteRequest,
    CreateGroupContractRequest,
    UpdateGroupContractRequest,
)

router = APIRouter()

ACTIVE_STATUSES = ['inquiry', 'confirmed', 'checked_in']


def _enrich(row: dict) -> dict:
    today = date_cls.today()

    check_in = date_cls.fromisoformat(row['check_in_date'])
    row['days_until_checkin'] = (check_in - today).days

    cutoff_date = row.get('cutoff_date')
    if cutoff_date and row.get('status') in ['inquiry', 'confirmed']:
        days_until_cutoff = (date_cls.fromisoformat(cutoff_date) - today).days
        row['cutoff_alert'] = 0 <= days_until_cutoff <= 3
    else:
        row['cutoff_alert'] = False

    return row


# GET /stats must be defined BEFORE GET /{contract_id} to prevent FastAPI
# from matching the literal string "stats" as an integer id.
@router.get('/stats')
def get_stats():
    supabase = get_supabase()
    result = supabase.table('group_contracts').select(
        'status, check_in_date, cutoff_date, created_at'
    ).execute()
    rows = result.data or []

    today = date_cls.today()
    next_week = today + timedelta(days=7)

    total_active = 0
    total_completed = 0
    total_cancelled = 0
    upcoming_this_week = 0
    cutoff_alerts = 0
    by_status: dict = {}
    month_counts: dict = {}

    for row in rows:
        status = row.get('status', '')

        # Tally by_status
        by_status[status] = by_status.get(status, 0) + 1

        # Active / completed / cancelled totals
        if status in ACTIVE_STATUSES:
            total_active += 1
        elif status == 'completed':
            total_completed += 1
        elif status == 'cancelled':
            total_cancelled += 1

        # Upcoming check-ins this week (active contracts only)
        check_in_date_str = row.get('check_in_date', '')
        if check_in_date_str and status in ACTIVE_STATUSES:
            try:
                check_in = date_cls.fromisoformat(check_in_date_str)
                if today <= check_in <= next_week:
                    upcoming_this_week += 1
            except ValueError:
                pass

        # Cutoff alerts
        cutoff_date_str = row.get('cutoff_date', '')
        if cutoff_date_str and status in ['inquiry', 'confirmed']:
            try:
                cutoff = date_cls.fromisoformat(cutoff_date_str)
                days_until = (cutoff - today).days
                if 0 <= days_until <= 3:
                    cutoff_alerts += 1
            except ValueError:
                pass

        # By month (last 6 months from created_at)
        created_at_str = row.get('created_at', '')
        if created_at_str and len(created_at_str) >= 7:
            month = created_at_str[:7]  # "YYYY-MM"
            month_counts[month] = month_counts.get(month, 0) + 1

    # Build last-6-months list
    all_months = sorted(month_counts.keys())
    cutoff_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    six_months_ago = (cutoff_month - timedelta(days=5 * 30)).strftime('%Y-%m')
    recent_months = [m for m in all_months if m >= six_months_ago]
    by_month = [{'month': m, 'count': month_counts[m]} for m in sorted(recent_months)]

    return {
        'total_active': total_active,
        'total_completed': total_completed,
        'total_cancelled': total_cancelled,
        'upcoming_this_week': upcoming_this_week,
        'cutoff_alerts': cutoff_alerts,
        'by_status': by_status,
        'by_month': by_month,
    }


@router.get('/')
def list_contracts(
    status: str = Query(default=None),
    upcoming_only: bool = Query(default=False),
):
    supabase = get_supabase()
    query = supabase.table('group_contracts').select('*').order('check_in_date', desc=False)

    if status:
        query = query.eq('status', status)

    if upcoming_only:
        query = query.gte('check_in_date', date_cls.today().isoformat())

    result = query.execute()
    contracts = [_enrich(row) for row in (result.data or [])]
    return {'contracts': contracts}


@router.get('/{contract_id}')
def get_contract(contract_id: int):
    supabase = get_supabase()

    result = supabase.table('group_contracts').select('*').eq('id', contract_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail='Group contract not found')

    contract = _enrich(result.data[0])

    log_result = (
        supabase.table('group_activity_log')
        .select('*')
        .eq('contract_id', contract_id)
        .order('created_at', desc=False)
        .execute()
    )
    contract['activity_log'] = log_result.data or []

    return {"contract": contract}


@router.post('/', status_code=201)
def create_contract(body: CreateGroupContractRequest):
    try:
        supabase = get_supabase()
        payload = body.model_dump(exclude_none=True)
        payload['status'] = 'inquiry'

        result = supabase.table('group_contracts').insert(payload).execute()
        return {
            'message': 'Group contract created',
            'contract': _enrich(result.data[0]),
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail='Failed to create group contract')


@router.patch('/{contract_id}')
def update_contract(contract_id: int, body: UpdateGroupContractRequest):
    supabase = get_supabase()

    existing = supabase.table('group_contracts').select('id').eq('id', contract_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Group contract not found')

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail='No fields to update')

    result = (
        supabase.table('group_contracts')
        .update(updates)
        .eq('id', contract_id)
        .execute()
    )
    return {
        'message': 'Contract updated',
        'contract': _enrich(result.data[0]),
    }


@router.post('/{contract_id}/notes', status_code=201)
def add_note(contract_id: int, body: AddActivityNoteRequest):
    supabase = get_supabase()

    existing = supabase.table('group_contracts').select('id').eq('id', contract_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Group contract not found')

    result = (
        supabase.table('group_activity_log')
        .insert({'contract_id': contract_id, 'note': body.note.strip()})
        .execute()
    )
    return {'message': 'Note added', 'log': result.data[0]}
