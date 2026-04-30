from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional
import re

VALID_TASK_IDS = [
    "madalia_reviews",
    "cvent_rfp",
    "business_cases",
    "leisure",
    "transient",
    "reply_reviews",
]

TASK_LABELS = {
    "madalia_reviews": "Madalia Online Booking Reviews",
    "cvent_rfp": "Cvent RFP",
    "business_cases": "Business Cases",
    "leisure": "Leisure",
    "transient": "Transient",
    "reply_reviews": "Reply All Reviews",
}


class TaskCompletion(BaseModel):
    id: int
    date: date
    task_id: str
    completed: bool
    submitted_at: datetime


class SubmitChecklistRequest(BaseModel):
    date: str
    task_ids: list[str]

    @field_validator("date")
    @classmethod
    def date_must_be_today(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("date must be in YYYY-MM-DD format")
        today = date.today().isoformat()
        if v != today:
            raise ValueError("Can only submit for today's date")
        return v

    @field_validator("task_ids")
    @classmethod
    def validate_task_ids(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("Must submit at least one completed task")
        for task_id in v:
            if task_id not in VALID_TASK_IDS:
                raise ValueError(f"Invalid task_id: {task_id}")
        return v


class TaskCompletionSummary(BaseModel):
    date: str
    completed_count: int
    total_tasks: int = 6
    task_ids: list[str]
    completion_rate: float
    submitted_at: Optional[str] = None


class DateRangeRequest(BaseModel):
    start_date: str
    end_date: str
