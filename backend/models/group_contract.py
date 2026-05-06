from typing import Optional
from pydantic import BaseModel, field_validator

VALID_STATUSES = ['inquiry', 'confirmed', 'checked_in', 'completed', 'cancelled']
VALID_ROOM_TYPES = ['standard', 'triple', 'quad', 'mixed']


class GroupContract(BaseModel):
    id: int
    group_name: str
    contact_name: str
    contact_phone: str
    company_address: Optional[str]
    check_in_date: str
    check_out_date: str
    room_count: int
    room_type: str
    room_rate: Optional[float]
    triple_rate: Optional[float]
    quad_rate: Optional[float]
    deposit_by_date: Optional[str]
    cutoff_date: Optional[str]
    signed_by_date: Optional[str]
    status: str
    deposit_paid: bool
    special_notes: Optional[str]
    internal_notes: Optional[str]
    source: str
    created_at: str
    updated_at: str


class CreateGroupContractRequest(BaseModel):
    group_name: str
    contact_name: str
    contact_phone: str
    company_address: Optional[str] = None
    check_in_date: str
    check_out_date: str
    room_count: int
    room_type: str = 'standard'
    room_rate: Optional[float] = None
    triple_rate: Optional[float] = None
    quad_rate: Optional[float] = None
    deposit_by_date: Optional[str] = None
    cutoff_date: Optional[str] = None
    special_notes: Optional[str] = None
    source: str = 'public_form'

    @field_validator('room_count')
    @classmethod
    def room_count_must_be_positive(cls, v):
        if v < 1:
            raise ValueError('room_count must be >= 1')
        return v

    @field_validator('room_type')
    @classmethod
    def room_type_must_be_valid(cls, v):
        if v not in VALID_ROOM_TYPES:
            raise ValueError(f'room_type must be one of {VALID_ROOM_TYPES}')
        return v


class UpdateGroupContractRequest(BaseModel):
    status: Optional[str] = None
    deposit_paid: Optional[bool] = None
    room_rate: Optional[float] = None
    triple_rate: Optional[float] = None
    quad_rate: Optional[float] = None
    deposit_by_date: Optional[str] = None
    cutoff_date: Optional[str] = None
    signed_by_date: Optional[str] = None
    internal_notes: Optional[str] = None
    special_notes: Optional[str] = None
    room_count: Optional[int] = None
    room_type: Optional[str] = None

    @field_validator('status')
    @classmethod
    def status_must_be_valid(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f'status must be one of {VALID_STATUSES}')
        return v

    @field_validator('room_type')
    @classmethod
    def room_type_must_be_valid(cls, v):
        if v is not None and v not in VALID_ROOM_TYPES:
            raise ValueError(f'room_type must be one of {VALID_ROOM_TYPES}')
        return v


class AddActivityNoteRequest(BaseModel):
    note: str

    @field_validator('note')
    @classmethod
    def note_must_be_sufficient(cls, v):
        v = v.strip()
        if len(v) < 5:
            raise ValueError('note must be at least 5 characters after stripping whitespace')
        return v
