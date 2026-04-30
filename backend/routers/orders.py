import traceback
from fastapi import APIRouter, HTTPException, Query
from datetime import date, timedelta

from database import get_supabase
from models.order import (
    CreateOrderRequest,
    UpdateOrderStatusRequest,
    VALID_ENTREES,
    VALID_SIDES,
    VALID_DESSERTS,
    VALID_DRINKS,
)

router = APIRouter()


def _order_counts(orders: list[dict]) -> dict:
    pending = sum(1 for o in orders if o["status"] == "pending")
    preparing = sum(1 for o in orders if o["status"] == "preparing")
    delivered = sum(1 for o in orders if o["status"] == "delivered")
    return {"total": len(orders), "pending": pending, "preparing": preparing, "delivered": delivered}


def _date_label(d: date, today: date) -> str:
    if d == today:
        return "Today"
    if d == today - timedelta(days=1):
        return "Yesterday"
    return d.strftime("%a, %b %-d")


@router.get("/today")
def get_today_orders(status: str = Query(default=None)):
    today = date.today().isoformat()
    db = get_supabase()
    query = (
        db.table("dinner_orders")
        .select("*")
        .gte("submitted_at", f"{today}T00:00:00Z")
        .lte("submitted_at", f"{today}T23:59:59Z")
        .order("submitted_at", desc=True)
    )
    if status:
        query = query.eq("status", status)
    result = query.execute()
    orders = result.data or []
    counts = _order_counts(orders)
    return {"date": today, **counts, "orders": orders}


@router.post("", status_code=201)
def create_order(body: CreateOrderRequest):
    try:
        db = get_supabase()
        payload = body.model_dump()
        result = db.table("dinner_orders").insert(payload).execute()
        order = result.data[0] if result.data else {}
        return {"message": "Order placed successfully", "order": order}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, body: UpdateOrderStatusRequest):
    db = get_supabase()
    existing = db.table("dinner_orders").select("id").eq("id", order_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    result = db.table("dinner_orders").update({"status": body.status}).eq("id", order_id).execute()
    order = result.data[0] if result.data else {}
    return {"message": "Order status updated", "order": order}


@router.get("/summary")
def get_order_summary():
    today = date.today().isoformat()
    db = get_supabase()
    result = (
        db.table("dinner_orders")
        .select("*")
        .gte("submitted_at", f"{today}T00:00:00Z")
        .lte("submitted_at", f"{today}T23:59:59Z")
        .execute()
    )
    orders = result.data or []
    counts = _order_counts(orders)
    total = counts["total"]

    def count_items(key: str, valid: list[str]) -> list[dict]:
        freq: dict[str, int] = {}
        for o in orders:
            val = o.get(key)
            if isinstance(val, list):
                for item in val:
                    freq[item] = freq.get(item, 0) + 1
            elif val:
                freq[val] = freq.get(val, 0) + 1
        result_list = [
            {"item": item, "count": cnt, "percentage": round(cnt / total * 100, 1) if total else 0}
            for item, cnt in freq.items()
        ]
        return sorted(result_list, key=lambda x: x["count"], reverse=True)

    popular = {
        "entrees": count_items("entree", VALID_ENTREES),
        "sides": count_items("sides", VALID_SIDES),
        "desserts": count_items("dessert", VALID_DESSERTS),
        "drinks": count_items("drink", VALID_DRINKS),
    }

    return {"date": today, **counts, "popular_items": popular}


@router.get("/history")
def get_order_history(days: int = Query(default=7, le=30)):
    today = date.today()
    db = get_supabase()
    history = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        ds = d.isoformat()
        result = (
            db.table("dinner_orders")
            .select("id")
            .gte("submitted_at", f"{ds}T00:00:00Z")
            .lte("submitted_at", f"{ds}T23:59:59Z")
            .execute()
        )
        history.append(
            {
                "date": ds,
                "total": len(result.data or []),
                "label": _date_label(d, today),
            }
        )
    return {"history": history}
