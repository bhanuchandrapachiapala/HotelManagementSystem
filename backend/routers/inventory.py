from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.inventory import (
    BulkUpdateRequest,
    CreateItemRequest,
    MarkOrderedRequest,
    UpdateItemRequest,
    UpdateQuantityRequest,
    VALID_CATEGORIES,
    VALID_VENDORS,
    ITEM_EMOJIS,
    compute_status,
)

router = APIRouter()


def _enrich(row: dict) -> dict:
    row['status'] = compute_status(
        float(row.get('current_quantity', 0)),
        float(row.get('min_quantity', 1)),
    )
    row['icon'] = ITEM_EMOJIS.get(row.get('name', ''), '📦')
    return row


# ── GET /alerts — must be before parameterized routes ────────────────────────

@router.get('/alerts')
def get_alerts():
    supabase = get_supabase()
    result = supabase.table('inventory_items').select('*').eq('is_active', True).execute()
    items = [_enrich(row) for row in (result.data or [])]

    critical = [i for i in items if i['status'] == 'critical']
    low = [i for i in items if i['status'] == 'low']

    by_vendor: dict = {}
    for item in critical + low:
        vendor = item.get('vendor', 'other')
        if vendor not in by_vendor:
            by_vendor[vendor] = []
        by_vendor[vendor].append({
            'id': item['id'],
            'name': item['name'],
            'status': item['status'],
            'current_quantity': item['current_quantity'],
            'min_quantity': item['min_quantity'],
            'suggested_order': item['suggested_order'],
            'unit': item['unit'],
        })

    return {
        'critical_count': len(critical),
        'low_count': len(low),
        'by_vendor': by_vendor,
    }


# ── GET /history — fixed path, before any parameterized routes ───────────────

@router.get('/history')
def get_history():
    supabase = get_supabase()
    result = (
        supabase.table('inventory_logs')
        .select('*, inventory_items(name, category)')
        .order('created_at', desc=True)
        .limit(50)
        .execute()
    )
    logs = []
    for row in (result.data or []):
        item_data = row.pop('inventory_items', None) or {}
        row['item_name'] = item_data.get('name')
        row['category'] = item_data.get('category')
        logs.append(row)
    return {'logs': logs}


# ── POST /items/bulk-update — fixed path before POST /items/{id} ──────────────

@router.post('/items/bulk-update', status_code=201)
def bulk_update(body: BulkUpdateRequest):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    updated = 0

    for entry in body.updates:
        existing = supabase.table('inventory_items').select(
            'id, current_quantity'
        ).eq('id', entry.item_id).eq('is_active', True).execute()

        if not existing.data:
            continue

        prev_qty = float(existing.data[0]['current_quantity'])
        new_qty = max(0.0, float(entry.current_quantity))

        supabase.table('inventory_logs').insert({
            'item_id': entry.item_id,
            'previous_qty': prev_qty,
            'new_qty': new_qty,
            'change_type': entry.change_type,
            'updated_by': entry.updated_by or body.updated_by,
            'notes': entry.notes,
        }).execute()

        supabase.table('inventory_items').update({
            'current_quantity': new_qty,
            'last_checked_at': now,
            'last_checked_by': entry.updated_by or body.updated_by,
        }).eq('id', entry.item_id).execute()

        updated += 1

    return {'message': f'{updated} items updated', 'updated_count': updated}


# ── POST /items/mark-ordered — fixed path before POST /items/{id} ────────────

@router.post('/items/mark-ordered')
def mark_ordered(body: MarkOrderedRequest):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    marked = 0

    for item_id in body.item_ids:
        existing = supabase.table('inventory_items').select(
            'id, current_quantity, min_quantity'
        ).eq('id', item_id).execute()

        if not existing.data:
            continue

        row = existing.data[0]
        prev_qty = float(row['current_quantity'])
        min_qty = float(row['min_quantity'])

        supabase.table('inventory_logs').insert({
            'item_id': item_id,
            'previous_qty': prev_qty,
            'new_qty': min_qty,
            'change_type': 'order_placed',
            'updated_by': body.updated_by,
        }).execute()

        supabase.table('inventory_items').update({
            'current_quantity': min_qty,
            'last_checked_at': now,
            'last_checked_by': body.updated_by,
        }).eq('id', item_id).execute()

        marked += 1

    return {'message': f'{marked} items marked as ordered'}


# ── GET /items ────────────────────────────────────────────────────────────────

@router.get('/items')
def list_items(
    category: str = Query(default=None),
    vendor: str = Query(default=None),
    status: str = Query(default=None),
):
    supabase = get_supabase()
    query = supabase.table('inventory_items').select('*').eq('is_active', True)

    result = query.execute()
    items = [_enrich(row) for row in (result.data or [])]

    if category:
        items = [i for i in items if i['category'] == category]
    if vendor:
        items = [i for i in items if i['vendor'] == vendor]
    if status:
        items = [i for i in items if i['status'] == status]

    summary = {
        'total': len(items),
        'critical': sum(1 for i in items if i['status'] == 'critical'),
        'low': sum(1 for i in items if i['status'] == 'low'),
        'ok': sum(1 for i in items if i['status'] == 'ok'),
    }
    return {'items': items, 'summary': summary}


# ── POST /items ───────────────────────────────────────────────────────────────

@router.post('/items', status_code=201)
def create_item(body: CreateItemRequest):
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f'Invalid category: {body.category}')
    if body.vendor not in VALID_VENDORS:
        raise HTTPException(status_code=400, detail=f'Invalid vendor: {body.vendor}')

    supabase = get_supabase()
    payload = body.model_dump(exclude_none=True)
    result = supabase.table('inventory_items').insert(payload).execute()
    return {'message': 'Item created', 'item': _enrich(result.data[0])}


# ── PATCH /items/{item_id}/quantity ──────────────────────────────────────────

@router.patch('/items/{item_id}/quantity')
def update_quantity(item_id: int, body: UpdateQuantityRequest):
    supabase = get_supabase()

    existing = supabase.table('inventory_items').select(
        'id, current_quantity'
    ).eq('id', item_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail='Item not found')

    prev_qty = float(existing.data[0]['current_quantity'])
    new_qty = max(0.0, float(body.current_quantity))
    now = datetime.now(timezone.utc).isoformat()

    supabase.table('inventory_logs').insert({
        'item_id': item_id,
        'previous_qty': prev_qty,
        'new_qty': new_qty,
        'change_type': body.change_type,
        'updated_by': body.updated_by,
        'notes': body.notes,
    }).execute()

    result = supabase.table('inventory_items').update({
        'current_quantity': new_qty,
        'last_checked_at': now,
        'last_checked_by': body.updated_by,
    }).eq('id', item_id).execute()

    return {'message': 'Updated', 'item': _enrich(result.data[0])}


# ── PATCH /items/{item_id} ────────────────────────────────────────────────────

@router.patch('/items/{item_id}')
def update_item(item_id: int, body: UpdateItemRequest):
    supabase = get_supabase()

    existing = supabase.table('inventory_items').select('id').eq('id', item_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail='Item not found')

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail='No fields to update')

    if 'vendor' in updates and updates['vendor'] not in VALID_VENDORS:
        raise HTTPException(status_code=400, detail=f'Invalid vendor: {updates["vendor"]}')

    result = supabase.table('inventory_items').update(updates).eq('id', item_id).execute()
    return {'message': 'Item updated', 'item': _enrich(result.data[0])}
