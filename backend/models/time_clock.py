from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta


class TimeClockEmployee(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    # joined fields
    shift_start: Optional[str] = None       # "09:00"
    shift_end: Optional[str] = None         # "16:00"
    buffer_minutes: Optional[int] = 30
    is_clocked_in: Optional[bool] = False
    current_entry_id: Optional[int] = None
    clocked_in_at: Optional[datetime] = None
    hours_today: Optional[float] = 0.0
    clock_in_status: Optional[str] = None


class CreateEmployeeRequest(BaseModel):
    name: str  # 2-50 chars, strip whitespace
    shift_start: str = "09:00"   # HH:MM format
    shift_end: str = "16:00"     # HH:MM format
    buffer_minutes: int = 30


class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class UpdateScheduleRequest(BaseModel):
    shift_start: str         # HH:MM format
    shift_end: str           # HH:MM format
    buffer_minutes: int = 30


class ScheduleOverride(BaseModel):
    id: int
    employee_id: Optional[int]
    override_date: str
    shift_start: str
    shift_end: str
    buffer_minutes: int
    override_for_all: bool
    note: Optional[str]
    created_at: datetime


class CreateOverrideRequest(BaseModel):
    employee_id: Optional[int] = None   # None if override_for_all=True
    override_date: str                  # YYYY-MM-DD
    shift_start: str                    # HH:MM
    shift_end: str                      # HH:MM
    buffer_minutes: int = 30
    override_for_all: bool = False
    note: Optional[str] = None


class TimeClockEntry(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    shift_date: str
    clock_in_at: datetime
    clock_out_at: Optional[datetime] = None
    total_minutes: Optional[float] = None
    total_hours: Optional[float] = None   # computed: total_minutes / 60
    clock_in_status: str
    clock_out_status: str
    notes: Optional[str] = None
    edited_by: Optional[str] = None
    created_at: datetime
    # computed
    is_night_shift: Optional[bool] = False  # clock_out date != clock_in date


class ClockActionRequest(BaseModel):
    employee_id: int


class EditEntryRequest(BaseModel):
    clock_in_at: Optional[str] = None   # ISO datetime string
    clock_out_at: Optional[str] = None
    notes: Optional[str] = None
    edited_by: str  # required


# Pay week: Thursday to Wednesday
# Given any date, return the Thursday that starts the pay week
def get_pay_week_start(d) -> date:
    # weekday(): Monday=0, Thursday=3, Wednesday=2
    days_since_thursday = (d.weekday() - 3) % 7
    return d - timedelta(days=days_since_thursday)


def get_pay_week_end(d) -> date:
    return get_pay_week_start(d) + timedelta(days=6)


# Determine clock-in status given actual time and schedule
def get_clock_in_status(actual_time, scheduled_start, buffer_minutes: int) -> str:
    window_start = (datetime.combine(date.today(), scheduled_start) - timedelta(minutes=buffer_minutes)).time()
    window_end   = (datetime.combine(date.today(), scheduled_start) + timedelta(minutes=buffer_minutes)).time()
    if actual_time < window_start:
        return 'early'
    elif actual_time <= window_end:
        return 'on_time'
    else:
        return 'late'


def get_clock_out_status(actual_time, scheduled_end, buffer_minutes: int) -> str:
    window_start = (datetime.combine(date.today(), scheduled_end) - timedelta(minutes=buffer_minutes)).time()
    window_end   = (datetime.combine(date.today(), scheduled_end) + timedelta(minutes=buffer_minutes)).time()
    if actual_time < window_start:
        return 'early'
    elif actual_time <= window_end:
        return 'on_time'
    else:
        return 'late'
