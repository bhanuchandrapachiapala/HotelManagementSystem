from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

VALID_ENTREES = [
    "Chicken Fingers",
    "Crispy Chicken Sandwich",
    "Crispy Chicken Salad",
    "Cheeseburger",
    "Veggie Burger",
]
VALID_SIDES = [
    "Tater Tots / Fries",
    "Steamed Veggies",
    "Side Salad",
    "Potato Chips",
    "Mac & Cheese",
]
VALID_DESSERTS = ["Cookie / Pastry", "Fresh Fruits", "Yogurt"]
VALID_DRINKS = ["Water", "Soda", "Juice"]
VALID_STATUSES = ["pending", "preparing", "delivered"]


class DinnerOrder(BaseModel):
    id: int
    room_number: str
    guest_initials: str
    entree: str
    sides: list[str]
    dessert: str
    drink: str
    status: str
    notes: Optional[str]
    submitted_at: datetime
    updated_at: datetime


class CreateOrderRequest(BaseModel):
    room_number: str
    guest_initials: str
    entree: str
    sides: list[str]
    dessert: str
    drink: str
    notes: Optional[str] = None

    @field_validator("room_number")
    @classmethod
    def room_number_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Room number is required")
        if len(v) > 10:
            raise ValueError("Room number must be 10 characters or fewer")
        return v

    @field_validator("guest_initials")
    @classmethod
    def initials_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Guest initials are required")
        if len(v) > 15:
            raise ValueError("Guest initials must be 15 characters or fewer")
        return v

    @field_validator("entree")
    @classmethod
    def validate_entree(cls, v: str) -> str:
        if v not in VALID_ENTREES:
            raise ValueError("Invalid entrée selection")
        return v

    @field_validator("sides")
    @classmethod
    def validate_sides(cls, v: list[str]) -> list[str]:
        if len(v) != 2:
            raise ValueError("Please select exactly 2 sides")
        for side in v:
            if side not in VALID_SIDES:
                raise ValueError(f"Invalid side selection: {side}")
        return v

    @field_validator("dessert")
    @classmethod
    def validate_dessert(cls, v: str) -> str:
        if v not in VALID_DESSERTS:
            raise ValueError("Invalid dessert selection")
        return v

    @field_validator("drink")
    @classmethod
    def validate_drink(cls, v: str) -> str:
        if v not in VALID_DRINKS:
            raise ValueError("Invalid drink selection")
        return v


class UpdateOrderStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError("Invalid status. Must be: pending, preparing, or delivered")
        return v


class OrderSummary(BaseModel):
    total: int
    pending: int
    preparing: int
    delivered: int
    orders: list[DinnerOrder]
