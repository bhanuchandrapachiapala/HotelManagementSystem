from fastapi import APIRouter, HTTPException, Query
from datetime import date, datetime, timedelta
import calendar

from database import get_supabase
from models.task import (
    SubmitChecklistRequest,
    TaskCompletionSummary,
    VALID_TASK_IDS,
    TASK_LABELS,
)

router = APIRouter()


def _build_summary(rows: list[dict], for_date: str) -> dict:
    task_ids = [r["task_id"] for r in rows]
    completed_count = len(task_ids)
    submitted_at = rows[0]["submitted_at"] if rows else None
    return {
        "date": for_date,
        "completed_count": completed_count,
        "total_tasks": 6,
        "completion_rate": round(completed_count / 6 * 100, 1),
        "task_ids": task_ids,
        "submitted_at": submitted_at,
    }


@router.get("/today")
def get_today_tasks():
    today = date.today().isoformat()
    db = get_supabase()
    result = db.table("task_completions").select("*").eq("date", today).execute()
    rows = result.data or []
    return _build_summary(rows, today)


@router.get("/date/{date_str}")
def get_tasks_for_date(date_str: str):
    db = get_supabase()
    result = db.table("task_completions").select("*").eq("date", date_str).execute()
    rows = result.data or []
    if not rows:
        return {
            "date": date_str,
            "completed_count": 0,
            "total_tasks": 6,
            "completion_rate": 0.0,
            "task_ids": [],
            "submitted_at": None,
        }
    return _build_summary(rows, date_str)


@router.get("/range")
def get_tasks_range(
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    if (end - start).days > 90:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days")

    db = get_supabase()
    result = (
        db.table("task_completions")
        .select("*")
        .gte("date", start_date)
        .lte("date", end_date)
        .execute()
    )
    rows = result.data or []

    by_date: dict[str, list] = {}
    for row in rows:
        d = row["date"]
        by_date.setdefault(d, []).append(row)

    days = []
    current = start
    today = date.today()
    while current <= end:
        ds = current.isoformat()
        day_rows = by_date.get(ds, [])
        count = len(day_rows)
        days.append(
            {
                "date": ds,
                "completed_count": count,
                "completion_rate": round(count / 6 * 100, 1),
                "task_ids": [r["task_id"] for r in day_rows],
            }
        )
        current += timedelta(days=1)

    total_days_with_data = sum(1 for d in days if d["completed_count"] > 0)
    fully_completed = sum(1 for d in days if d["completed_count"] == 6)
    partial = sum(1 for d in days if 0 < d["completed_count"] < 6)
    empty = sum(1 for d in days if d["completed_count"] == 0)

    all_counts = [d["completed_count"] for d in days if d["completed_count"] > 0]
    if all_counts:
        overall_rate = round(sum(all_counts) / (len(all_counts) * 6) * 100, 1)
    else:
        overall_rate = 0.0

    return {
        "start_date": start_date,
        "end_date": end_date,
        "days": days,
        "summary": {
            "total_days_with_data": total_days_with_data,
            "fully_completed_days": fully_completed,
            "partial_days": partial,
            "empty_days": empty,
            "overall_completion_rate": overall_rate,
        },
    }


@router.get("/analysis")
def get_task_analysis(month: str = Query(default=None)):
    if month is None:
        today = date.today()
        month = today.strftime("%Y-%m")

    year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    _, days_in_month = calendar.monthrange(year, mon)
    start_date = f"{month}-01"
    end_date = f"{month}-{days_in_month:02d}"

    db = get_supabase()
    result = (
        db.table("task_completions")
        .select("*")
        .gte("date", start_date)
        .lte("date", end_date)
        .execute()
    )
    rows = result.data or []

    dates_with_data = set(r["date"] for r in rows)
    working_days = len(dates_with_data)

    by_task: dict[str, set] = {tid: set() for tid in VALID_TASK_IDS}
    for row in rows:
        if row["task_id"] in by_task:
            by_task[row["task_id"]].add(row["date"])

    tasks = []
    for tid in VALID_TASK_IDS:
        completed_days = len(by_task[tid])
        missed_days = working_days - completed_days
        rate = round(completed_days / working_days * 100, 1) if working_days > 0 else 0.0
        if rate >= 80:
            status = "good"
        elif rate >= 50:
            status = "fair"
        else:
            status = "low"
        tasks.append(
            {
                "task_id": tid,
                "label": TASK_LABELS[tid],
                "completed_days": completed_days,
                "missed_days": missed_days,
                "completion_rate": rate,
                "status": status,
            }
        )

    return {"month": month, "working_days": working_days, "tasks": tasks}


def _date_label(d: date, today: date) -> str:
    if d == today:
        return "Today"
    if d == today - timedelta(days=1):
        return "Yesterday"
    return d.strftime("%a, %b %-d")


@router.get("/history")
def get_task_history(days: int = Query(default=7, le=30)):
    today = date.today()
    start = today - timedelta(days=days - 1)

    db = get_supabase()
    result = (
        db.table("task_completions")
        .select("*")
        .gte("date", start.isoformat())
        .lte("date", today.isoformat())
        .execute()
    )
    rows = result.data or []

    by_date: dict[str, list] = {}
    for row in rows:
        by_date.setdefault(row["date"], []).append(row)

    history = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        ds = d.isoformat()
        day_rows = by_date.get(ds, [])
        count = len(day_rows)
        history.append(
            {
                "date": ds,
                "completed_count": count,
                "completion_rate": round(count / 6 * 100, 1),
                "label": _date_label(d, today),
            }
        )

    return {"history": history}


@router.post("/submit", status_code=201)
def submit_checklist(body: SubmitChecklistRequest):
    db = get_supabase()
    db.table("task_completions").delete().eq("date", body.date).execute()

    now = datetime.utcnow().isoformat() + "Z"
    rows = [
        {"date": body.date, "task_id": tid, "completed": True, "submitted_at": now}
        for tid in body.task_ids
    ]
    db.table("task_completions").insert(rows).execute()

    count = len(body.task_ids)
    return {
        "message": "Checklist submitted successfully",
        "date": body.date,
        "completed_count": count,
        "total_tasks": 6,
        "completion_rate": round(count / 6 * 100, 1),
    }
