import traceback
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from models.housekeeping import (
    CreateHousekeeperRequest,
    AssignRoomsRequest,
    TransferRoomsRequest,
    UpdateRoomStatusRequest,
)

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _flatten_assignment(row: dict) -> dict:
    """Pull housekeeper name out of the nested join object."""
    hk = row.pop("housekeepers", None)
    row["housekeeper_name"] = hk["name"] if isinstance(hk, dict) else None
    return row


def _calculate_pace(assigned: int, done: int, current_hour: int) -> str:
    if assigned == 0:
        return "not_started"
    rate = done / assigned
    if current_hour < 10:
        return "not_started" if done == 0 else "on_track"
    elif current_hour < 14:
        if rate >= 0.7:
            return "fast"
        elif rate >= 0.4:
            return "on_track"
        else:
            return "slow"
    else:
        if rate >= 1.0:
            return "fast"
        elif rate >= 0.7:
            return "on_track"
        else:
            return "slow"


def _estimate_finish(done: int, assigned: int, completions: list[dict]) -> str | None:
    if done == 0 or assigned == 0:
        return None
    if done >= assigned:
        return "Completed"
    times = [row["completed_at"] for row in completions if row.get("completed_at")]
    if not times:
        return None
    first_completion = min(
        datetime.fromisoformat(t.replace("Z", "+00:00")) for t in times
    )
    now = datetime.now(tz=first_completion.tzinfo)
    elapsed_hours = (now - first_completion).total_seconds() / 3600
    if elapsed_hours <= 0:
        return None
    rate_per_hour = done / elapsed_hours
    if rate_per_hour == 0:
        return None
    hours_left = (assigned - done) / rate_per_hour
    finish_time = now + timedelta(hours=hours_left)
    return finish_time.strftime("%-I:%M %p")


# ── Housekeepers ───────────────────────────────────────────────────────────────

@router.get("/housekeepers")
def get_housekeepers(include_inactive: bool = Query(default=False)):
    db = get_supabase()
    query = db.table("housekeepers").select("*").order("name")
    if not include_inactive:
        query = query.eq("is_active", True)
    result = query.execute()
    return {"housekeepers": result.data or []}


@router.post("/housekeepers", status_code=201)
def add_housekeeper(body: CreateHousekeeperRequest):
    db = get_supabase()
    try:
        result = db.table("housekeepers").insert({"name": body.name}).execute()
        return {"message": "Housekeeper added", "housekeeper": result.data[0]}
    except Exception as exc:
        traceback.print_exc()
        if "unique" in str(exc).lower() or "duplicate" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Housekeeper with this name already exists")
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/housekeepers/{housekeeper_id}")
def deactivate_housekeeper(housekeeper_id: int):
    db = get_supabase()
    existing = db.table("housekeepers").select("*").eq("id", housekeeper_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    result = db.table("housekeepers").update({"is_active": False}).eq("id", housekeeper_id).execute()
    housekeeper = result.data[0] if result.data else existing.data[0]
    return {"message": "Housekeeper deactivated", "housekeeper": housekeeper}


@router.patch("/housekeepers/{housekeeper_id}/restore")
def restore_housekeeper(housekeeper_id: int):
    db = get_supabase()
    existing = db.table("housekeepers").select("*").eq("id", housekeeper_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    result = db.table("housekeepers").update({"is_active": True}).eq("id", housekeeper_id).execute()
    housekeeper = result.data[0] if result.data else existing.data[0]
    return {"message": "Housekeeper restored", "housekeeper": housekeeper}


# ── Assignments ────────────────────────────────────────────────────────────────

@router.get("/assignments/dates")
def get_assignment_dates():
    """Return sorted list of distinct dates that have any assignment data."""
    db = get_supabase()
    result = db.table("room_assignments").select("date").order("date", desc=True).execute()
    dates = sorted(set(r["date"] for r in (result.data or [])), reverse=True)
    return {"dates": dates}


@router.get("/assignments")
def get_assignments(
    date: str = Query(default=None),
    housekeeper_id: int = Query(default=None),
):
    date_str = date or datetime.today().strftime("%Y-%m-%d")
    db = get_supabase()
    query = (
        db.table("room_assignments")
        .select("*, housekeepers(name)")
        .eq("date", date_str)
        .order("room_number")
    )
    if housekeeper_id is not None:
        query = query.eq("housekeeper_id", housekeeper_id)
    result = query.execute()
    assignments = [_flatten_assignment(r) for r in (result.data or [])]
    return {"date": date_str, "assignments": assignments}


@router.post("/assignments", status_code=201)
def assign_rooms(body: AssignRoomsRequest):
    today = datetime.today().strftime("%Y-%m-%d")
    if body.date < today:
        raise HTTPException(status_code=400, detail="Cannot assign rooms for past dates")

    db = get_supabase()

    # Verify housekeeper exists
    hk = db.table("housekeepers").select("id, name").eq("id", body.housekeeper_id).eq("is_active", True).execute()
    if not hk.data:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    hk_name = hk.data[0]["name"]

    rows = [
        {
            "date": body.date,
            "room_number": rn,
            "floor": int(rn[0]),
            "housekeeper_id": body.housekeeper_id,
            "status": "pending",
        }
        for rn in body.room_numbers
    ]

    try:
        db.table("room_assignments").upsert(rows, on_conflict="date,room_number").execute()
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))

    count = len(rows)
    return {
        "message": f"{count} room{'s' if count != 1 else ''} assigned to {hk_name}",
        "assigned_count": count,
    }


@router.post("/assignments/transfer")
def transfer_rooms(body: TransferRoomsRequest):
    db = get_supabase()

    # Resolve names for the response message
    from_hk = db.table("housekeepers").select("name").eq("id", body.from_housekeeper_id).execute()
    to_hk = db.table("housekeepers").select("name").eq("id", body.to_housekeeper_id).execute()
    if not from_hk.data or not to_hk.data:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    from_name = from_hk.data[0]["name"]
    to_name = to_hk.data[0]["name"]

    query = (
        db.table("room_assignments")
        .select("room_number")
        .eq("date", body.date)
        .eq("housekeeper_id", body.from_housekeeper_id)
        .neq("status", "done")
    )
    if body.room_numbers:
        query = query.in_("room_number", body.room_numbers)

    candidates = query.execute()
    room_list = [r["room_number"] for r in (candidates.data or [])]

    if not room_list:
        return {"message": "No eligible rooms to transfer", "transferred_count": 0}

    db.table("room_assignments").update({"housekeeper_id": body.to_housekeeper_id}).eq(
        "date", body.date
    ).eq("housekeeper_id", body.from_housekeeper_id).in_("room_number", room_list).execute()

    count = len(room_list)
    return {
        "message": f"{count} room{'s' if count != 1 else ''} transferred from {from_name} to {to_name}",
        "transferred_count": count,
    }


@router.patch("/assignments/{assignment_id}/status")
def update_room_status(assignment_id: int, body: UpdateRoomStatusRequest):
    db = get_supabase()
    existing = (
        db.table("room_assignments").select("*").eq("id", assignment_id).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Assignment not found")

    row = existing.data[0]
    now_iso = datetime.utcnow().isoformat() + "Z"
    updates: dict = {"status": body.status}

    if body.status == "done":
        updates["completed_at"] = now_iso
    elif body.status == "in_progress":
        if not row.get("started_at"):
            updates["started_at"] = now_iso
    elif body.status == "pending":
        updates["completed_at"] = None
        updates["started_at"] = None

    result = (
        db.table("room_assignments")
        .update(updates)
        .eq("id", assignment_id)
        .execute()
    )
    updated = result.data[0] if result.data else row
    room_number = updated.get("room_number", assignment_id)
    return {"message": f"Room {room_number} marked as {body.status}", "assignment": updated}


# ── Progress & Timeline ────────────────────────────────────────────────────────

@router.get("/progress")
def get_progress(date: str = Query(default=None)):
    date_str = date or datetime.today().strftime("%Y-%m-%d")
    db = get_supabase()

    assignments_result = (
        db.table("room_assignments")
        .select("*, housekeepers(name)")
        .eq("date", date_str)
        .execute()
    )
    assignments = [_flatten_assignment(r) for r in (assignments_result.data or [])]

    housekeepers_result = (
        db.table("housekeepers").select("id, name").eq("is_active", True).order("name").execute()
    )
    housekeepers = housekeepers_result.data or []

    current_hour = datetime.now().hour

    # Group assignments by housekeeper
    by_hk: dict[int, list[dict]] = {}
    for a in assignments:
        by_hk.setdefault(a["housekeeper_id"], []).append(a)

    hk_progress = []
    for hk in housekeepers:
        hk_id = hk["id"]
        rows = by_hk.get(hk_id, [])
        assigned = len(rows)
        done = sum(1 for r in rows if r["status"] == "done")
        pending = sum(1 for r in rows if r["status"] == "pending")
        in_progress = sum(1 for r in rows if r["status"] == "in_progress")
        rate = round(done / assigned * 100, 1) if assigned > 0 else 0.0
        pace = _calculate_pace(assigned, done, current_hour)
        est = _estimate_finish(done, assigned, rows)
        hk_progress.append(
            {
                "housekeeper_id": hk_id,
                "housekeeper_name": hk["name"],
                "assigned": assigned,
                "done": done,
                "pending": pending,
                "in_progress": in_progress,
                "completion_rate": rate,
                "pace": pace,
                "estimated_finish": est,
            }
        )

    total_assigned = len(assignments)
    total_done = sum(1 for a in assignments if a["status"] == "done")
    total_pending = sum(1 for a in assignments if a["status"] == "pending")
    overall_rate = round(total_done / total_assigned * 100, 1) if total_assigned > 0 else 0.0

    return {
        "date": date_str,
        "total_rooms": 136,
        "total_assigned": total_assigned,
        "total_done": total_done,
        "total_pending": total_pending,
        "overall_completion_rate": overall_rate,
        "housekeepers": hk_progress,
    }


@router.get("/timeline")
def get_timeline(date: str = Query(default=None)):
    date_str = date or datetime.today().strftime("%Y-%m-%d")
    db = get_supabase()
    result = (
        db.table("room_assignments")
        .select("room_number, floor, completed_at, housekeepers(name)")
        .eq("date", date_str)
        .eq("status", "done")
        .order("completed_at")
        .execute()
    )
    timeline = []
    for row in reversed(result.data or []):
        hk = row.get("housekeepers") or {}
        completed_at = row.get("completed_at") or ""
        time_display = ""
        if completed_at:
            try:
                dt = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                time_display = dt.strftime("%-I:%M %p")
            except Exception:
                time_display = completed_at
        timeline.append(
            {
                "room_number": row["room_number"],
                "floor": row["floor"],
                "housekeeper_name": hk.get("name", ""),
                "completed_at": completed_at,
                "time_display": time_display,
            }
        )
    return {"timeline": timeline}
