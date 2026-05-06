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

ITEM_EMOJIS: dict[str, str] = {
    'Bread — White': '🍞', 'Bread — Honey Wheat': '🍞',
    'English Muffins': '🥯', 'Milk — Vitamin D': '🥛', 'Milk — 2%': '🥛',
    'Yogurt 4-pack': '🫙', 'Butter Chips': '🧈', 'Cream Cheese': '🧀',
    'Waffle Mix — Members Mark': '🧇', 'Danish 24-pack': '🥐',
    'Honey Bunches of Oats': '🥣', 'Coffee Cake': '🎂',
    'Coffee — Medium Roast': '☕', 'Coffee — Dark Roast': '☕',
    'Creamers': '🤍', 'Sugar Packs': '🍬', 'Sweet N Low': '🍬',
    'Lipton Tea — Regular': '🍵', 'Lipton Tea — Decaf': '🍵',
    'Fountain Juices': '🧃', 'Swiss Miss Hot Chocolate': '🍫',
    'Concord Grape Jelly': '🍇', 'Jif Creamy Peanut Butter': '🥜',
    'Mayo — Kraft': '🫙', 'Ketchup — Red Gold': '🍅',
    'Ketchup Bottle': '🍅', 'Mustard Bottle': '💛',
    "Red Hot Frank's Sauce": '🌶️', 'Real Lemon Juice': '🍋',
    'Maple Syrup': '🍁', 'Bananas': '🍌', 'Clementines': '🍊',
    'Oatmeal Packets': '🥣', 'Froot Loops': '🌈',
    'Honey Bunches Cereal': '🌾', 'Cheerios': '⭕',
    'Egg Oaks': '🥚', 'Sausage Patties': '🥩', 'Bagels': '🥯',
    'Ginger Ale': '🫧', 'Coca-Cola Regular': '🥤', 'Diet Coke': '🥤',
    'Water': '💧',
    'Napkins': '🗒️', 'Paper Towels': '🧻',
    'Waffle/Juice Cups 5oz': '🥤', '8-inch Plates': '🍽️',
    '6-inch Plates': '🍽️', 'Bowls': '🥣', 'Forks': '🍴',
    'Spoons': '🥄', 'Knives': '🔪', 'Coffee Cups': '☕',
    'Lids': '🔵', 'Stirrers': '🪄', 'Filter Paper': '📄',
    'Gloves': '🧤',
    'Soap': '🧼', 'Lotion': '🧴', 'Shampoo': '🧴',
    'Conditioner': '🧴', 'Facial Tissue': '🤧', 'Toilet Paper': '🧻',
    'Toothpaste': '🦷', 'Toothbrush': '🪥',
    'Coffee Cups — In Room': '☕', 'Ice Bags': '🧊',
    'Bin Liners': '🗑️', 'Laundry Bags': '👜', 'K Cups': '☕',
    'Glass Cleaner': '🪟', 'Febreze': '💨', 'Lysol Spray': '🧪',
    'Lysol Liquid': '🧪', 'Dryer Sheets': '🌸', 'Magic Eraser': '🪄',
    'Pledge': '✨', 'Air Freshener': '💨', 'Bleach': '⚗️',
    'Fabuloso': '🫧', 'Swiffer Pads': '🧹', 'Mop Heads': '🪣',
    'Garbage Bags': '🗑️', 'Tide Pods': '🫧',
    'Pens': '🖊️', 'Sharpie': '🖊️', 'Printer Paper': '📄',
    'Notepad / Post-it': '📋', 'Toner': '🖨️', 'Staples': '📎',
    'Envelopes — Cash': '✉️', 'Envelopes — File': '📁',
    'Elastic Bands': '🔗', 'AAA Batteries': '🔋', 'Key Holders': '🗝️',
}

CATEGORY_COLORS: dict[str, str] = {
    'breakfast_food': 'bg-orange-100 text-orange-600',
    'disposables': 'bg-blue-100 text-blue-600',
    'room_amenities': 'bg-purple-100 text-purple-600',
    'cleaning_supplies': 'bg-green-100 text-green-600',
    'front_desk': 'bg-gray-100 text-gray-600',
}
# Default vendor slugs shown in the UI dropdown; not enforced as a constraint.
# The DB-level check constraint was removed in migration 005_remove_vendor_constraint.sql.
DEFAULT_VENDORS = ['sysco', 'costco', 'webstaurantstore', 'members_mark', 'other']

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
