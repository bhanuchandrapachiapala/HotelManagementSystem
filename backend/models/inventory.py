from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InventoryItem(BaseModel):
    id: int
    name: str
    category: str
    vendor: str
    unit: str
    min_quantity: float
    current_quantity: float
    suggested_order: float
    notes: Optional[str]
    is_active: bool
    last_checked_at: Optional[datetime]
    last_checked_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    status: Optional[str] = None  # critical / low / ok — computed


class UpdateQuantityRequest(BaseModel):
    current_quantity: float
    updated_by: str
    change_type: str = 'stock_check'
    notes: Optional[str] = None


class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    min_quantity: Optional[float] = None
    vendor: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CreateItemRequest(BaseModel):
    name: str
    category: str
    vendor: str = 'other'
    unit: str = 'pack'
    min_quantity: float = 1
    current_quantity: float = 0
    notes: Optional[str] = None


class BulkUpdateEntry(BaseModel):
    item_id: int
    current_quantity: float
    updated_by: str
    change_type: str = 'stock_check'
    notes: Optional[str] = None


class BulkUpdateRequest(BaseModel):
    updates: list[BulkUpdateEntry]
    updated_by: str


class MarkOrderedRequest(BaseModel):
    item_ids: list[int]
    updated_by: str


VALID_CATEGORIES = [
    'breakfast_food', 'disposables', 'room_amenities', 'cleaning_supplies', 'front_desk'
]
VALID_VENDORS = ['sysco', 'costco', 'webstaurantstore', 'members_mark', 'other']

CATEGORY_LABELS = {
    'breakfast_food': 'Breakfast & Food',
    'disposables': 'Disposables & Supplies',
    'room_amenities': 'Room Amenities',
    'cleaning_supplies': 'Cleaning Supplies',
    'front_desk': 'Front Desk & Office',
}

VENDOR_LABELS = {
    'sysco': 'Sysco',
    'costco': 'Costco',
    'webstaurantstore': 'WebstaurantStore',
    'members_mark': "Member's Mark",
    'other': 'Other',
}


def compute_status(current: float, minimum: float) -> str:
    if current <= minimum:
        return 'critical'
    elif current <= minimum * 1.2:
        return 'low'
    return 'ok'
