from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

# ── Constants ──────────────────────────────────────────────────────────────────

ALL_ROOMS: list[dict] = []
for _floor in [1, 2, 3, 4]:
    for _room in range(1, 35):
        ALL_ROOMS.append({"room_number": f"{_floor}{_room:02d}", "floor": _floor})

VALID_ROOM_NUMBERS: set[str] = {r["room_number"] for r in ALL_ROOMS}
VALID_STATUSES = {"pending", "in_progress", "done"}

# ── Pydantic models ────────────────────────────────────────────────────────────

class Housekeeper(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime


class CreateHousekeeperRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 50:
            raise ValueError("Name must be between 2 and 50 characters")
        return v


class RoomAssignment(BaseModel):
    id: int
    date: str
    room_number: str
    floor: int
    housekeeper_id: int
    housekeeper_name: Optional[str] = None
    status: str
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime


class AssignRoomsRequest(BaseModel):
    date: str
    housekeeper_id: int
    room_numbers: list[str]

    @field_validator("room_numbers")
    @classmethod
    def validate_rooms(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("room_numbers must not be empty")
        invalid = [r for r in v if r not in VALID_ROOM_NUMBERS]
        if invalid:
            raise ValueError(f"Invalid room numbers: {invalid}")
        return v


class TransferRoomsRequest(BaseModel):
    date: str
    from_housekeeper_id: int
    to_housekeeper_id: int
    room_numbers: list[str]  # empty = transfer all pending


class UpdateRoomStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError("status must be: pending, in_progress, or done")
        return v


class HousekeeperProgress(BaseModel):
    housekeeper_id: int
    housekeeper_name: str
    assigned: int
    done: int
    pending: int
    in_progress: int
    completion_rate: float
    pace: str
    estimated_finish: Optional[str] = None


class DailyProgressResponse(BaseModel):
    date: str
    total_rooms: int
    total_assigned: int
    total_done: int
    total_pending: int
    overall_completion_rate: float
    housekeepers: list[HousekeeperProgress]
