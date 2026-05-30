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


FRONT_DESK_VALID_TASK_IDS = [
    "fd_greet_guests",
    "fd_cash_drawer",
    "fd_task_sheets",
    "fd_print_hk_boards",
    "fd_night_stay_audit",
    "fd_cc_auth_report",
    "fd_inhouse_list",
    "fd_dueout_cards",
    "fd_hk_coordination",
    "fd_breakfast_setup",
    "fd_open_fitness_laundry",
    "fd_coffee_machine",
    "fd_reg_cards",
    "fd_arrivals_check",
    "fd_pet_form",
    "fd_lost_found",
    "fd_cameras",
    "fd_dnr_check",
    "fd_fill_fridge",
    "fd_drawer_count",
    "fd_marketplace_log",
    "fd_slow_time",
]

FRONT_DESK_TASK_LABELS = {
    "fd_greet_guests": "Greet guests properly — stand up, professional conversation",
    "fd_cash_drawer": "Take over cash drawer — recount, verify previous shift signed off, cash dropped",
    "fd_task_sheets": "Check all task sheets — Cash & Key logs, Guest Call-In log, Maintenance log, Shuttle log, Market Inventory log",
    "fd_print_hk_boards": "Print HK boards and maintain supply list",
    "fd_night_stay_audit": "Make zero night stay, post charges and payments including after audit check-ins and No-Show folios",
    "fd_cc_auth_report": "Check CC authorization report for declines — post all marketplace payments to house accounts or guest folios",
    "fd_inhouse_list": "Print in-house list — check every room folio for sufficient CC authorization",
    "fd_dueout_cards": "Pull all due-out reg cards from bucket — file previous day FD reports with audit bag",
    "fd_hk_coordination": "Do not check out due-out rooms until verified with HK by 11:30 AM — coordinate inspections around 3 PM",
    "fd_breakfast_setup": "Check breakfast setup, refills and clean up — cover breakfast attendant",
    "fd_open_fitness_laundry": "Open fitness room at 7 AM and laundry room at 9 AM — close both at 9 PM",
    "fd_coffee_machine": "Clean coffee machine and log cleaning time",
    "fd_reg_cards": "Verify every reg card has vehicle info, phone number, copy of guest ID, and CC name match",
    "fd_arrivals_check": "Check arrival list for comments and requests — collect deposits from prepaids, authorize arrival CCs",
    "fd_pet_form": "Ask guests about pets — fill pet form, post pet charges, authorize CC for extra",
    "fd_lost_found": "Document and secure Lost and Found items — log every guest comment, issue, and phone message",
    "fd_cameras": "Watch cameras constantly — report suspicious activity especially local resident extended stays",
    "fd_dnr_check": "Check all arrivals for DNR — limit personal cell phone use to emergencies only",
    "fd_fill_fridge": "Fill desk fridge",
    "fd_drawer_count": "Count drawer to $100 cash — close cashier shift, drop deposit in safe, have co-worker verify drop",
    "fd_marketplace_log": "Enter all marketplace sales in House Account — maintain marketplace inventory log",
    "fd_slow_time": "During slow periods — fold laundry, organize desk, wipe surfaces, clean lobby and eating area, sanitize keys",
}


class FrontDeskSubmitChecklistRequest(BaseModel):
    date: str
    task_ids: list[str]

    @field_validator("date")
    @classmethod
    def date_must_be_valid_format(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("date must be in YYYY-MM-DD format")
        return v

    @field_validator("task_ids")
    @classmethod
    def validate_task_ids(cls, v: list[str]) -> list[str]:
        if len(v) < 1:
            raise ValueError("Must submit at least one completed task")
        for task_id in v:
            if task_id not in FRONT_DESK_VALID_TASK_IDS:
                raise ValueError(f"Invalid task_id: {task_id}")
        return v


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
    def date_must_be_valid_format(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("date must be in YYYY-MM-DD format")
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
