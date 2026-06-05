import datetime as dt
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.time_clock import (
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    UpdateScheduleRequest,
    CreateOverrideRequest,
    ClockActionRequest,
    EditEntryRequest,
    get_pay_week_start,
    get_pay_week_end,
    get_clock_in_status,
    get_clock_out_status,
)

router = APIRouter()

EASTERN = ZoneInfo("America/New_York")

DEFAULT_SCHEDULE = {'shift_start': '09:00:00', 'shift_end': '16:00:00', 'buffer_minutes': 30}


# ── helpers ──────────────────────────────────────────────────────────────────

def _now_eastern() -> dt.datetime:
    return dt.datetime.now(EASTERN)


def _parse_dt(s) -> dt.datetime:
    if isinstance(s, dt.datetime):
        d = s
    else:
        d = dt.datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d


def _to_eastern_date(ts) -> dt.date:
    return _parse_dt(ts).astimezone(EASTERN).date()


def _parse_time(s) -> dt.time:
    parts = str(s).split(':')
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 0
    return dt.time(hour=h, minute=m)


def _fmt_time(t) -> str:
    """Normalize a TIME value ('09:00:00' or dt.time) to 'HH:MM'."""
    tt = _parse_time(t) if not isinstance(t, dt.time) else t
    return f"{tt.hour:02d}:{tt.minute:02d}"


def get_effective_schedule(db, employee_id: int, check_date: dt.date) -> dict:
    """Resolve the schedule in effect for an employee on a given date.

    Individual override > all-employees override > base schedule > default.
    """
    iso = check_date.isoformat()
    overrides = (
        db.table('schedule_overrides').select('*').eq('override_date', iso).execute().data or []
    )
    indiv = next((o for o in overrides if o.get('employee_id') == employee_id), None)
    all_ov = next((o for o in overrides if o.get('override_for_all')), None)
    chosen = indiv or all_ov
    if chosen:
        return {
            'shift_start': chosen['shift_start'],
            'shift_end': chosen['shift_end'],
            'buffer_minutes': chosen['buffer_minutes'],
            'override': chosen,
        }
    sched = (
        db.table('employee_schedules').select('*').eq('employee_id', employee_id).execute().data
    )
    if sched:
        s = sched[0]
        return {
            'shift_start': s['shift_start'],
            'shift_end': s['shift_end'],
            'buffer_minutes': s['buffer_minutes'],
            'override': None,
        }
    return {**DEFAULT_SCHEDULE, 'override': None}


def _entry_hours(row: dict, now: dt.datetime) -> float:
    """Hours for an entry — completed → exact; open today → live; open past → 0."""
    tm = row.get('total_minutes')
    if tm is not None:
        return round(float(tm) / 60, 2)
    ci = _parse_dt(row['clock_in_at']).astimezone(EASTERN)
    if ci.date() == now.date():
        return round(max(0.0, (now - ci).total_seconds() / 3600), 2)
    return 0.0


def _shape_entry(row: dict) -> dict:
    emp = row.pop('time_clock_employees', None) or {}
    co = row.get('clock_out_at')
    tm = row.get('total_minutes')
    night = False
    if co:
        night = _to_eastern_date(co).isoformat() != str(row['shift_date'])
    return {
        'id': row['id'],
        'employee_id': row['employee_id'],
        'employee_name': emp.get('name'),
        'shift_date': str(row['shift_date']),
        'clock_in_at': row['clock_in_at'],
        'clock_out_at': co,
        'total_minutes': float(tm) if tm is not None else None,
        'total_hours': round(float(tm) / 60, 2) if tm is not None else None,
        'clock_in_status': row['clock_in_status'],
        'clock_out_status': row['clock_out_status'],
        'notes': row.get('notes'),
        'edited_by': row.get('edited_by'),
        'created_at': row.get('created_at'),
        'is_night_shift': night,
    }


def _date_label(d: dt.date, today: dt.date) -> str:
    if d == today:
        return 'Today'
    if d == today - dt.timedelta(days=1):
        return 'Yesterday'
    return d.strftime('%a, %b %-d')


def _shape_override(o: dict) -> dict:
    return {
        'id': o['id'],
        'employee_id': o.get('employee_id'),
        'override_date': str(o['override_date']),
        'shift_start': _fmt_time(o['shift_start']),
        'shift_end': _fmt_time(o['shift_end']),
        'buffer_minutes': o['buffer_minutes'],
        'override_for_all': o['override_for_all'],
        'note': o.get('note'),
        'created_at': o.get('created_at'),
    }


# ── GET /employees ─────────────────────────────────────────────────────────────

@router.get('/employees')
def list_employees(include_inactive: bool = Query(default=False)):
    try:
        db = get_supabase()
        now = _now_eastern()
        today_iso = now.date().isoformat()

        # 1) employees
        emp_query = db.table('time_clock_employees').select('*').order('name')
        if not include_inactive:
            emp_query = emp_query.eq('is_active', True)
        emps = emp_query.execute().data or []

        # 2) schedules — fetched separately (nested embeds are unreliable here)
        sched_rows = db.table('employee_schedules').select('*').execute().data or []
        sched_by_emp = {s['employee_id']: s for s in sched_rows}

        # 3) open entries (any date — catches night-shift workers)
        open_rows = (
            db.table('time_clock_entries').select('*').is_('clock_out_at', 'null').execute().data or []
        )
        open_by_emp = {r['employee_id']: r for r in open_rows}

        # today's entries (for hours_today)
        today_rows = (
            db.table('time_clock_entries').select('*').eq('shift_date', today_iso).execute().data or []
        )
        today_by_emp: dict[int, list] = {}
        for r in today_rows:
            today_by_emp.setdefault(r['employee_id'], []).append(r)

        # 4) merge in Python
        result = []
        for e in emps:
            sched = sched_by_emp.get(e['id'], DEFAULT_SCHEDULE)
            open_r = open_by_emp.get(e['id'])

            mins = sum(
                float(r['total_minutes'])
                for r in today_by_emp.get(e['id'], [])
                if r.get('total_minutes') is not None
            )
            live = 0.0
            if open_r and str(open_r['shift_date']) == today_iso:
                ci = _parse_dt(open_r['clock_in_at']).astimezone(EASTERN)
                live = max(0.0, (now - ci).total_seconds() / 60)
            hours_today = round((mins + live) / 60, 2)

            result.append({
                'id': e['id'],
                'name': e['name'],
                'is_active': e['is_active'],
                'created_at': e['created_at'],
                'shift_start': _fmt_time(sched['shift_start']),
                'shift_end': _fmt_time(sched['shift_end']),
                'buffer_minutes': sched['buffer_minutes'],
                'is_clocked_in': open_r is not None,
                'current_entry_id': open_r['id'] if open_r else None,
                'clocked_in_at': open_r['clock_in_at'] if open_r else None,
                'hours_today': hours_today,
                'clock_in_status': open_r['clock_in_status'] if open_r else None,
            })

        return {'employees': result}
    except Exception as e:
        print(f"[timeclock employees error] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load employees: {e}")


# ── POST /clock — toggle in/out ───────────────────────────────────────────────

@router.post('/clock')
def clock_action(body: ClockActionRequest):
    db = get_supabase()
    now = _now_eastern()
    now_utc = now.astimezone(dt.timezone.utc).isoformat()

    emp = db.table('time_clock_employees').select('*').eq('id', body.employee_id).execute().data
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    if not emp[0]['is_active']:
        raise HTTPException(status_code=400, detail='Employee is inactive')

    open_entries = (
        db.table('time_clock_entries')
        .select('*')
        .eq('employee_id', body.employee_id)
        .is_('clock_out_at', 'null')
        .order('clock_in_at', desc=True)
        .execute()
        .data or []
    )

    if not open_entries:
        # ── clocking IN ──
        today = now.date()
        sched = get_effective_schedule(db, body.employee_id, today)
        status = get_clock_in_status(now.time(), _parse_time(sched['shift_start']), sched['buffer_minutes'])
        inserted = (
            db.table('time_clock_entries')
            .insert({
                'employee_id': body.employee_id,
                'shift_date': today.isoformat(),
                'clock_in_at': now_utc,
                'clock_in_status': status,
                'clock_out_status': 'pending',
            })
            .execute()
            .data[0]
        )
        return {
            'action': 'clocked_in',
            'entry': _shape_entry(dict(inserted)),
            'schedule': {'shift_start': _fmt_time(sched['shift_start']), 'shift_end': _fmt_time(sched['shift_end'])},
            'clock_in_status': status,
        }

    # ── clocking OUT ──
    entry = open_entries[0]
    shift_date = _parse_dt(entry['clock_in_at']).astimezone(EASTERN).date()
    sched = get_effective_schedule(db, body.employee_id, shift_date)
    status = get_clock_out_status(now.time(), _parse_time(sched['shift_end']), sched['buffer_minutes'])

    db.table('time_clock_entries').update({
        'clock_out_at': now_utc,
        'clock_out_status': status,
    }).eq('id', entry['id']).execute()

    updated = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .eq('id', entry['id'])
        .execute()
        .data[0]
    )
    shaped = _shape_entry(dict(updated))
    total_hours = round(
        max(0.0, (_parse_dt(shaped['clock_out_at']) - _parse_dt(shaped['clock_in_at'])).total_seconds() / 3600), 2
    )
    return {
        'action': 'clocked_out',
        'entry': shaped,
        'total_hours': total_hours,
        'is_night_shift': shaped['is_night_shift'],
    }


# ── GET /today — roster ────────────────────────────────────────────────────────

@router.get('/today')
def get_today_roster():
    db = get_supabase()
    now = _now_eastern()
    today_iso = now.date().isoformat()

    emps = (
        db.table('time_clock_employees').select('*').eq('is_active', True).order('name').execute().data or []
    )

    today_rows = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .eq('shift_date', today_iso)
        .execute()
        .data or []
    )
    open_rows = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .is_('clock_out_at', 'null')
        .execute()
        .data or []
    )

    # merge today + open (open night-shift entries may have an earlier shift_date)
    merged: dict[int, dict] = {r['id']: r for r in today_rows}
    for r in open_rows:
        merged.setdefault(r['id'], r)
    all_entries = [_shape_entry(dict(r)) for r in merged.values()]

    by_emp: dict[int, list] = {}
    for e in all_entries:
        by_emp.setdefault(e['employee_id'], []).append(e)

    currently_in = sum(1 for e in all_entries if e['clock_out_at'] is None)
    total_entries_today = sum(1 for e in all_entries if e['shift_date'] == today_iso)

    employees = []
    for emp in emps:
        entries = sorted(by_emp.get(emp['id'], []), key=lambda x: x['clock_in_at'], reverse=True)
        hours_today = round(sum(_entry_hours(_entry_raw(e), now) for e in entries), 2)
        open_e = next((e for e in entries if e['clock_out_at'] is None), None)
        employees.append({
            'id': emp['id'],
            'name': emp['name'],
            'is_clocked_in': open_e is not None,
            'current_entry_id': open_e['id'] if open_e else None,
            'clocked_in_at': open_e['clock_in_at'] if open_e else None,
            'hours_today': hours_today,
            'entries': entries,
        })

    return {
        'date': today_iso,
        'currently_in': currently_in,
        'total_entries_today': total_entries_today,
        'employees': employees,
    }


def _entry_raw(shaped: dict) -> dict:
    return {
        'clock_in_at': shaped['clock_in_at'],
        'clock_out_at': shaped['clock_out_at'],
        'total_minutes': shaped['total_minutes'],
    }


# ── GET /entries — history ─────────────────────────────────────────────────────

@router.get('/entries')
def list_entries(
    employee_id: int = Query(default=None),
    date_from: str = Query(default=None),
    date_to: str = Query(default=None),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
):
    db = get_supabase()

    query = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .order('clock_in_at', desc=True)
    )
    if employee_id is not None:
        query = query.eq('employee_id', employee_id)
    if date_from:
        query = query.gte('shift_date', date_from)
    if date_to:
        query = query.lte('shift_date', date_to)

    rows = query.execute().data or []
    entries = [_shape_entry(dict(r)) for r in rows]
    total = len(entries)
    paged = entries[offset:offset + limit]

    return {'entries': paged, 'total': total, 'limit': limit, 'offset': offset}


# ── PATCH /entries/{entry_id} — manager edit ──────────────────────────────────

@router.patch('/entries/{entry_id}')
def edit_entry(entry_id: int, body: EditEntryRequest):
    db = get_supabase()

    existing = db.table('time_clock_entries').select('*').eq('id', entry_id).execute().data
    if not existing:
        raise HTTPException(status_code=404, detail='Entry not found')
    current = existing[0]

    new_in = _parse_dt(body.clock_in_at) if body.clock_in_at else _parse_dt(current['clock_in_at'])
    new_out = None
    if body.clock_out_at:
        new_out = _parse_dt(body.clock_out_at)
    elif current.get('clock_out_at'):
        new_out = _parse_dt(current['clock_out_at'])

    if new_out is not None and new_out <= new_in:
        raise HTTPException(status_code=400, detail='clock_out_at must be after clock_in_at')

    updates: dict = {'edited_by': body.edited_by, 'clock_in_status': 'manual'}
    if body.clock_in_at:
        updates['clock_in_at'] = new_in.astimezone(dt.timezone.utc).isoformat()
        updates['shift_date'] = new_in.astimezone(EASTERN).date().isoformat()
    if body.clock_out_at:
        updates['clock_out_at'] = new_out.astimezone(dt.timezone.utc).isoformat()
    if body.notes is not None:
        updates['notes'] = body.notes
    # only mark the out-status manual when the shift is actually closed
    if new_out is not None:
        updates['clock_out_status'] = 'manual'

    db.table('time_clock_entries').update(updates).eq('id', entry_id).execute()
    row = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .eq('id', entry_id)
        .execute()
        .data[0]
    )
    return {'message': 'Entry updated', 'entry': _shape_entry(dict(row))}


# ── GET /analytics ─────────────────────────────────────────────────────────────

@router.get('/analytics')
def get_analytics(date_from: str = Query(default=None), date_to: str = Query(default=None)):
    db = get_supabase()
    now = _now_eastern()
    today = now.date()

    if date_from:
        start = dt.date.fromisoformat(date_from)
    else:
        start = get_pay_week_start(today)
    end = dt.date.fromisoformat(date_to) if date_to else today

    rows = (
        db.table('time_clock_entries')
        .select('*, time_clock_employees(name)')
        .gte('shift_date', start.isoformat())
        .lte('shift_date', end.isoformat())
        .order('clock_in_at')
        .execute()
        .data or []
    )
    entries = [_shape_entry(dict(r)) for r in rows]
    entries = [e for e in entries if e['employee_name'] is not None]

    # ── by employee ──
    emp_map: dict[int, dict] = {}
    for e in entries:
        eid = e['employee_id']
        hours = _entry_hours(_entry_raw(e), now)
        if eid not in emp_map:
            emp_map[eid] = {
                'employee_id': eid,
                'employee_name': e['employee_name'],
                'by_date': {},
                'rows': [],
            }
        emp_map[eid]['by_date'].setdefault(e['shift_date'], 0.0)
        emp_map[eid]['by_date'][e['shift_date']] += hours
        emp_map[eid]['rows'].append({
            'date': e['shift_date'],
            'hours': hours,
            'clock_in_status': e['clock_in_status'],
            'clock_out_status': e['clock_out_status'],
        })

    by_employee = []
    for eid, data in emp_map.items():
        total_hours = round(sum(data['by_date'].values()), 2)
        days_worked = len([d for d, h in data['by_date'].items() if h > 0])
        avg = round(total_hours / days_worked, 2) if days_worked else 0.0
        overtime_days = len([d for d, h in data['by_date'].items() if h > 8])
        by_employee.append({
            'employee_id': eid,
            'employee_name': data['employee_name'],
            'days_worked': days_worked,
            'total_hours': total_hours,
            'avg_hours_per_day': avg,
            'overtime_days': overtime_days,
            'pay_week_hours': total_hours,
            'entries_by_date': sorted(data['rows'], key=lambda x: x['date']),
        })
    by_employee.sort(key=lambda x: x['total_hours'], reverse=True)

    # ── daily totals ──
    daily_map: dict[str, dict] = {}
    for emp in by_employee:
        seen_days: dict[str, float] = {}
        for r in emp['entries_by_date']:
            seen_days[r['date']] = seen_days.get(r['date'], 0.0) + r['hours']
        for d, h in seen_days.items():
            if d not in daily_map:
                daily_map[d] = {'total_hours': 0.0, 'employees': set()}
            daily_map[d]['total_hours'] += h
            if h > 0:
                daily_map[d]['employees'].add(emp['employee_id'])

    daily_totals = []
    cursor = start
    while cursor <= end:
        ds = cursor.isoformat()
        v = daily_map.get(ds, {'total_hours': 0.0, 'employees': set()})
        daily_totals.append({
            'date': ds,
            'label': _date_label(cursor, today),
            'total_hours': round(v['total_hours'], 2),
            'employee_count': len(v['employees']),
        })
        cursor += dt.timedelta(days=1)

    # ── overtime alerts ──
    overtime_alerts = []
    for emp in by_employee:
        if emp['pay_week_hours'] > 40:
            overtime_alerts.append({
                'employee_name': emp['employee_name'],
                'type': 'weekly',
                'hours': emp['pay_week_hours'],
                'overtime_hours': round(emp['pay_week_hours'] - 40, 2),
            })
        max_day = max((r['hours'] for r in emp['entries_by_date']), default=0.0)
        if max_day > 8:
            overtime_alerts.append({
                'employee_name': emp['employee_name'],
                'type': 'daily',
                'hours': round(max_day, 2),
                'overtime_hours': round(max_day - 8, 2),
            })

    return {
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'by_employee': by_employee,
        'daily_totals': daily_totals,
        'overtime_alerts': overtime_alerts,
        'pay_week_start': get_pay_week_start(today).isoformat(),
        'pay_week_end': get_pay_week_end(today).isoformat(),
    }


# ── GET /schedules ─────────────────────────────────────────────────────────────

@router.get('/schedules')
def get_schedules():
    db = get_supabase()
    today = _now_eastern().date()
    today_iso = today.isoformat()

    emps = (
        db.table('time_clock_employees')
        .select('*, employee_schedules(shift_start, shift_end, buffer_minutes)')
        .eq('is_active', True)
        .order('name')
        .execute()
        .data or []
    )

    overrides = (
        db.table('schedule_overrides')
        .select('*')
        .gte('override_date', today_iso)
        .order('override_date')
        .execute()
        .data or []
    )
    shaped_overrides = [_shape_override(o) for o in overrides]

    schedules = []
    for e in emps:
        sched_list = e.pop('employee_schedules', None) or []
        sched = sched_list[0] if sched_list else DEFAULT_SCHEDULE
        today_override = next(
            (o for o in shaped_overrides
             if o['override_date'] == today_iso
             and (o['employee_id'] == e['id'] or o['override_for_all'])),
            None,
        )
        schedules.append({
            'employee_id': e['id'],
            'name': e['name'],
            'shift_start': _fmt_time(sched['shift_start']),
            'shift_end': _fmt_time(sched['shift_end']),
            'buffer_minutes': sched['buffer_minutes'],
            'today_override': today_override,
        })

    return {'schedules': schedules, 'overrides': shaped_overrides}


# ── PATCH /employees/{employee_id}/schedule ───────────────────────────────────

@router.patch('/employees/{employee_id}/schedule')
def update_schedule(employee_id: int, body: UpdateScheduleRequest):
    db = get_supabase()

    emp = db.table('time_clock_employees').select('*').eq('id', employee_id).execute().data
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')

    payload = {
        'employee_id': employee_id,
        'shift_start': f'{body.shift_start}:00' if len(body.shift_start) == 5 else body.shift_start,
        'shift_end': f'{body.shift_end}:00' if len(body.shift_end) == 5 else body.shift_end,
        'buffer_minutes': body.buffer_minutes,
        'updated_at': _now_eastern().astimezone(dt.timezone.utc).isoformat(),
    }
    db.table('employee_schedules').upsert(payload, on_conflict='employee_id').execute()

    return {
        'message': 'Schedule updated',
        'employee': {
            'id': emp[0]['id'],
            'name': emp[0]['name'],
            'shift_start': _fmt_time(payload['shift_start']),
            'shift_end': _fmt_time(payload['shift_end']),
            'buffer_minutes': body.buffer_minutes,
        },
    }


# ── POST /schedules/override ───────────────────────────────────────────────────

@router.post('/schedules/override', status_code=201)
def create_override(body: CreateOverrideRequest):
    db = get_supabase()
    today = _now_eastern().date()

    override_date = dt.date.fromisoformat(body.override_date)
    if override_date < today:
        raise HTTPException(status_code=400, detail='Override date must be today or in the future')

    if not body.override_for_all and body.employee_id is None:
        raise HTTPException(status_code=400, detail='employee_id is required unless override_for_all is true')

    payload = {
        'employee_id': None if body.override_for_all else body.employee_id,
        'override_date': body.override_date,
        'shift_start': f'{body.shift_start}:00' if len(body.shift_start) == 5 else body.shift_start,
        'shift_end': f'{body.shift_end}:00' if len(body.shift_end) == 5 else body.shift_end,
        'buffer_minutes': body.buffer_minutes,
        'override_for_all': body.override_for_all,
        'note': body.note,
    }
    row = db.table('schedule_overrides').insert(payload).execute().data[0]
    return {'message': 'Override created', 'override': _shape_override(dict(row))}


# ── DELETE /schedules/override/{override_id} ──────────────────────────────────

@router.delete('/schedules/override/{override_id}')
def delete_override(override_id: int):
    db = get_supabase()
    existing = db.table('schedule_overrides').select('id').eq('id', override_id).execute().data
    if not existing:
        raise HTTPException(status_code=404, detail='Override not found')
    db.table('schedule_overrides').delete().eq('id', override_id).execute()
    return {'message': 'Override deleted'}


# ── POST /employees — add ──────────────────────────────────────────────────────

@router.post('/employees', status_code=201)
def create_employee(body: CreateEmployeeRequest):
    db = get_supabase()
    name = body.name.strip()
    if not (2 <= len(name) <= 50):
        raise HTTPException(status_code=400, detail='Name must be between 2 and 50 characters')

    dupe = db.table('time_clock_employees').select('id').eq('name', name).execute().data
    if dupe:
        raise HTTPException(status_code=409, detail='An employee with that name already exists')

    emp = db.table('time_clock_employees').insert({'name': name}).execute().data[0]

    ss = f'{body.shift_start}:00' if len(body.shift_start) == 5 else body.shift_start
    se = f'{body.shift_end}:00' if len(body.shift_end) == 5 else body.shift_end
    db.table('employee_schedules').insert({
        'employee_id': emp['id'],
        'shift_start': ss,
        'shift_end': se,
        'buffer_minutes': body.buffer_minutes,
    }).execute()

    return {
        'message': 'Employee added',
        'employee': {
            'id': emp['id'],
            'name': emp['name'],
            'is_active': emp['is_active'],
            'created_at': emp['created_at'],
            'shift_start': _fmt_time(ss),
            'shift_end': _fmt_time(se),
            'buffer_minutes': body.buffer_minutes,
        },
    }


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
        updates['name'] = updates['name'].strip()
        if not (2 <= len(updates['name']) <= 50):
            raise HTTPException(status_code=400, detail='Name must be between 2 and 50 characters')
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
