from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime, timezone


# ── Constants ──────────────────────────────────────────────────────────────────

VALID_INSPECTION_TYPES = ['routine', 'post_checkout', 'post_maintenance', 'deep_clean', 'pre_vip']
VALID_CONDITIONS = ['excellent', 'good', 'fair', 'poor']
VALID_CATEGORIES = ['cleanliness', 'maintenance', 'furniture', 'plumbing', 'electrical', 'hvac', 'safety', 'cosmetic']
VALID_SEVERITIES = ['urgent', 'standard', 'minor', 'note']
VALID_ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

INSPECTION_TYPE_LABELS = {
    'routine': 'Routine Check',
    'post_checkout': 'Post-Checkout',
    'post_maintenance': 'Post-Maintenance',
    'deep_clean': 'Deep Clean',
    'pre_vip': 'Pre-VIP',
}

CATEGORY_LABELS = {
    'cleanliness': 'Cleanliness',
    'maintenance': 'Maintenance',
    'furniture': 'Furniture',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'hvac': 'HVAC',
    'safety': 'Safety',
    'cosmetic': 'Cosmetic',
}

CATEGORY_EMOJIS = {
    'cleanliness': '🧹',
    'maintenance': '🔧',
    'furniture': '🪑',
    'plumbing': '🚿',
    'electrical': '⚡',
    'hvac': '❄️',
    'safety': '🔒',
    'cosmetic': '🎨',
}

SEVERITY_LABELS = {
    'urgent': 'Urgent',
    'standard': 'Standard',
    'minor': 'Minor',
    'note': 'Note',
}

SLA_HOURS: dict[str, Optional[float]] = {
    'urgent': 4,
    'standard': 24,
    'minor': 72,
    'note': None,
}

QUICK_CHECK_ITEMS = [
    {'id': 'bed_made', 'label': 'Bed made properly'},
    {'id': 'bathroom_clean', 'label': 'Bathroom clean'},
    {'id': 'floor_vacuumed', 'label': 'Floor vacuumed/mopped'},
    {'id': 'windows_clean', 'label': 'Windows clean'},
    {'id': 'ac_working', 'label': 'AC/Heat working'},
    {'id': 'tv_working', 'label': 'TV working'},
    {'id': 'safe_working', 'label': 'Safe working'},
    {'id': 'fridge_working', 'label': 'Mini fridge working'},
    {'id': 'towels_stocked', 'label': 'Towels stocked'},
    {'id': 'toiletries_stocked', 'label': 'Toiletries stocked'},
    {'id': 'door_lock_working', 'label': 'Door lock working'},
    {'id': 'lights_working', 'label': 'All lights working'},
]


# ── Pydantic Models ────────────────────────────────────────────────────────────

class Inspector(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime


class CreateInspectorRequest(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 50:
            raise ValueError('Name must be between 2 and 50 characters')
        return v


class CreateInspectionRequest(BaseModel):
    room_number: str
    inspector_id: int
    inspection_type: str = 'routine'

    @field_validator('inspection_type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_INSPECTION_TYPES:
            raise ValueError(f'inspection_type must be one of {VALID_INSPECTION_TYPES}')
        return v

    @field_validator('room_number')
    @classmethod
    def validate_room(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 3:
            raise ValueError('room_number must be 3 digits')
        floor = int(v[0])
        room_num = int(v[1:])
        if floor < 1 or floor > 4 or room_num < 1 or room_num > 34:
            raise ValueError('room_number must be 101–134, 201–234, 301–334, or 401–434')
        return v


class UpdateInspectionRequest(BaseModel):
    overall_cleanliness: Optional[int] = None
    overall_condition: Optional[str] = None
    quick_checks: Optional[dict] = None
    general_notes: Optional[str] = None

    @field_validator('overall_cleanliness')
    @classmethod
    def validate_cleanliness(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('overall_cleanliness must be between 1 and 5')
        return v

    @field_validator('overall_condition')
    @classmethod
    def validate_condition(cls, v):
        if v is not None and v not in VALID_CONDITIONS:
            raise ValueError(f'overall_condition must be one of {VALID_CONDITIONS}')
        return v


class SubmitInspectionRequest(BaseModel):
    overall_cleanliness: int
    overall_condition: str
    quick_checks: dict
    general_notes: Optional[str] = None

    @field_validator('overall_cleanliness')
    @classmethod
    def validate_cleanliness(cls, v):
        if v < 1 or v > 5:
            raise ValueError('overall_cleanliness must be between 1 and 5')
        return v

    @field_validator('overall_condition')
    @classmethod
    def validate_condition(cls, v):
        if v not in VALID_CONDITIONS:
            raise ValueError(f'overall_condition must be one of {VALID_CONDITIONS}')
        return v


class CreateIssueRequest(BaseModel):
    inspection_id: int
    room_number: str
    category: str
    severity: str = 'standard'
    location_in_room: Optional[str] = None
    description: str
    before_photo_url: Optional[str] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v not in VALID_CATEGORIES:
            raise ValueError(f'category must be one of {VALID_CATEGORIES}')
        return v

    @field_validator('severity')
    @classmethod
    def validate_severity(cls, v):
        if v not in VALID_SEVERITIES:
            raise ValueError(f'severity must be one of {VALID_SEVERITIES}')
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError('description must be at least 5 characters')
        return v


class UpdateIssueStatusRequest(BaseModel):
    status: str
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    after_photo_url: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_ISSUE_STATUSES:
            raise ValueError(f'status must be one of {VALID_ISSUE_STATUSES}')
        return v


class PhotoUploadUrlRequest(BaseModel):
    inspection_id: int
    issue_id: Optional[int] = None
    photo_type: str
    file_extension: str = 'jpg'

    @field_validator('photo_type')
    @classmethod
    def validate_photo_type(cls, v):
        if v not in ('before', 'after'):
            raise ValueError('photo_type must be before or after')
        return v


# ── Helpers ────────────────────────────────────────────────────────────────────

def compute_floor(room_number: str) -> int:
    return int(room_number[0])


def compute_sla_status(severity: str, created_at: Any, resolved_at: Any = None) -> str:
    """Returns one of 'within_sla' | 'at_risk' | 'breached' | 'no_sla'."""
    if severity == 'note' or SLA_HOURS.get(severity) is None:
        return 'no_sla'

    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if resolved_at:
        if isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
        if resolved_at.tzinfo is None:
            resolved_at = resolved_at.replace(tzinfo=timezone.utc)
        ref_time = resolved_at
    else:
        ref_time = datetime.now(tz=timezone.utc)

    hours_elapsed = (ref_time - created_at).total_seconds() / 3600
    sla = SLA_HOURS[severity]

    if resolved_at:
        return 'within_sla' if hours_elapsed <= sla else 'breached'
    if hours_elapsed >= sla:
        return 'breached'
    if hours_elapsed >= sla * 0.75:
        return 'at_risk'
    return 'within_sla'


def compute_time_open_hours(created_at: Any, resolved_at: Any = None) -> float:
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if resolved_at:
        if isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
        if resolved_at.tzinfo is None:
            resolved_at = resolved_at.replace(tzinfo=timezone.utc)
        ref_time = resolved_at
    else:
        ref_time = datetime.now(tz=timezone.utc)
    return round((ref_time - created_at).total_seconds() / 3600, 2)
