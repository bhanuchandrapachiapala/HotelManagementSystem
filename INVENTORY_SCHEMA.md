# INVENTORY MODULE — Feature Addition Schema
## Addendum to CascoBay HMS SCHEMA.md

> **Purpose**: Add a complete Inventory Management module to the existing CascoBay HMS. This is an ADDENDUM — do not touch any existing code unless explicitly stated.

---

## 1. DATABASE SCHEMA

### Table: `inventory_items`

```sql
CREATE TABLE IF NOT EXISTS inventory_items (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  vendor            TEXT        NOT NULL DEFAULT 'other',
  unit              TEXT        NOT NULL DEFAULT 'pack',
  min_quantity      NUMERIC(10,2) NOT NULL DEFAULT 1,
  current_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  suggested_order   NUMERIC(10,2) GENERATED ALWAYS AS (min_quantity * 2) STORED,
  notes             TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_checked_at   TIMESTAMPTZ,
  last_checked_by   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN (
    'breakfast_food','disposables','room_amenities','cleaning_supplies','front_desk'
  )),
  CONSTRAINT valid_vendor CHECK (vendor IN (
    'sysco','costco','webstaurantstore','members_mark','other'
  )),
  CONSTRAINT valid_status CHECK (current_quantity >= 0)
);
```

**Status computed in application layer** (not DB):
- `critical`: current_quantity <= min_quantity
- `low`: current_quantity <= min_quantity * 1.2 AND current_quantity > min_quantity
- `ok`: current_quantity > min_quantity * 1.2

### Table: `inventory_logs`

```sql
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              BIGSERIAL PRIMARY KEY,
  item_id         BIGINT      NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  previous_qty    NUMERIC(10,2) NOT NULL,
  new_qty         NUMERIC(10,2) NOT NULL,
  change_type     TEXT        NOT NULL DEFAULT 'stock_check',
  updated_by      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_change_type CHECK (change_type IN (
    'stock_check','restock','adjustment','order_placed'
  ))
);
```

---

## 2. SUPABASE SQL MIGRATION

**File**: `supabase/migrations/004_inventory.sql`

```sql
-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Inventory Module Migration
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inventory_items (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT          NOT NULL,
  category          TEXT          NOT NULL,
  vendor            TEXT          NOT NULL DEFAULT 'other',
  unit              TEXT          NOT NULL DEFAULT 'pack',
  min_quantity      NUMERIC(10,2) NOT NULL DEFAULT 1,
  current_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  suggested_order   NUMERIC(10,2) GENERATED ALWAYS AS (min_quantity * 2) STORED,
  notes             TEXT,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  last_checked_at   TIMESTAMPTZ,
  last_checked_by   TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT valid_inv_category CHECK (category IN (
    'breakfast_food','disposables','room_amenities','cleaning_supplies','front_desk'
  )),
  CONSTRAINT valid_inv_vendor CHECK (vendor IN (
    'sysco','costco','webstaurantstore','members_mark','other'
  ))
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id            BIGSERIAL PRIMARY KEY,
  item_id       BIGINT        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  previous_qty  NUMERIC(10,2) NOT NULL,
  new_qty       NUMERIC(10,2) NOT NULL,
  change_type   TEXT          NOT NULL DEFAULT 'stock_check',
  updated_by    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT valid_change_type CHECK (change_type IN (
    'stock_check','restock','adjustment','order_placed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor   ON inventory_items(vendor);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active   ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item      ON inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created   ON inventory_logs(created_at DESC);

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_inventory_items" ON inventory_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_inventory_logs"  ON inventory_logs  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════
-- SEED DATA — All items pre-loaded
-- ══════════════════════════════════════════════════════

INSERT INTO inventory_items (name, category, vendor, unit, min_quantity, current_quantity, notes) VALUES

-- ── BREAKFAST FOOD ──
('Bread — White',               'breakfast_food', 'other',         'loaf',   2,  0, 'Keep 2 each white and honey wheat'),
('Bread — Honey Wheat',         'breakfast_food', 'other',         'loaf',   2,  0, NULL),
('English Muffins',             'breakfast_food', 'other',         'pack',   3,  0, '3 full packs'),
('Milk — Vitamin D',            'breakfast_food', 'other',         'jug',    2,  0, '2 each type'),
('Milk — 2%',                   'breakfast_food', 'other',         'jug',    2,  0, NULL),
('Yogurt 4-pack',               'breakfast_food', 'other',         'pack',   4,  0, NULL),
('Butter Chips',                'breakfast_food', 'sysco',         'tray',   1,  0, '1 tray minimum'),
('Cream Cheese',                'breakfast_food', 'sysco',         'tray',   1,  0, NULL),
('Waffle Mix — Members Mark',   'breakfast_food', 'members_mark',  'pack',   2,  0, '2 packs'),
('Danish 24-pack',              'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Honey Bunches of Oats',       'breakfast_food', 'other',         'pack',   3,  0, NULL),
('Coffee Cake',                 'breakfast_food', 'other',         'pack',   2,  0, NULL),
('Coffee — Medium Roast',       'breakfast_food', 'other',         'bag',    2,  0, NULL),
('Coffee — Dark Roast',         'breakfast_food', 'other',         'bag',    2,  0, NULL),
('Creamers',                    'breakfast_food', 'sysco',         'pack',   2,  0, NULL),
('Sugar Packs',                 'breakfast_food', 'sysco',         'pack',   1,  0, NULL),
('Sweet N Low',                 'breakfast_food', 'sysco',         'pack',   1,  0, NULL),
('Lipton Tea — Regular',        'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Lipton Tea — Decaf',          'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Fountain Juices',             'breakfast_food', 'sysco',         'case',   1,  0, NULL),
('Swiss Miss Hot Chocolate',    'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Concord Grape Jelly',         'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Jif Creamy Peanut Butter',    'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Mayo — Kraft',                'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Ketchup — Red Gold',          'breakfast_food', 'other',         'pack',   1,  0, NULL),
('Ketchup Bottle',              'breakfast_food', 'other',         'bottle', 1,  0, NULL),
('Mustard Bottle',              'breakfast_food', 'other',         'bottle', 1,  0, NULL),
('Red Hot Frank''s Sauce',      'breakfast_food', 'other',         'bottle', 1,  0, NULL),
('Real Lemon Juice',            'breakfast_food', 'other',         'bottle', 2,  0, NULL),
('Maple Syrup',                 'breakfast_food', 'sysco',         'box',    1,  0, '1 box = 4 units'),
('Bananas',                     'breakfast_food', 'other',         'bundle', 8,  0, '8 bundles'),
('Clementines',                 'breakfast_food', 'other',         'bag',    3,  0, '3 bags'),
('Oatmeal Packets',             'breakfast_food', 'other',         'box',    1,  0, NULL),
('Froot Loops',                 'breakfast_food', 'other',         'box',    1,  0, NULL),
('Honey Bunches Cereal',        'breakfast_food', 'other',         'box',    1,  0, NULL),
('Cheerios',                    'breakfast_food', 'other',         'box',    1,  0, NULL),
('Egg Oaks',                    'breakfast_food', 'sysco',         'pack',   2,  0, '2 packs'),
('Sausage Patties',             'breakfast_food', 'sysco',         'pack',   2,  0, '2 packs'),
('Bagels',                      'breakfast_food', 'sysco',         'pack',   1,  0, NULL),
('Ginger Ale',                  'breakfast_food', 'other',         'case',   1,  0, NULL),
('Coca-Cola Regular',           'breakfast_food', 'other',         'case',   1,  0, NULL),
('Diet Coke',                   'breakfast_food', 'other',         'case',   1,  0, NULL),
('Water',                       'breakfast_food', 'other',         'case',   1,  0, NULL),

-- ── DISPOSABLES ──
('Napkins',                     'disposables',    'other',         'pack',   1,  0, NULL),
('Paper Towels',                'disposables',    'other',         'pack',   1,  0, NULL),
('Waffle/Juice Cups 5oz',       'disposables',    'other',         'pack',   1,  0, NULL),
('8-inch Plates',               'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('6-inch Plates',               'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('Bowls',                       'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('Forks',                       'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('Spoons',                      'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('Knives',                      'disposables',    'webstaurantstore','pack', 2,  0, NULL),
('Coffee Cups',                 'disposables',    'other',         'pack',   1,  0, NULL),
('Lids',                        'disposables',    'other',         'pack',   1,  0, NULL),
('Stirrers',                    'disposables',    'other',         'pack',   1,  0, NULL),
('Filter Paper',                'disposables',    'other',         'pack',   1,  0, NULL),
('Gloves',                      'disposables',    'other',         'pack',   2,  0, 'M and L sizes'),

-- ── ROOM AMENITIES ──
('Soap',                        'room_amenities', 'other',         'pack',   1,  0, NULL),
('Lotion',                      'room_amenities', 'other',         'pack',   1,  0, NULL),
('Shampoo',                     'room_amenities', 'other',         'pack',   1,  0, NULL),
('Conditioner',                 'room_amenities', 'other',         'pack',   1,  0, NULL),
('Facial Tissue',               'room_amenities', 'other',         'pack',   1,  0, NULL),
('Toilet Paper',                'room_amenities', 'other',         'pack',   2,  0, NULL),
('Toothpaste',                  'room_amenities', 'other',         'pack',   1,  0, NULL),
('Toothbrush',                  'room_amenities', 'other',         'pack',   1,  0, NULL),
('Coffee Cups — In Room',       'room_amenities', 'other',         'pack',   1,  0, NULL),
('Ice Bags',                    'room_amenities', 'other',         'pack',   1,  0, NULL),
('Bin Liners',                  'room_amenities', 'other',         'pack',   1,  0, NULL),
('Laundry Bags',                'room_amenities', 'other',         'pack',   1,  0, NULL),
('K Cups',                      'room_amenities', 'other',         'pack',   1,  0, NULL),

-- ── CLEANING SUPPLIES ──
('Glass Cleaner',               'cleaning_supplies','other',       'pack',   2,  0, NULL),
('Febreze',                     'cleaning_supplies','other',       'bottle', 2,  0, NULL),
('Lysol Spray',                 'cleaning_supplies','other',       'bottle', 2,  0, NULL),
('Lysol Liquid',                'cleaning_supplies','other',       'pack',   2,  0, NULL),
('Dryer Sheets',                'cleaning_supplies','other',       'pack',   2,  0, NULL),
('Magic Eraser',                'cleaning_supplies','other',       'pack',   2,  0, NULL),
('Pledge',                      'cleaning_supplies','other',       'bottle', 2,  0, NULL),
('Air Freshener',               'cleaning_supplies','other',       'pack',   1,  0, NULL),
('Bleach',                      'cleaning_supplies','other',       'bottle', 1,  0, NULL),
('Fabuloso',                    'cleaning_supplies','other',       'bottle', 1,  0, NULL),
('Swiffer Pads',                'cleaning_supplies','other',       'pack',   1,  0, NULL),
('Mop Heads',                   'cleaning_supplies','other',       'pack',   1,  0, NULL),
('Garbage Bags',                'cleaning_supplies','other',       'pack',   1,  0, NULL),
('Tide Pods',                   'cleaning_supplies','other',       'pack',   1,  0, NULL),

-- ── FRONT DESK ──
('Pens',                        'front_desk',     'other',         'pack',   1,  0, NULL),
('Sharpie',                     'front_desk',     'other',         'pack',   1,  0, NULL),
('Printer Paper',               'front_desk',     'other',         'ream',   2,  0, NULL),
('Notepad / Post-it',           'front_desk',     'other',         'pack',   1,  0, NULL),
('Toner',                       'front_desk',     'other',         'unit',   1,  0, NULL),
('Staples',                     'front_desk',     'other',         'pack',   1,  0, NULL),
('Envelopes — Cash',            'front_desk',     'other',         'pack',   1,  0, NULL),
('Envelopes — File',            'front_desk',     'other',         'pack',   1,  0, NULL),
('Elastic Bands',               'front_desk',     'other',         'pack',   1,  0, NULL),
('AAA Batteries',               'front_desk',     'other',         'pack',   2,  0, NULL),
('Key Holders',                 'front_desk',     'other',         'pack',   1,  0, NULL)

ON CONFLICT DO NOTHING;
```

---

## 3. BACKEND

### New files:
```
backend/models/inventory.py
backend/routers/inventory.py
```

### Register in `main.py`:
```python
from routers.inventory import router as inventory_router
app.include_router(inventory_router, prefix="/api/inventory")
```

### `backend/models/inventory.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

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
    # computed
    status: Optional[str] = None  # critical / low / ok

class UpdateQuantityRequest(BaseModel):
    current_quantity: float          # new quantity value, must be >= 0
    updated_by: str                  # name of person checking, required
    change_type: str = 'stock_check' # stock_check / restock / adjustment
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
    category: str          # must be one of 5 valid categories
    vendor: str = 'other'
    unit: str = 'pack'
    min_quantity: float = 1
    current_quantity: float = 0
    notes: Optional[str] = None

class MarkOrderedRequest(BaseModel):
    item_ids: list[int]    # list of item IDs to mark as ordered
    updated_by: str

VALID_CATEGORIES = ['breakfast_food','disposables','room_amenities','cleaning_supplies','front_desk']
VALID_VENDORS = ['sysco','costco','webstaurantstore','members_mark','other']

CATEGORY_LABELS = {
    'breakfast_food': 'Breakfast & Food',
    'disposables': 'Disposables & Supplies',
    'room_amenities': 'Room Amenities',
    'cleaning_supplies': 'Cleaning Supplies',
    'front_desk': 'Front Desk & Office'
}

VENDOR_LABELS = {
    'sysco': 'Sysco',
    'costco': 'Costco',
    'webstaurantstore': 'WebstaurantStore',
    'members_mark': "Member's Mark",
    'other': 'Other'
}

def compute_status(current: float, minimum: float) -> str:
    if current <= minimum:
        return 'critical'
    elif current <= minimum * 1.2:
        return 'low'
    return 'ok'
```

### `backend/routers/inventory.py` — All endpoints:

---

#### `GET /api/inventory/items`
Returns all active inventory items with computed status field.
Query params:
- `category`: optional filter
- `vendor`: optional filter  
- `status`: optional filter — `critical`, `low`, `ok`

Response:
```json
{
  "items": [...],
  "summary": {
    "total": 85,
    "critical": 12,
    "low": 5,
    "ok": 68
  }
}
```

Logic: Fetch all where is_active=true, compute status for each, apply filters after computation.

---

#### `GET /api/inventory/alerts`
Returns only critical and low items, grouped by vendor.
Used by home page card and order list tab.

Response:
```json
{
  "critical_count": 12,
  "low_count": 5,
  "by_vendor": {
    "sysco": [{"id":1,"name":"Butter Chips","status":"critical","current_quantity":0,"min_quantity":1,"suggested_order":2}],
    "costco": [...],
    "other": [...]
  }
}
```

---

#### `PATCH /api/inventory/items/{item_id}/quantity`
Staff updates quantity for one item.

Request body:
```json
{"current_quantity": 2, "updated_by": "Maria", "change_type": "stock_check"}
```

Logic:
1. Fetch current item
2. Insert row into inventory_logs with previous_qty, new_qty, change_type, updated_by
3. Update items: current_quantity, last_checked_at=now(), last_checked_by
4. Return updated item with status

Response 200:
```json
{"message": "Updated", "item": {...with status...}}
```

---

#### `POST /api/inventory/items/bulk-update`
Staff submits multiple quantity updates at once (used by stock check page submit).

Request body:
```json
{
  "updates": [
    {"item_id": 1, "current_quantity": 2, "updated_by": "Maria"},
    {"item_id": 5, "current_quantity": 0, "updated_by": "Maria"}
  ],
  "updated_by": "Maria"
}
```

Logic: Loop through updates, apply each, log each. Return summary.

Response 201:
```json
{"message": "15 items updated", "updated_count": 15}
```

---

#### `POST /api/inventory/items/mark-ordered`
Admin marks items as ordered (resets urgency temporarily by setting current_quantity to min_quantity).

Request body:
```json
{"item_ids": [1, 5, 12], "updated_by": "Admin"}
```

Logs each as change_type='order_placed'.

Response 200:
```json
{"message": "3 items marked as ordered"}
```

---

#### `GET /api/inventory/history`
Returns last 50 log entries across all items, joined with item name.

Response:
```json
{
  "logs": [
    {
      "id": 1,
      "item_id": 5,
      "item_name": "Butter Chips",
      "category": "breakfast_food",
      "previous_qty": 0,
      "new_qty": 2,
      "change_type": "restock",
      "updated_by": "Maria",
      "created_at": "..."
    }
  ]
}
```

---

#### `POST /api/inventory/items`
Admin adds a new item.

Request body: CreateItemRequest
Response 201: created item

---

#### `PATCH /api/inventory/items/{item_id}`
Admin updates item metadata (name, min_quantity, vendor, unit, notes, is_active).

Response 200: updated item

---

## 4. FRONTEND

### New files:
```
frontend/src/hooks/useInventory.ts
frontend/src/pages/admin/InventoryPage.tsx
frontend/src/pages/public/InventoryStockCheckPage.tsx
frontend/src/components/inventory/InventoryItemRow.tsx
frontend/src/components/inventory/OrderListCard.tsx
frontend/src/components/inventory/StockCheckItem.tsx
```

### Add to `App.tsx`:
```tsx
<Route path="/admin/inventory" element={<InventoryPage />} />
<Route path="/inventory" element={<InventoryStockCheckPage />} />
```

### Add to `Sidebar.tsx`:
```tsx
// Nav link after Group Contracts
<NavLink to="/admin/inventory" icon={<Package />} label="Inventory" badgeId="inv-badge" />
// Badge shows critical item count — hidden if 0

// Quick links section
<button onClick={() => copyLink('inventory')}>Copy Stock Check Link</button>
// copies window.location.origin + "/inventory"
```

### `useInventory.ts`
```typescript
// React Query hooks
// Query keys: ["inventory-items"], ["inventory-alerts"], ["inventory-history"]
// staleTime: 60000

export function useInventoryItems(category?, vendor?, status?)
export function useInventoryAlerts()
export function useInventoryHistory()
export function useUpdateQuantity()       // PATCH /quantity
export function useBulkUpdate()           // POST /bulk-update
export function useMarkOrdered()          // POST /mark-ordered
export function useAddInventoryItem()     // POST /items
export function useUpdateInventoryItem()  // PATCH /items/{id}
```

Add to `frontend/src/lib/api.ts`:
```typescript
export async function getInventoryItems(category?, vendor?, status?)
export async function getInventoryAlerts()
export async function getInventoryHistory()
export async function updateItemQuantity(itemId, data)
export async function bulkUpdateInventory(updates, updatedBy)
export async function markItemsOrdered(itemIds, updatedBy)
export async function addInventoryItem(data)
export async function updateInventoryItem(itemId, data)
```

Add to `frontend/src/types/index.ts`:
```typescript
export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  vendor: string;
  unit: string;
  min_quantity: number;
  current_quantity: number;
  suggested_order: number;
  notes?: string;
  is_active: boolean;
  last_checked_at?: string;
  last_checked_by?: string;
  status?: 'critical' | 'low' | 'ok';
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: number;
  item_id: number;
  item_name?: string;
  category?: string;
  previous_qty: number;
  new_qty: number;
  change_type: string;
  updated_by?: string;
  notes?: string;
  created_at: string;
}

export interface InventoryAlerts {
  critical_count: number;
  low_count: number;
  by_vendor: Record<string, InventoryItem[]>;
}
```

---

## 5. ADMIN INVENTORY PAGE

### `InventoryPage.tsx`

Topbar title: "Inventory"

3 tabs: "Stock Status" | "Order List" | "History & Analysis"

---

### TAB 1 — Stock Status

Header row: Category filter buttons (All / Breakfast & Food / Disposables / Room Amenities / Cleaning Supplies / Front Desk) | Vendor filter dropdown | Status filter (All / Critical / Low / OK) | "+ Add Item" button

Summary row — 3 mini stat cards:
- 🔴 Critical: X items (red)
- 🟡 Low: X items (yellow)
- 🟢 OK: X items (green)

Item list — grouped by category with collapsible section headers. Each section header shows: category name | count of critical items in red badge.

Each `InventoryItemRow`:
- Status indicator dot (red=critical, yellow=low, green=ok)
- Item name (bold)
- Vendor badge (colored pill: Sysco=blue, Costco=red, WebstaurantStore=purple, Member's Mark=green, Other=gray)
- Current qty display: "{current} {unit}" — red if critical, yellow if low
- Minimum: "min: {min}"
- Last checked: "Checked by {name} {timeAgo}" or "Never checked" in gray
- Edit icon (pencil) — opens inline edit for min_quantity, vendor, unit, notes
- Admin can soft-delete item (set is_active=false) via trash icon with confirmation

Sorting within each category: critical items first, then low, then ok. Alphabetical within same status.

---

### TAB 2 — Order List

This tab auto-generates from critical + low items grouped by vendor.

Header: "Items Needing Reorder" | "Mark All Ordered" button

Per vendor section (only shows vendors that have items needing reorder):

**Vendor header**: Vendor name (large) | "X items to order" | "Mark All [Vendor] as Ordered" button

Per item row (`OrderListCard`):
- Item name | Category badge
- Current: {current} {unit} | Min needed: {min} | Suggested order: {suggested} {unit}
- Status badge (Critical / Low)
- Individual checkbox to select for ordering

Empty state if no items need ordering: large green checkmark + "All stocked up! No items need reordering."

Print button at top — triggers browser print with clean print-only CSS styling.

---

### TAB 3 — History & Analysis

Section 1 — Recent Updates (last 50 logs):
Table with columns: Item | Category | Changed By | Previous → New | Type | Time
Change type badges: "Stock Check" (gray) / "Restock" (green) / "Order Placed" (blue) / "Adjustment" (yellow)

Section 2 — Most Frequently Critical:
Bar chart (Recharts) — X axis = item names (top 10 most-logged critical items), Y axis = times flagged critical. Orange bars. Title: "Items Most Often Running Low".

Section 3 — Last Check Summary:
Table showing each item's last_checked_at and last_checked_by, sorted by oldest check first. Highlights items never checked (null) in red. Helps manager know which areas staff are skipping.

---

## 6. PUBLIC STOCK CHECK PAGE

### `InventoryStockCheckPage.tsx`

**No admin shell. No login. Standalone. Mobile-first design.**

URL: `/inventory`

This page is used by breakfast staff, housekeepers, or front desk to quickly update quantities on their phone.

---

### Layout:

**Header**:
- "CASCO BAY HOTEL" — Playfair Display, centered
- "Stock Check" subtitle
- Today's date pill (orange/yellow gradient)

**Step 1 — Name entry** (shown until name submitted):
White card. "Your Name" label. Text input, placeholder "Enter your name".
"Start Stock Check" orange button.

**Step 2 — Category selection** (shown after name):
"Good morning, {name}!" greeting.
5 large category buttons, each full width, with icon and count of items:
- 🍳 Breakfast & Food (X items)
- 🥤 Disposables & Supplies (X items)
- 🛁 Room Amenities (X items)
- 🧹 Cleaning Supplies (X items)
- 📋 Front Desk & Office (X items)

Each button shows a small red badge if that category has critical items.
Clicking opens that category's stock check list.

**Step 3 — Category stock check** (shown after category selected):
Back button "← All Categories"
Category title

Per item (`StockCheckItem` component):
- Item name (large, bold)
- Vendor badge
- "Current minimum: {min} {unit}" in small gray
- Large quantity input — big number, +/- buttons on each side, easy to tap on mobile
  - "-" button on left (orange outlined, large tap target min 44px)
  - Number display in center (large font, shows current value)
  - "+" button on right (orange outlined, large tap target)
  - Tap number to type directly
- Status indicator: if qty <= min → red "Below Minimum" tag; if qty <= min*1.2 → yellow "Running Low" tag; otherwise green "OK" tag — updates live as they change the number
- Notes field (small, optional, placeholder "Any notes...")

At bottom of category list:
"Save {category} Updates" button — large orange, full width, disabled until at least 1 quantity was changed.

On save: calls POST /api/inventory/items/bulk-update with all changed items + name. Shows success toast "✓ {n} items saved". Returns to category selection. Shows green checkmark on that category button.

**Progress indicator**: at top of Step 2, show how many categories have been checked today (based on last_checked_at for items in that category). "2 of 5 categories checked today".

**If all 5 categories checked**: show completion screen similar to checklist page. "All done! Stock check complete."

---

### Mobile UX rules for this page:
- Minimum tap target 44px for all buttons
- +/- buttons must be at least 48px wide
- Font size minimum 16px for inputs (prevents iOS zoom)
- Generous padding between items (min 16px)
- Sticky "Save" button at bottom of screen on mobile
- No horizontal scroll anywhere

---

## 7. HOME PAGE UPDATE

Update `frontend/src/pages/admin/HomePage.tsx`:

Add inventory alerts card — **only render if critical_count + low_count > 0** (completely hidden if all stocked).

Card shows:
- Title "Inventory Alerts" | "View Inventory →" link to /admin/inventory
- Two rows:
  - 🔴 "{critical_count} items critically low — order now" (red text, only if > 0)
  - 🟡 "{low_count} items running low" (yellow text, only if > 0)
- Below: top 3 critical items by name as small gray text
- Click on card navigates to /admin/inventory

Also add to Alerts & Notices logic:
- If critical_count > 0: orange alert "⚠ {n} inventory item(s) critically low — check Order List"

Fetch from useInventoryAlerts().

---

## 8. CLAUDE CODE PROMPT

```
Read the file INVENTORY_SCHEMA.md completely before writing any code.

Add the Inventory Management module to the existing CascoBay HMS. This is an ADDENDUM — do not modify or break any existing functionality.

Follow these steps in order:

1. Create supabase/migrations/004_inventory.sql with the full SQL including all seed data items
2. Create backend/models/inventory.py with all Pydantic models and constants
3. Create backend/routers/inventory.py with all 8 endpoints
4. Register the inventory router in backend/main.py
5. Add all TypeScript types to frontend/src/types/index.ts
6. Add all API functions to frontend/src/lib/api.ts
7. Create frontend/src/hooks/useInventory.ts
8. Create frontend/src/components/inventory/InventoryItemRow.tsx
9. Create frontend/src/components/inventory/OrderListCard.tsx
10. Create frontend/src/components/inventory/StockCheckItem.tsx — mobile-first, large tap targets, +/- buttons minimum 48px wide, font size minimum 16px on inputs
11. Create frontend/src/pages/admin/InventoryPage.tsx with 3 tabs
12. Create frontend/src/pages/public/InventoryStockCheckPage.tsx — standalone public page, no admin shell, mobile-first design throughout
13. Update frontend/src/pages/admin/HomePage.tsx — add conditional inventory alerts card (hidden if no alerts)
14. Add Inventory nav link and quick link to frontend/src/components/layout/Sidebar.tsx
15. Add routes /admin/inventory and /inventory to frontend/src/App.tsx

Critical requirements:
- The public stock check page must be fully usable on mobile — large buttons, large text, easy +/- controls
- The order list must group items by vendor (Sysco items together, Costco together, etc.)
- Status (critical/low/ok) must be computed: critical = current <= min, low = current <= min*1.2, ok = current > min*1.2
- All 85 seed items must be inserted via the SQL migration
- Use existing design system colors and Tailwind classes throughout
- Do not install any new npm packages
- Commit and push all changes to GitHub when complete
```