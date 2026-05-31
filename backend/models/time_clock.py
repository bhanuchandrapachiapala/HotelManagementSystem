from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


VALID_DEPARTMENTS = [
    'front_desk', 'housekeeping', 'maintenance', 'kitchen', 'management', 'other'
]

DEPARTMENT_LABELS = {
    'front_desk': 'Front Desk',
    'housekeeping': 'Housekeeping',
    'maintenance': 'Maintenance',
    'kitchen': 'Kitchen',
    'management': 'Management',
    'other': 'Other',
}


class TimeClockEmployee(BaseModel):
    id: int
    name: str
    department: str
    is_active: bool
    created_at: datetime


class CreateEmployeeRequest(BaseModel):
    name: str
    department: str

    @field_validator('name')
    @classmethod
    def name_length(cls, v: str) -> str:
        v = v.strip()
        if not (2 <= len(v) <= 50):
            raise ValueError('name must be between 2 and 50 characters')
        return v

    @field_validator('department')
    @classmethod
    def department_valid(cls, v: str) -> str:
        if v not in VALID_DEPARTMENTS:
            raise ValueError(f'Invalid department: {v}')
        return v


class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def name_length(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not (2 <= len(v) <= 50):
            raise ValueError('name must be between 2 and 50 characters')
        return v

    @field_validator('department')
    @classmethod
    def department_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in VALID_DEPARTMENTS:
            raise ValueError(f'Invalid department: {v}')
        return v


class TimeClockEntry(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    clock_in_at: datetime
    clock_out_at: Optional[datetime] = None
    total_minutes: Optional[float] = None
    total_hours: Optional[float] = None  # total_minutes / 60 — computed
    status: Optional[str] = None  # active / completed / incomplete — computed
    notes: Optional[str] = None
    edited_by: Optional[str] = None
    created_at: datetime


class ClockActionRequest(BaseModel):
    employee_id: int


class EditEntryRequest(BaseModel):
    clock_in_at: Optional[str] = None
    clock_out_at: Optional[str] = None
    notes: Optional[str] = None
    edited_by: str

    @field_validator('edited_by')
    @classmethod
    def edited_by_required(cls, v: str) -> str:
        v = (v or '').strip()
        if not v:
            raise ValueError('edited_by is required')
        return v


class AnalyticsEmployeeEntry(BaseModel):
    date: str
    hours: float
    status: str


class AnalyticsByEmployee(BaseModel):
    employee_id: int
    employee_name: str
    department: str
    days_worked: int
    total_hours: float
    avg_hours_per_day: float
    overtime_days: int
    entries: list[AnalyticsEmployeeEntry]


class AnalyticsByDepartment(BaseModel):
    department: str
    department_label: str
    total_hours: float
    employee_count: int


class AnalyticsDailyTotal(BaseModel):
    date: str
    label: str
    total_hours: float
    employee_count: int


class AnalyticsOvertimeAlert(BaseModel):
    employee_name: str
    period: str
    total_hours: float
    overtime_hours: float


class AnalyticsSummary(BaseModel):
    period_days: int
    by_employee: list[AnalyticsByEmployee]
    by_department: list[AnalyticsByDepartment]
    daily_totals: list[AnalyticsDailyTotal]
    overtime_alerts: list[AnalyticsOvertimeAlert]
