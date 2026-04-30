# SCHEMA.md — Casco Bay Hotel Management System
## Complete Technical Specification for Claude Code

> **Purpose**: This file is the single source of truth for building the entire Casco Bay Hotel Management System. Every database table, API route, React component, page, and business rule is defined here. Build the full application strictly from this spec. Do not invent features not listed here. Do not omit features that are listed here.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema (Supabase / PostgreSQL)](#5-database-schema)
6. [Backend — Python FastAPI](#6-backend-python-fastapi)
7. [Frontend — React](#7-frontend-react)
8. [Pages & Routes](#8-pages--routes)
9. [Component Specifications](#9-component-specifications)
10. [Business Logic & Rules](#10-business-logic--rules)
11. [Design System](#11-design-system)
12. [Supabase SQL Migration](#12-supabase-sql-migration)
13. [Build & Run Instructions](#13-build--run-instructions)

---

## 1. PROJECT OVERVIEW

**Application name**: Casco Bay Hotel Management System (CascoBay HMS)

**What it does**: An internal web application for Casco Bay Hotel staff and guests with three distinct user surfaces:

| Surface | Who uses it | How they access it |
|---------|-------------|-------------------|
| Admin Dashboard | Hotel manager/admin | Login with fixed credentials |
| Employee Checklist | Business case employee | Shared public link (no login) |
| Guest Dinner Menu | Hotel guests | Shared public link (no login) |

**Core modules**:
- **Home**: Dashboard with live KPIs, alerts, activity feed
- **Business Case**: Daily task compliance tracking, monthly heatmap, per-task analysis
- **Dinner Menu**: Guest order submission + admin order management
- **Reports**: Analytics, weekly trends, CSV export

**Authentication**:
- Admin login: username `CascoBay`, password `Casco@123` — hardcoded, single user
- Employee checklist and guest dinner menu: public URLs, no authentication required
- Session stored in `localStorage` key `casco_admin_session`

---

## 2. TECH STACK

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| React Router DOM | 6.x | Client-side routing |
| Vite | 5.x | Build tool and dev server |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Utility-first styling |
| @supabase/supabase-js | 2.x | Database client |
| React Query (TanStack Query) | 5.x | Server state management, auto-refetch |
| Recharts | 2.x | Charts (bar chart, line chart) |
| date-fns | 3.x | Date formatting and manipulation |
| React Hot Toast | 2.x | Toast notifications |
| Lucide React | latest | Icons |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| Supabase Python Client | 2.x | Database access |
| Pydantic | 2.x | Request/response validation |
| python-dotenv | 1.x | Environment variable loading |
| uvicorn | 0.29+ | ASGI server |

### Database
| Technology | Purpose |
|-----------|---------|
| Supabase (PostgreSQL 15) | Primary database, Row Level Security, Realtime |

---

## 3. REPOSITORY STRUCTURE

```
cascobay-hms/
├── SCHEMA.md                    ← this file
├── README.md
├── .gitignore
│
├── frontend/                    ← React application
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html               ← Vite entry point
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx             ← React entry, Router setup
│       ├── App.tsx              ← Route definitions
│       ├── index.css            ← Tailwind directives + CSS variables
│       ├── lib/
│       │   ├── supabase.ts      ← Supabase client singleton
│       │   ├── api.ts           ← Axios/fetch wrapper for FastAPI calls
│       │   └── utils.ts         ← Shared utilities (formatDate, timeAgo, etc.)
│       ├── hooks/
│       │   ├── useAuth.ts       ← Admin auth state + login/logout
│       │   ├── useTasks.ts      ← Task completions queries/mutations
│       │   ├── useOrders.ts     ← Dinner orders queries/mutations
│       │   └── useRealtime.ts   ← Supabase Realtime subscription hook
│       ├── types/
│       │   └── index.ts         ← All TypeScript interfaces
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AdminShell.tsx       ← Sidebar + topbar wrapper
│       │   │   ├── Sidebar.tsx          ← Left navigation
│       │   │   ├── Topbar.tsx           ← Top header bar
│       │   │   └── PageWrapper.tsx      ← Consistent page padding/spacing
│       │   ├── ui/
│       │   │   ├── StatCard.tsx         ← KPI stat card
│       │   │   ├── Badge.tsx            ← Status badge/pill
│       │   │   ├── Button.tsx           ← Reusable button
│       │   │   ├── SectionCard.tsx      ← White card container
│       │   │   ├── EmptyState.tsx       ← Empty data placeholder
│       │   │   ├── LoadingSpinner.tsx   ← Spinner component
│       │   │   ├── AlertItem.tsx        ← Alert/notice row
│       │   │   ├── TabNav.tsx           ← Tab navigation bar
│       │   │   └── ProgressBar.tsx      ← Horizontal progress bar
│       │   ├── business/
│       │   │   ├── TaskStatusRow.tsx    ← Single task row (admin view)
│       │   │   ├── HeatmapGrid.tsx      ← Monthly heatmap calendar
│       │   │   ├── AnalysisTable.tsx    ← Per-task frequency table
│       │   │   └── HistoryChart.tsx     ← 7-day bar chart
│       │   ├── dinner/
│       │   │   ├── OrderCard.tsx        ← Single order card (admin)
│       │   │   ├── OrderStatusSelect.tsx ← Status dropdown
│       │   │   └── PopularItemsChart.tsx ← Popular items bar chart
│       │   └── checklist/
│       │       ├── ChecklistItem.tsx    ← Single task checkbox
│       │       └── SubmitButton.tsx     ← Submit with progress logic
│       └── pages/
│           ├── admin/
│           │   ├── LoginPage.tsx        ← Admin login
│           │   ├── HomePage.tsx         ← Dashboard overview
│           │   ├── BusinessCasePage.tsx ← Task compliance tabs
│           │   ├── DinnerAdminPage.tsx  ← Order management tabs
│           │   └── ReportsPage.tsx      ← Reports and export
│           └── public/
│               ├── ChecklistPage.tsx    ← Employee daily checklist
│               └── DinnerMenuPage.tsx   ← Guest order form
│
├── backend/                     ← Python FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   ├── main.py                  ← FastAPI app, CORS, router registration
│   ├── config.py                ← Settings from env vars (pydantic-settings)
│   ├── database.py              ← Supabase client singleton
│   ├── models/
│   │   ├── task.py              ← Pydantic models for tasks
│   │   └── order.py             ← Pydantic models for orders
│   └── routers/
│       ├── tasks.py             ← /api/tasks routes
│       └── orders.py            ← /api/orders routes
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  ← Full database setup script
```

---

## 4. ENVIRONMENT VARIABLES

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Note**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` (not anon key) so it can bypass RLS for server-side operations. Frontend uses `SUPABASE_ANON_KEY` for direct reads.

---

## 5. DATABASE SCHEMA

### 5.1 Table: `task_completions`

**Purpose**: Stores each daily task check-off submitted by the employee via the checklist page. One row per task per day — when the employee submits, all checked tasks are upserted for that date.

```sql
CREATE TABLE task_completions (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL,
  task_id       TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT true,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_per_day UNIQUE (date, task_id)
);

CREATE INDEX idx_task_completions_date     ON task_completions(date);
CREATE INDEX idx_task_completions_task_id  ON task_completions(task_id);
CREATE INDEX idx_task_completions_date_task ON task_completions(date, task_id);
```

**Column definitions**:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | auto | Primary key, auto-increment |
| `date` | DATE | NO | — | The calendar date this task was completed (e.g. `2025-04-30`) |
| `task_id` | TEXT | NO | — | Identifier for the task. Must be one of the 6 valid task IDs (see section 10.1) |
| `completed` | BOOLEAN | NO | true | Always true when inserted. Reserved for future "uncomplete" feature |
| `submitted_at` | TIMESTAMPTZ | NO | now() | Exact timestamp when the employee clicked submit |

**Valid `task_id` values** (enforced at application layer, not DB constraint):
- `madalia_reviews` — Madalia Online Booking Reviews
- `cvent_rfp` — Cvent RFP
- `business_cases` — Business Cases
- `leisure` — Leisure
- `transient` — Transient
- `reply_reviews` — Reply All Reviews

**Business rules**:
- The UNIQUE constraint on `(date, task_id)` means each task can only be completed once per day
- When employee submits the checklist, backend does DELETE WHERE date = today, then INSERT for all checked tasks (idempotent upsert pattern)
- A "submitted" day means all 6 task_ids exist for that date
- A "partial" day means 1–5 task_ids exist for that date
- An "empty" day means 0 rows exist for that date

---

### 5.2 Table: `dinner_orders`

**Purpose**: Stores every dinner order submitted by guests via the public dinner menu page. Admin can view and update order status.

```sql
CREATE TABLE dinner_orders (
  id              BIGSERIAL PRIMARY KEY,
  room_number     TEXT        NOT NULL,
  guest_initials  TEXT        NOT NULL,
  entree          TEXT        NOT NULL,
  sides           TEXT[]      NOT NULL DEFAULT '{}',
  dessert         TEXT        NOT NULL,
  drink           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'preparing', 'delivered'))
);

CREATE INDEX idx_dinner_orders_submitted_at ON dinner_orders(submitted_at DESC);
CREATE INDEX idx_dinner_orders_status       ON dinner_orders(status);
CREATE INDEX idx_dinner_orders_room         ON dinner_orders(room_number);
```

**Column definitions**:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | auto | Primary key |
| `room_number` | TEXT | NO | — | Hotel room number, entered by guest (e.g. `"204"`) |
| `guest_initials` | TEXT | NO | — | Guest initials, entered by guest (e.g. `"J.S."`) |
| `entree` | TEXT | NO | — | Selected entrée item label (e.g. `"Chicken Fingers"`) |
| `sides` | TEXT[] | NO | `{}` | Array of exactly 2 selected side item labels |
| `dessert` | TEXT | NO | — | Selected dessert item label |
| `drink` | TEXT | NO | — | Selected drink item label |
| `status` | TEXT | NO | `'pending'` | Order lifecycle status. One of: `pending`, `preparing`, `delivered` |
| `notes` | TEXT | YES | NULL | Optional special instructions (future use, show textarea on guest form) |
| `submitted_at` | TIMESTAMPTZ | NO | now() | When the guest submitted the order |
| `updated_at` | TIMESTAMPTZ | NO | now() | Last time status was updated; auto-update via trigger |

**Status lifecycle**:
```
pending → preparing → delivered
```
- `pending`: Order received, kitchen not yet started
- `preparing`: Kitchen is actively preparing the order
- `delivered`: Order has been delivered to the room

**Valid menu item values** (enforced at application layer):

Entrées (pick exactly 1):
- `Chicken Fingers`
- `Crispy Chicken Sandwich`
- `Crispy Chicken Salad`
- `Cheeseburger`
- `Veggie Burger`

Sides (pick exactly 2):
- `Tater Tots / Fries`
- `Steamed Veggies`
- `Side Salad`
- `Potato Chips`
- `Mac & Cheese`

Desserts (pick exactly 1):
- `Cookie / Pastry`
- `Fresh Fruits`
- `Yogurt`

Drinks (pick exactly 1):
- `Water`
- `Soda`
- `Juice`

---

### 5.3 Row Level Security Policies

All tables have RLS enabled. Since both the checklist and dinner menu are public-facing (no Supabase auth), we allow anon access with open policies. The backend service role bypasses RLS entirely.

```sql
-- task_completions: allow anon read + write (public checklist)
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_task_completions"
  ON task_completions FOR SELECT TO anon USING (true);

CREATE POLICY "public_insert_task_completions"
  ON task_completions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_delete_task_completions"
  ON task_completions FOR DELETE TO anon USING (true);

-- dinner_orders: allow anon insert (guest submit) + read/update (admin via backend)
ALTER TABLE dinner_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_dinner_orders"
  ON dinner_orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_read_dinner_orders"
  ON dinner_orders FOR SELECT TO anon USING (true);

CREATE POLICY "public_update_dinner_orders"
  ON dinner_orders FOR UPDATE TO anon USING (true);
```

---

### 5.4 Database Trigger: auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dinner_orders_updated_at
  BEFORE UPDATE ON dinner_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. BACKEND — Python FastAPI

### 6.1 `main.py`

```python
# Responsibilities:
# - Create FastAPI app instance with title "CascoBay HMS API"
# - Configure CORS: allow origins from ALLOWED_ORIGINS env var, allow all methods, allow all headers
# - Include routers: tasks router with prefix "/api/tasks", orders router with prefix "/api/orders"
# - Root GET "/" returns {"status": "ok", "app": "CascoBay HMS"}
# - Health check GET "/health" returns {"status": "healthy"}
# - Run with uvicorn on host 0.0.0.0, port 8000
```

### 6.2 `config.py`

```python
# Uses pydantic-settings BaseSettings
# Fields:
#   supabase_url: str
#   supabase_service_role_key: str
#   allowed_origins: list[str] = ["http://localhost:5173"]
# Loads from .env file
# Singleton: settings = Settings()
```

### 6.3 `database.py`

```python
# Creates Supabase client using settings.supabase_url and settings.supabase_service_role_key
# Uses create_client from supabase library
# Singleton: supabase = create_client(...)
# Export: get_supabase() function that returns the singleton
```

### 6.4 `models/task.py`

```python
# Pydantic models:

class TaskCompletion(BaseModel):
    id: int
    date: date
    task_id: str
    completed: bool
    submitted_at: datetime

class SubmitChecklistRequest(BaseModel):
    date: str          # ISO date string "YYYY-MM-DD"
    task_ids: list[str]  # list of completed task_id values
    # Validation: date must be today's date (cannot submit for past/future dates)
    # Validation: each task_id must be in the VALID_TASK_IDS constant
    # Validation: task_ids list length must be between 1 and 6

class TaskCompletionSummary(BaseModel):
    date: str
    completed_count: int
    total_tasks: int = 6
    task_ids: list[str]
    completion_rate: float  # completed_count / total_tasks * 100

class DateRangeRequest(BaseModel):
    start_date: str    # "YYYY-MM-DD"
    end_date: str      # "YYYY-MM-DD"

# Constant
VALID_TASK_IDS = [
    "madalia_reviews",
    "cvent_rfp", 
    "business_cases",
    "leisure",
    "transient",
    "reply_reviews"
]
```

### 6.5 `models/order.py`

```python
# Pydantic models:

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
    room_number: str        # min 1 char, max 10 chars
    guest_initials: str     # min 1 char, max 15 chars
    entree: str             # must be in VALID_ENTREES
    sides: list[str]        # must have exactly 2 items, each in VALID_SIDES
    dessert: str            # must be in VALID_DESSERTS
    drink: str              # must be in VALID_DRINKS
    notes: Optional[str] = None

class UpdateOrderStatusRequest(BaseModel):
    status: str             # must be one of: pending, preparing, delivered

class OrderSummary(BaseModel):
    total: int
    pending: int
    preparing: int
    delivered: int
    orders: list[DinnerOrder]

# Constants
VALID_ENTREES = ["Chicken Fingers", "Crispy Chicken Sandwich", "Crispy Chicken Salad", "Cheeseburger", "Veggie Burger"]
VALID_SIDES   = ["Tater Tots / Fries", "Steamed Veggies", "Side Salad", "Potato Chips", "Mac & Cheese"]
VALID_DESSERTS = ["Cookie / Pastry", "Fresh Fruits", "Yogurt"]
VALID_DRINKS  = ["Water", "Soda", "Juice"]
```

### 6.6 `routers/tasks.py`

All routes are prefixed with `/api/tasks`.

---

#### `GET /api/tasks/today`

**Purpose**: Get today's task completion status for the admin dashboard and business case page.

**Query params**: none

**Response `200`**:
```json
{
  "date": "2025-04-30",
  "completed_count": 4,
  "total_tasks": 6,
  "completion_rate": 66.7,
  "task_ids": ["madalia_reviews", "cvent_rfp", "business_cases", "leisure"],
  "submitted_at": "2025-04-30T14:32:00Z"
}
```

**Logic**: Query `task_completions` WHERE `date = CURRENT_DATE`. Count distinct `task_id` values. Return summary.

---

#### `GET /api/tasks/date/{date_str}`

**Purpose**: Get task completions for a specific date (used by history view and heatmap).

**Path params**: `date_str` — ISO date string `YYYY-MM-DD`

**Response `200`**:
```json
{
  "date": "2025-04-29",
  "completed_count": 6,
  "total_tasks": 6,
  "completion_rate": 100.0,
  "task_ids": ["madalia_reviews", "cvent_rfp", "business_cases", "leisure", "transient", "reply_reviews"],
  "submitted_at": "2025-04-29T16:15:00Z"
}
```

**Response `404`**: If no records exist for that date, return `{"date": date_str, "completed_count": 0, "total_tasks": 6, "completion_rate": 0.0, "task_ids": [], "submitted_at": null}`

---

#### `GET /api/tasks/range`

**Purpose**: Get task completion data for a date range (used by heatmap and analysis table).

**Query params**:
- `start_date`: ISO date string (e.g. `2025-04-01`)
- `end_date`: ISO date string (e.g. `2025-04-30`)
- Maximum range: 90 days. Return `400` if range exceeds 90 days.

**Response `200`**:
```json
{
  "start_date": "2025-04-01",
  "end_date": "2025-04-30",
  "days": [
    {"date": "2025-04-01", "completed_count": 6, "completion_rate": 100.0, "task_ids": [...]},
    {"date": "2025-04-02", "completed_count": 0, "completion_rate": 0.0,   "task_ids": []},
    ...
  ],
  "summary": {
    "total_days_with_data": 22,
    "fully_completed_days": 18,
    "partial_days": 4,
    "empty_days": 8,
    "overall_completion_rate": 87.3
  }
}
```

**Logic**: Query all rows in date range, group by date, compute counts per date. For dates with no data, include a zero-row in the response. Fill in every calendar day in the range, not just days with data.

---

#### `GET /api/tasks/analysis`

**Purpose**: Per-task frequency analysis for the current month (used by Analysis tab).

**Query params**:
- `month`: `YYYY-MM` format (defaults to current month)

**Response `200`**:
```json
{
  "month": "2025-04",
  "working_days": 22,
  "tasks": [
    {
      "task_id": "madalia_reviews",
      "label": "Madalia Online Booking Reviews",
      "completed_days": 20,
      "missed_days": 2,
      "completion_rate": 90.9,
      "status": "good"
    },
    {
      "task_id": "cvent_rfp",
      "label": "Cvent RFP",
      "completed_days": 12,
      "missed_days": 10,
      "completion_rate": 54.5,
      "status": "fair"
    }
  ]
}
```

**Status logic**:
- `good`: completion_rate >= 80%
- `fair`: completion_rate >= 50% and < 80%
- `low`: completion_rate < 50%

**Working days**: Count distinct dates in the range that have at least 1 task completion row. This represents days the employee actually worked.

---

#### `GET /api/tasks/history`

**Purpose**: Last N days of daily completion summaries (used by 7-day history section).

**Query params**:
- `days`: integer, default 7, max 30

**Response `200`**:
```json
{
  "history": [
    {"date": "2025-04-30", "completed_count": 4, "completion_rate": 66.7, "label": "Today"},
    {"date": "2025-04-29", "completed_count": 6, "completion_rate": 100.0, "label": "Yesterday"},
    {"date": "2025-04-28", "completed_count": 6, "completion_rate": 100.0, "label": "Mon, Apr 28"},
    ...
  ]
}
```

**Label logic**:
- `today` → "Today"
- `yesterday` → "Yesterday"
- older → day abbreviation + date (e.g. `"Mon, Apr 28"`)

---

#### `POST /api/tasks/submit`

**Purpose**: Employee submits their daily checklist. Replaces any existing completions for today.

**Request body**:
```json
{
  "date": "2025-04-30",
  "task_ids": ["madalia_reviews", "cvent_rfp", "business_cases", "leisure", "transient", "reply_reviews"]
}
```

**Validation errors `422`**:
- `date` is not today → `{"detail": "Can only submit for today's date"}`
- Any `task_id` not in VALID_TASK_IDS → `{"detail": "Invalid task_id: xyz"}`
- `task_ids` is empty → `{"detail": "Must submit at least one completed task"}`

**Logic**:
1. DELETE FROM task_completions WHERE date = request.date
2. INSERT rows for each task_id in request.task_ids with submitted_at = now()
3. Return the updated summary

**Response `201`**:
```json
{
  "message": "Checklist submitted successfully",
  "date": "2025-04-30",
  "completed_count": 6,
  "total_tasks": 6,
  "completion_rate": 100.0
}
```

---

### 6.7 `routers/orders.py`

All routes are prefixed with `/api/orders`.

---

#### `GET /api/orders/today`

**Purpose**: Get all dinner orders for today, sorted by submitted_at descending (newest first).

**Query params**:
- `status`: optional filter. One of `pending`, `preparing`, `delivered`. If omitted, return all.

**Response `200`**:
```json
{
  "date": "2025-04-30",
  "total": 3,
  "pending": 1,
  "preparing": 1,
  "delivered": 1,
  "orders": [
    {
      "id": 3,
      "room_number": "204",
      "guest_initials": "J.S.",
      "entree": "Chicken Fingers",
      "sides": ["Tater Tots / Fries", "Side Salad"],
      "dessert": "Cookie / Pastry",
      "drink": "Soda",
      "status": "pending",
      "notes": null,
      "submitted_at": "2025-04-30T18:45:00Z",
      "updated_at": "2025-04-30T18:45:00Z"
    }
  ]
}
```

---

#### `POST /api/orders`

**Purpose**: Guest submits a dinner order from the public menu page.

**Request body**:
```json
{
  "room_number": "204",
  "guest_initials": "J.S.",
  "entree": "Chicken Fingers",
  "sides": ["Tater Tots / Fries", "Side Salad"],
  "dessert": "Cookie / Pastry",
  "drink": "Soda",
  "notes": null
}
```

**Validation errors `422`**:
- `room_number` empty → `{"detail": "Room number is required"}`
- `guest_initials` empty → `{"detail": "Guest initials are required"}`
- `entree` not in VALID_ENTREES → `{"detail": "Invalid entrée selection"}`
- `sides` length != 2 → `{"detail": "Please select exactly 2 sides"}`
- Any side not in VALID_SIDES → `{"detail": "Invalid side selection: xyz"}`
- `dessert` not in VALID_DESSERTS → `{"detail": "Invalid dessert selection"}`
- `drink` not in VALID_DRINKS → `{"detail": "Invalid drink selection"}`

**Response `201`**:
```json
{
  "message": "Order placed successfully",
  "order": { ...full DinnerOrder object... }
}
```

---

#### `PATCH /api/orders/{order_id}/status`

**Purpose**: Admin updates the status of an order (pending → preparing → delivered).

**Path params**: `order_id` — integer

**Request body**:
```json
{
  "status": "preparing"
}
```

**Validation errors**:
- Order not found → `404 {"detail": "Order not found"}`
- Invalid status → `422 {"detail": "Invalid status. Must be: pending, preparing, or delivered"}`

**Response `200`**:
```json
{
  "message": "Order status updated",
  "order": { ...full DinnerOrder object with updated status... }
}
```

---

#### `GET /api/orders/summary`

**Purpose**: Aggregated statistics for the dinner summary tab.

**Query params**: none (always today)

**Response `200`**:
```json
{
  "date": "2025-04-30",
  "total": 5,
  "pending": 2,
  "preparing": 1,
  "delivered": 2,
  "popular_items": {
    "entrees": [
      {"item": "Chicken Fingers", "count": 3, "percentage": 60.0},
      {"item": "Cheeseburger", "count": 2, "percentage": 40.0}
    ],
    "sides": [
      {"item": "Tater Tots / Fries", "count": 4, "percentage": 80.0},
      {"item": "Side Salad", "count": 3, "percentage": 60.0},
      {"item": "Mac & Cheese", "count": 2, "percentage": 40.0}
    ],
    "desserts": [
      {"item": "Cookie / Pastry", "count": 3, "percentage": 60.0}
    ],
    "drinks": [
      {"item": "Soda", "count": 3, "percentage": 60.0},
      {"item": "Water", "count": 2, "percentage": 40.0}
    ]
  }
}
```

**Logic**: Count occurrences of each item across all today's orders. Sort by count descending. Percentage = count / total_orders * 100.

---

#### `GET /api/orders/history`

**Purpose**: Order counts per day for the past N days (used by Reports page chart).

**Query params**:
- `days`: integer, default 7, max 30

**Response `200`**:
```json
{
  "history": [
    {"date": "2025-04-30", "total": 5, "label": "Today"},
    {"date": "2025-04-29", "total": 3, "label": "Yesterday"},
    {"date": "2025-04-28", "total": 4, "label": "Mon, Apr 28"}
  ]
}
```

---

## 7. FRONTEND — React

### 7.1 `src/lib/supabase.ts`

```typescript
// Create and export a single Supabase client instance
// Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from import.meta.env
// Export: export const supabase = createClient(url, key)
```

### 7.2 `src/lib/api.ts`

```typescript
// Base URL from VITE_API_BASE_URL env var (default: http://localhost:8000)
// All functions use fetch() with JSON content-type
// Export these async functions:

// Tasks
export async function getTodayTasks(): Promise<TaskSummary>
export async function getTasksForDate(date: string): Promise<TaskSummary>
export async function getTasksRange(startDate: string, endDate: string): Promise<TaskRangeResponse>
export async function getTaskAnalysis(month: string): Promise<TaskAnalysisResponse>
export async function getTaskHistory(days?: number): Promise<TaskHistoryResponse>
export async function submitChecklist(date: string, taskIds: string[]): Promise<SubmitResponse>

// Orders
export async function getTodayOrders(status?: string): Promise<OrderSummaryResponse>
export async function createOrder(order: CreateOrderRequest): Promise<CreateOrderResponse>
export async function updateOrderStatus(orderId: number, status: string): Promise<UpdateOrderResponse>
export async function getOrderSummary(): Promise<OrderSummaryStats>
export async function getOrderHistory(days?: number): Promise<OrderHistoryResponse>
```

### 7.3 `src/lib/utils.ts`

```typescript
// Utility functions:

export function formatDate(date: Date): string
// Returns: "Wednesday, April 30, 2025"

export function formatShortDate(dateStr: string): string
// "2025-04-30" → "Apr 30"

export function timeAgo(isoString: string): string
// "just now" / "5m ago" / "2h ago" / "Apr 28"

export function getToday(): string
// Returns current date as "YYYY-MM-DD"

export function getMonthRange(yearMonth: string): { start: string, end: string }
// "2025-04" → { start: "2025-04-01", end: "2025-04-30" }

export function getDaysInMonth(year: number, month: number): number

export function getFirstDayOfMonth(year: number, month: number): number
// 0 = Sunday, 1 = Monday, etc.

export function cn(...classes: string[]): string
// Tailwind class merging utility (like clsx)
```

### 7.4 `src/types/index.ts`

```typescript
// All TypeScript interfaces:

export interface TaskCompletion {
  id: number;
  date: string;
  task_id: string;
  completed: boolean;
  submitted_at: string;
}

export interface TaskSummary {
  date: string;
  completed_count: number;
  total_tasks: number;
  completion_rate: number;
  task_ids: string[];
  submitted_at: string | null;
}

export interface TaskRangeDay {
  date: string;
  completed_count: number;
  completion_rate: number;
  task_ids: string[];
}

export interface TaskRangeResponse {
  start_date: string;
  end_date: string;
  days: TaskRangeDay[];
  summary: {
    total_days_with_data: number;
    fully_completed_days: number;
    partial_days: number;
    empty_days: number;
    overall_completion_rate: number;
  };
}

export interface TaskAnalysisItem {
  task_id: string;
  label: string;
  completed_days: number;
  missed_days: number;
  completion_rate: number;
  status: 'good' | 'fair' | 'low';
}

export interface TaskAnalysisResponse {
  month: string;
  working_days: number;
  tasks: TaskAnalysisItem[];
}

export interface DinnerOrder {
  id: number;
  room_number: string;
  guest_initials: string;
  entree: string;
  sides: string[];
  dessert: string;
  drink: string;
  status: 'pending' | 'preparing' | 'delivered';
  notes: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  room_number: string;
  guest_initials: string;
  entree: string;
  sides: string[];
  dessert: string;
  drink: string;
  notes?: string;
}

export interface OrderSummaryResponse {
  date: string;
  total: number;
  pending: number;
  preparing: number;
  delivered: number;
  orders: DinnerOrder[];
}

export interface PopularItem {
  item: string;
  count: number;
  percentage: number;
}

export interface TaskDefinition {
  id: string;
  label: string;
  icon: string;
}

export interface MenuSection {
  key: string;
  label: string;
  rule: string;
  type: 'radio' | 'checkbox';
  max?: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  tag?: string;
}
```

### 7.5 `src/hooks/useAuth.ts`

```typescript
// Custom hook for admin authentication
// State: isAuthenticated (boolean), loaded from localStorage key "casco_admin_session"
// Function login(id: string, password: string): boolean
//   - Returns true if id === "CascoBay" && password === "Casco@123"
//   - On success: sets localStorage "casco_admin_session" = "1"
// Function logout(): void
//   - Removes "casco_admin_session" from localStorage
// Returns: { isAuthenticated, login, logout }
```

### 7.6 `src/hooks/useTasks.ts`

```typescript
// Uses React Query (TanStack Query) for all task data
// Query keys:
//   ["tasks", "today"]
//   ["tasks", "range", startDate, endDate]
//   ["tasks", "analysis", month]
//   ["tasks", "history", days]
// All queries have staleTime: 60000 (1 minute)
// Mutations: submitChecklistMutation — invalidates ["tasks"] query key on success
// Exports:
//   useTodayTasks()
//   useTasksRange(startDate, endDate)
//   useTaskAnalysis(month)
//   useTaskHistory(days)
//   useSubmitChecklist()
```

### 7.7 `src/hooks/useOrders.ts`

```typescript
// Uses React Query for all order data
// Query keys:
//   ["orders", "today", statusFilter]
//   ["orders", "summary"]
//   ["orders", "history", days]
// Orders today: refetchInterval: 30000 (30 seconds auto-refresh)
// Mutations: updateOrderStatusMutation — invalidates ["orders"] on success
// Exports:
//   useTodayOrders(status?: string)
//   useOrderSummary()
//   useOrderHistory(days)
//   useCreateOrder()
//   useUpdateOrderStatus()
```

### 7.8 `src/hooks/useRealtime.ts`

```typescript
// Subscribes to Supabase Realtime for dinner_orders table
// On INSERT to dinner_orders: call onNewOrder callback and show toast notification
// On UPDATE to dinner_orders: call onOrderUpdated callback
// Cleanup: unsubscribe on unmount
// Export: useOrdersRealtime(onNewOrder: (order: DinnerOrder) => void, onOrderUpdated: (order: DinnerOrder) => void)
```

---

## 8. PAGES & ROUTES

### 8.1 React Router Setup (`App.tsx`)

```
/                    → Redirect to /admin if authenticated, else /login
/login               → LoginPage (public)
/admin               → AdminShell (protected, requires auth)
  /admin/            → HomePage
  /admin/business    → BusinessCasePage
  /admin/dinner      → DinnerAdminPage
  /admin/reports     → ReportsPage
/checklist           → ChecklistPage (public, no auth)
/dinner              → DinnerMenuPage (public, no auth)
```

**Route protection**: `AdminShell` checks `useAuth().isAuthenticated`. If false, redirects to `/login`. Public routes (`/checklist`, `/dinner`) are always accessible.

---

### 8.2 LoginPage (`/login`)

**Layout**: Full screen. Black background (`#1A1A1A`). Centered white card. Subtle orange radial glow behind card.

**Card contents** (top to bottom):
1. Hotel name "CASCO BAY HOTEL" in Playfair Display, uppercase, large
2. Subtitle "Management System" in small uppercase spaced letters, gray
3. Orange/yellow gradient divider bar (40px wide, 3px tall, centered)
4. Spacer
5. Label "Staff ID"
6. Text input — `id="login-id"` — placeholder "Enter your staff ID"
7. Label "Password"
8. Password input — `id="login-pw"` — placeholder "Enter your password" — enter key triggers submit
9. Submit button "Sign In to Dashboard" — full width, orange gradient
10. Error message (hidden until failed login) — red background, "Incorrect ID or password. Please try again."

**Behavior**: On submit, call `useAuth().login(id, password)`. If false, show error and clear password field. If true, navigate to `/admin`.

---

### 8.3 AdminShell (`/admin/*`)

**Layout**: Sidebar (240px fixed left) + main content area (fills remaining width).

**Sidebar contents** (top to bottom):
1. Logo area: "CASCO BAY" hotel name, "Hotel Management" subtitle, orange/yellow gradient accent bar
2. Section label "MAIN"
3. Nav link: "Home" (house icon) — `/admin`
4. Nav link: "Business Case" (clipboard icon) — `/admin/business` — shows orange badge "!" if today's tasks are incomplete after 5pm
5. Nav link: "Dinner Menu" (fork-knife icon) — `/admin/dinner` — shows orange badge with count of pending orders (hidden if 0)
6. Section label "INSIGHTS"
7. Nav link: "Reports" (bar-chart icon) — `/admin/reports`
8. Section label "QUICK LINKS"
9. Nav link: "Copy Checklist Link" (link icon) — clicking copies `{base_url}/checklist` to clipboard, shows toast
10. Nav link: "Copy Dinner Menu Link" (link icon) — clicking copies `{base_url}/dinner` to clipboard, shows toast
11. Bottom: "Sign Out" button — calls `logout()` and navigates to `/login`

**Active nav link style**: Orange left border, orange text, light orange background tint.

**Topbar contents**: Hamburger menu (mobile only) | Page title | Today's date in pill

**Mobile**: Sidebar is off-screen by default. Hamburger shows it as overlay with dark backdrop.

---

### 8.4 HomePage (`/admin`)

**Topbar title**: "Dashboard"

**Layout** (top to bottom):

**Row 1 — Stats Grid** (4 columns, 2 columns on mobile):
1. `StatCard` — "Today's Tasks" — value: `X/6` where X = completed_count from `/api/tasks/today` — orange top border
2. `StatCard` — "Dinner Orders Today" — value: total order count from `/api/orders/today` — yellow top border  
3. `StatCard` — "Monthly Compliance" — value: `X%` overall_completion_rate from `/api/tasks/range` for current month — green top border
4. `StatCard` — "Pending Orders" — value: pending count from `/api/orders/today` — red top border

**Row 2 — Two columns** (stacks on mobile):
- Left: `SectionCard` "Alerts & Notices" — renders list of `AlertItem` components based on business rules (see section 10.3)
- Right: `SectionCard` "Recent Activity" — shows last 5 events (order submissions + checklist submissions) with time ago

**Data fetching**: All stats fetched on mount via React Query. Refresh button in topbar (optional).

---

### 8.5 BusinessCasePage (`/admin/business`)

**Topbar title**: "Business Case"

**Tab navigation** (3 tabs):

#### Tab 1: "Today's Status"

**Contents**:
1. `SectionCard` with header: "Daily Task Checklist Status" | badge showing `X/6 completed` (green if 6, yellow if 3–5, orange if 1–2, red if 0) | Refresh button
2. Task rows — one per task — using `TaskStatusRow` component
3. Below task rows: `SectionCard` "Submission History — Last 7 Days" using `HistoryChart` component

#### Tab 2: "Monthly Heatmap"

**Contents**:
1. `SectionCard` with header: "Monthly Task Completion Heatmap" | subtitle "Color intensity = % of tasks completed that day" | Month navigator (left arrow, "Month Year" label, right arrow)
2. Day-of-week labels row: S M T W T F S
3. Heatmap grid — `HeatmapGrid` component
4. Color legend row: None (gray) → partial → partial → full → dark full

**Month navigation**: Clicking arrows changes `currentMonth` state (format `YYYY-MM`). Re-fetches range data for the selected month.

#### Tab 3: "Task Analysis"

**Contents**:
1. `SectionCard` with header: "Task Completion Analysis" | subtitle showing current month name
2. `AnalysisTable` component
3. Below table: summary row showing overall monthly completion rate

---

### 8.6 DinnerAdminPage (`/admin/dinner`)

**Topbar title**: "Dinner Menu"

**Tab navigation** (2 tabs):

#### Tab 1: "Live Orders"

**Header row**: Title "Tonight's Dinner Orders" | subtitle "Auto-refreshes every 30 seconds" | Refresh button | Filter buttons: All / Pending / Preparing / Delivered

**Content**: List of `OrderCard` components. If empty, show `EmptyState` with fork-knife icon and "No orders yet tonight".

**Realtime**: `useOrdersRealtime` hook subscribes to INSERT events. When new order arrives, show toast notification "🍽️ New order — Room {room_number}" and add to list without full refetch.

#### Tab 2: "Summary"

**Top**: Stats row — Total / Pending / Preparing / Delivered counts (4 small stat cards)

**Below**: `SectionCard` "Most Popular Items Tonight" — shows `PopularItemsChart` component with tabs for Entrées / Sides / Desserts / Drinks

---

### 8.7 ReportsPage (`/admin/reports`)

**Topbar title**: "Reports"

**Layout** (top to bottom):

**Row 1 — Two columns**:
- Left: `SectionCard` "Weekly Task Completion" — vertical bar chart (Recharts `BarChart`) showing last 7 days, X axis = day abbreviation, Y axis = completed tasks count (0–6), bar fill = orange gradient
- Right: `SectionCard` "Daily Order Volume" — vertical bar chart (Recharts `BarChart`) showing last 7 days, X axis = day abbreviation, Y axis = order count, bar fill = yellow

**Row 2 — Full width**:
- `SectionCard` "Export Data" — two buttons:
  1. "⬇ Export Task Log (CSV)" — downloads CSV of task_completions
  2. "⬇ Export Order History (CSV)" — downloads CSV of dinner_orders

**CSV columns for task log**: `Date, Task ID, Task Name, Completed, Submitted At`

**CSV columns for order history**: `ID, Room, Initials, Entrée, Sides, Dessert, Drink, Status, Submitted At`

**Data fetching**: `useTaskHistory(7)` and `useOrderHistory(7)` via React Query.

---

### 8.8 ChecklistPage (`/checklist`)

**This page is entirely public. No admin shell. No sidebar. Standalone page.**

**Layout**: Centered single column, max-width 500px, top padding 40px.

**Header** (top to bottom):
1. "CASCO BAY HOTEL" — Playfair Display, uppercase, centered
2. "Daily Business Checklist" — small spaced uppercase subtitle, gray
3. Orange/yellow gradient pill showing today's full date: "Wednesday, April 30, 2025"

**Behavior on load**: 
- Fetch today's completions from `/api/tasks/today`
- If `completed_count === 6` (already fully submitted today), show `SuccessScreen` directly (no checklist shown)
- Otherwise, initialize checkbox state from existing `task_ids` (partial completion persisted in component state only — not re-fetched live)

**Checklist card**:
- White card, rounded corners, drop shadow
- Header row: "TODAY'S TASKS" label in small uppercase gray
- 6 `ChecklistItem` rows (see component spec below)
- Below items: progress text "X of 6 tasks completed" in small gray
- `SubmitButton` — disabled/grayed until all 6 checked, active orange when all checked

**On Submit**:
1. Button shows "Submitting..." and is disabled
2. POST to `/api/tasks/submit` with `{ date: today, task_ids: [all 6 ids] }`
3. On success: replace entire card content with `SuccessScreen`
4. On error: re-enable button, show red error message

**SuccessScreen content**:
1. Green circle with ✅ checkmark (72px)
2. "All done for today!" heading
3. Today's date
4. "All 6 tasks have been checked off. Great work — see you tomorrow!"

---

### 8.9 DinnerMenuPage (`/dinner`)

**This page is entirely public. No admin shell. Standalone page.**

**Layout**: Centered single column, max-width 640px, padding 40px 20px.

**Header**:
1. "CASCO BAY HOTEL" — Playfair Display, large, uppercase, centered
2. "DINNER MENU" — small spaced uppercase subtitle
3. Orange/yellow gradient divider bar (centered, 60px wide)

**Guest info card** (white card):
- Row with 2 inputs side by side (stacks on mobile):
  - "ROOM NUMBER" — text input, placeholder "e.g. 204"
  - "GUEST INITIALS" — text input, placeholder "e.g. J.S."

**4 Menu section cards** (each is a white card):

Card 1 — "Choice of Entrée" — "Pick One" rule — 5 radio options
Card 2 — "Choice of Side" — "Choose Two" rule in orange — 5 checkbox options — max 2 selectable
Card 3 — "Choice of Dessert" — "Pick One" rule — 3 radio options
Card 4 — "Choice of Drink" — "Pick One" rule — 3 radio options

**Veggie Burger** shows a green "V" badge next to its label.

**Menu item interaction**:
- Radio: clicking selects this item and deselects previous
- Checkbox: clicking toggles. If already 2 sides selected and user clicks a 3rd, show toast "You can only choose 2 sides" and do not select
- Selected item shows filled orange indicator (radio circle or checkbox square)

**Validation message area**: red text, shown above submit button if validation fails on submit attempt

**Submit button**: 
- Label "Place My Order"
- Always visible, not disabled (validation happens on click)
- On click: validate all fields → if invalid show inline error → if valid POST to `/api/orders` → on success show `OrderSuccessScreen`

**OrderSuccessScreen** (replaces entire page content):
1. Large orange circle with 🍽️ icon
2. "Order Placed!" in Playfair Display
3. "Room {room} · {initials}"
4. "Your dinner order has been sent to the kitchen. Enjoy your evening at Casco Bay Hotel!"
5. Gray info box: "Questions? Contact the front desk."

---

## 9. COMPONENT SPECIFICATIONS

### 9.1 `StatCard`

**Props**:
```typescript
interface StatCardProps {
  label: string;        // e.g. "Today's Tasks"
  value: string | number; // e.g. "4/6" or 87
  subtext?: string;     // e.g. "2 tasks remaining"
  icon?: string;        // emoji icon
  accentColor: 'orange' | 'yellow' | 'green' | 'red';
  loading?: boolean;
}
```

**Appearance**: White card, rounded-2xl, shadow-sm, top border 3px in accent color. Icon (28px emoji), label (11px uppercase gray), value (36px bold black), subtext (12px gray). Hover lifts slightly.

---

### 9.2 `TaskStatusRow`

**Props**:
```typescript
interface TaskStatusRowProps {
  taskId: string;
  label: string;
  icon: string;
  isDone: boolean;
  submittedAt?: string;   // ISO timestamp
}
```

**Appearance**: Horizontal row with: colored indicator circle (green check or gray circle), emoji icon, task label text, status badge (green "Done" or gray "Pending"), time text ("Checked at 2:30 PM" or "Not yet"). Separated from next row by bottom border.

---

### 9.3 `HeatmapGrid`

**Props**:
```typescript
interface HeatmapGridProps {
  year: number;
  month: number;   // 0-indexed (0 = January)
  data: TaskRangeDay[];
}
```

**Appearance**: 7-column CSS grid. Row of day labels (S M T W T F S). Then day cells. Each cell is a square with rounded corners. Color based on `completion_rate`:
- 0%: gray (`#E8E8E8`)
- 1–49%: light orange (`#FFE4C8`)
- 50–74%: medium orange (`#FFBA7A`)
- 75–99%: orange (`#F47920`)
- 100%: dark orange (`#C95E10`)

Empty cells (before first day of month) are transparent. Future dates are also transparent/empty. Hover shows tooltip: "Apr 15: 5/6 tasks".

---

### 9.4 `AnalysisTable`

**Props**:
```typescript
interface AnalysisTableProps {
  tasks: TaskAnalysisItem[];
  workingDays: number;
}
```

**Appearance**: Full-width table. Columns: Task | Days Completed | Rate | Progress | Status. Header row has gray background. Alternating slight gray tint on rows. Progress column shows orange gradient progress bar (120px wide). Status column shows colored badge (green/yellow/orange).

---

### 9.5 `OrderCard`

**Props**:
```typescript
interface OrderCardProps {
  order: DinnerOrder;
  onStatusChange: (id: number, status: string) => void;
}
```

**Appearance**: White card with border, rounded, subtle shadow on hover. Left side: black square showing "Room" label and room number. Middle: guest initials bold, item summary in gray (e.g. "Chicken Fingers · Tater Tots / Fries · Side Salad · Cookie/Pastry · Soda"), time ago in small gray. Right side: status dropdown select (color-coded border: yellow=pending, orange=preparing, green=delivered).

---

### 9.6 `ChecklistItem`

**Props**:
```typescript
interface ChecklistItemProps {
  taskId: string;
  label: string;
  icon: string;
  isChecked: boolean;
  onToggle: (taskId: string) => void;
}
```

**Appearance**: Full-width clickable row. Circular checkbox indicator (white border when unchecked, green fill + white checkmark when checked). Emoji icon. Task label text (strikethrough + gray when checked). Smooth transition on check/uncheck. Hover shows light gray background.

---

### 9.7 `Badge`

**Props**:
```typescript
interface BadgeProps {
  variant: 'orange' | 'yellow' | 'green' | 'red' | 'gray';
  children: React.ReactNode;
}
```

**Appearance**: Small inline pill. Background is light tint of color. Text is dark shade of color.

---

### 9.8 `AlertItem`

**Props**:
```typescript
interface AlertItemProps {
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  icon?: string;
}
```

**Appearance**: Left-bordered card. warning=orange border+bg, error=red, success=green, info=blue. Icon, title in bold, message in gray.

---

## 10. BUSINESS LOGIC & RULES

### 10.1 Task Definitions (static constant)

Define this in `frontend/src/lib/constants.ts` and also in `backend/models/task.py`:

```typescript
export const TASK_DEFINITIONS: TaskDefinition[] = [
  { id: 'madalia_reviews',  label: 'Madalia Online Booking Reviews',  icon: '⭐' },
  { id: 'cvent_rfp',        label: 'Cvent RFP',                        icon: '📨' },
  { id: 'business_cases',   label: 'Business Cases',                   icon: '💼' },
  { id: 'leisure',          label: 'Leisure',                          icon: '🌴' },
  { id: 'transient',        label: 'Transient',                        icon: '🚗' },
  { id: 'reply_reviews',    label: 'Reply All Reviews',                icon: '💬' },
];
```

### 10.2 Menu Definitions (static constant)

Define this in `frontend/src/lib/constants.ts`:

```typescript
export const MENU_SECTIONS: MenuSection[] = [
  {
    key: 'entree',
    label: 'Choice of Entrée',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'chicken_fingers',        label: 'Chicken Fingers' },
      { id: 'crispy_chicken_sandwich',label: 'Crispy Chicken Sandwich' },
      { id: 'crispy_chicken_salad',   label: 'Crispy Chicken Salad' },
      { id: 'cheeseburger',           label: 'Cheeseburger' },
      { id: 'veggie_burger',          label: 'Veggie Burger', tag: 'V' },
    ]
  },
  {
    key: 'sides',
    label: 'Choice of Side',
    rule: 'Choose Two',
    type: 'checkbox',
    max: 2,
    items: [
      { id: 'tater_tots',     label: 'Tater Tots / Fries' },
      { id: 'steamed_veggies',label: 'Steamed Veggies' },
      { id: 'side_salad',     label: 'Side Salad' },
      { id: 'potato_chips',   label: 'Potato Chips' },
      { id: 'mac_cheese',     label: 'Mac & Cheese' },
    ]
  },
  {
    key: 'dessert',
    label: 'Choice of Dessert',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'cookie_pastry', label: 'Cookie / Pastry' },
      { id: 'fresh_fruits',  label: 'Fresh Fruits' },
      { id: 'yogurt',        label: 'Yogurt' },
    ]
  },
  {
    key: 'drink',
    label: 'Choice of Drink',
    rule: 'Pick One',
    type: 'radio',
    items: [
      { id: 'water', label: 'Water' },
      { id: 'soda',  label: 'Soda' },
      { id: 'juice', label: 'Juice' },
    ]
  }
];
```

### 10.3 Alert Generation Rules (Home Page)

Generate alerts dynamically from fetched data. Show alerts in this priority order:

| Condition | Alert Type | Title | Message |
|-----------|-----------|-------|---------|
| current hour >= 17 AND today's completed_count < 6 | warning | "Tasks incomplete" | "{n} tasks not yet completed today." |
| pending orders > 0 | warning | "Orders waiting" | "{n} dinner order(s) pending preparation." |
| today's completed_count == 6 AND pending == 0 | success | "All clear" | "All tasks done and no pending orders." |
| no data at all | info | "System ready" | "Awaiting today's activity." |

### 10.4 Heatmap Color Scale

| Completion Rate | CSS Color | Description |
|----------------|-----------|-------------|
| No data / future | `transparent` | Empty cell |
| 0% (day exists but 0 tasks) | `#E8E8E8` | Light gray |
| 1–49% | `#FFE4C8` | Light orange |
| 50–74% | `#FFBA7A` | Medium orange |
| 75–99% | `#F47920` | Orange |
| 100% | `#C95E10` | Dark orange |

### 10.5 Analysis Status Thresholds

| Completion Rate | Status Badge |
|----------------|-------------|
| >= 80% | `good` — green badge |
| >= 50% and < 80% | `fair` — yellow badge |
| < 50% | `low` — orange badge |

### 10.6 Order Status Color Codes

| Status | Border/Text Color |
|--------|------------------|
| `pending` | Yellow `#FDB924` |
| `preparing` | Orange `#F47920` |
| `delivered` | Green `#2D8653` |

### 10.7 Auto-refresh Behavior

- Dinner orders on admin page: auto-refresh every 30 seconds via React Query `refetchInterval: 30000`
- Realtime: Supabase Realtime subscription on `dinner_orders` table for INSERT/UPDATE events — immediately updates state without waiting for 30s interval
- Task data: no auto-refresh (manual refresh button only)

### 10.8 Checklist Submission Rules

- Employee can only submit for today's date
- All 6 tasks must be checked to enable submit button
- Submission is idempotent — submitting again replaces existing records for today
- After successful submission, success screen replaces the form
- Page shows success screen immediately on load if today's data already has 6 completions

---

## 11. DESIGN SYSTEM

### 11.1 Color Palette

```css
/* Define in frontend/src/index.css as CSS custom properties */
:root {
  /* Brand colors — Choice Hotels inspired */
  --color-orange:        #F47920;
  --color-orange-dark:   #C95E10;
  --color-orange-light:  #FEF0E6;
  --color-yellow:        #FDB924;
  --color-yellow-light:  #FFF8E7;

  /* Neutrals */
  --color-black:         #1A1A1A;
  --color-gray-dark:     #4A4A4A;
  --color-gray-mid:      #888888;
  --color-gray-light:    #E8E8E8;
  --color-gray-bg:       #F8F7F5;
  --color-white:         #FFFFFF;

  /* Status colors */
  --color-green:         #2D8653;
  --color-green-light:   #E8F5EE;
  --color-red:           #D64045;
  --color-red-light:     #FDEEEE;
  --color-blue:          #1A6FAB;
  --color-blue-light:    #E8F0FB;

  /* Sidebar */
  --color-sidebar-bg:    #1A1A1A;
  --color-sidebar-text:  rgba(255,255,255,0.55);
  --color-sidebar-active-bg: rgba(244,121,32,0.12);
  --color-sidebar-active-text: #F47920;
  --color-sidebar-active-border: #F47920;
}
```

### 11.2 Typography

```css
/* Fonts: import in index.html via Google Fonts */
/* Display: Playfair Display (400, 600, 700) */
/* Body: Source Sans 3 (300, 400, 500, 600) */

.font-display { font-family: 'Playfair Display', serif; }
.font-body    { font-family: 'Source Sans 3', sans-serif; }
```

**Usage**:
- Page titles, hotel name, section headers: Playfair Display
- All body text, labels, inputs, buttons: Source Sans 3

### 11.3 Spacing & Layout

- Sidebar width: 240px (fixed)
- Topbar height: 60px (sticky)
- Page body padding: 28px 32px (desktop), 20px 16px (mobile)
- Card padding: 24px
- Card border-radius: 12px (section cards), 10px (smaller elements)
- Gap between cards: 20px
- Stats grid: 4 columns auto-fit minmax(200px, 1fr)

### 11.4 Tailwind Config Extensions

```typescript
// tailwind.config.ts — extend with custom colors
module.exports = {
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#F47920',
          dark: '#C95E10',
          light: '#FEF0E6',
        },
        yellow: {
          hotel: '#FDB924',
          light: '#FFF8E7',
        },
        brand: {
          black: '#1A1A1A',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      }
    }
  }
}
```

### 11.5 Component Classes (Tailwind patterns)

```
Section card:       bg-white rounded-card shadow-sm border border-gray-100 p-6
Stat card:          bg-white rounded-card shadow-sm border-t-[3px] p-6 hover:-translate-y-0.5 transition-transform
Button primary:     bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2.5 transition-colors
Button outline:     bg-white border border-gray-200 hover:border-orange hover:text-orange font-semibold rounded-[10px] px-4 py-2.5 transition-colors
Input:              w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body
Nav link active:    border-l-[3px] border-orange bg-orange/10 text-orange
Nav link default:   border-l-[3px] border-transparent text-sidebar-text hover:text-white hover:bg-white/5
Badge green:        bg-green-light text-green text-xs font-semibold px-2.5 py-1 rounded-full
Badge orange:       bg-orange-light text-orange-dark text-xs font-semibold px-2.5 py-1 rounded-full
Badge yellow:       bg-yellow-light text-yellow-900 text-xs font-semibold px-2.5 py-1 rounded-full
Badge gray:         bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full
```

---

## 12. SUPABASE SQL MIGRATION

Save this as `supabase/migrations/001_initial_schema.sql`. Run in Supabase SQL Editor.

```sql
-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Initial Database Schema
-- ══════════════════════════════════════════════════════

-- ── TABLE 1: task_completions ──
CREATE TABLE IF NOT EXISTS task_completions (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL,
  task_id       TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT true,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_task_per_day UNIQUE (date, task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_completions_date
  ON task_completions(date);

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id
  ON task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_date_task
  ON task_completions(date, task_id);

-- ── TABLE 2: dinner_orders ──
CREATE TABLE IF NOT EXISTS dinner_orders (
  id              BIGSERIAL PRIMARY KEY,
  room_number     TEXT        NOT NULL,
  guest_initials  TEXT        NOT NULL,
  entree          TEXT        NOT NULL,
  sides           TEXT[]      NOT NULL DEFAULT '{}',
  dessert         TEXT        NOT NULL,
  drink           TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'preparing', 'delivered')
  )
);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_submitted_at
  ON dinner_orders(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_status
  ON dinner_orders(status);

CREATE INDEX IF NOT EXISTS idx_dinner_orders_room
  ON dinner_orders(room_number);

-- ── TRIGGER: auto-update updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dinner_orders_updated_at
  BEFORE UPDATE ON dinner_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ROW LEVEL SECURITY ──
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinner_orders    ENABLE ROW LEVEL SECURITY;

-- task_completions: public read/write (employee checklist has no auth)
CREATE POLICY "anon_select_task_completions"
  ON task_completions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_task_completions"
  ON task_completions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_delete_task_completions"
  ON task_completions FOR DELETE TO anon USING (true);

-- dinner_orders: public insert (guests) + public read/update (admin via backend)
CREATE POLICY "anon_insert_dinner_orders"
  ON dinner_orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_dinner_orders"
  ON dinner_orders FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_dinner_orders"
  ON dinner_orders FOR UPDATE TO anon USING (true);

-- ── SUPABASE REALTIME ──
-- Enable realtime publication for dinner_orders (for live order notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE dinner_orders;
```

---

## 13. BUILD & RUN INSTRUCTIONS

### 13.1 `requirements.txt` (backend)

```
fastapi==0.110.0
uvicorn[standard]==0.29.0
supabase==2.4.0
pydantic==2.6.0
pydantic-settings==2.2.0
python-dotenv==1.0.1
httpx==0.27.0
```

### 13.2 `package.json` (frontend)

```json
{
  "name": "cascobay-hms-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@supabase/supabase-js": "^2.43.0",
    "@tanstack/react-query": "^5.32.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.6.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.378.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

### 13.3 How to run locally

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in Supabase credentials
uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
cp .env.example .env            # fill in Supabase URL + anon key + API URL
npm run dev                     # runs on http://localhost:5173
```

**Access**:
- Admin dashboard: `http://localhost:5173` (login with CascoBay / Casco@123)
- Employee checklist: `http://localhost:5173/checklist`
- Guest dinner menu: `http://localhost:5173/dinner`
- API docs: `http://localhost:8000/docs`

### 13.4 First message to Claude Code

After cloning the repo and adding this SCHEMA.md, use this prompt:

```
Please read SCHEMA.md completely before writing any code. 

Build the full CascoBay Hotel Management System as described. Start with:
1. Set up the repository structure exactly as defined in section 3
2. Configure the backend (FastAPI) with all files in section 6
3. Configure the frontend (React + Vite + Tailwind) with all files in section 7
4. Implement all pages and components as defined in sections 8 and 9
5. Apply the design system from section 11 throughout

Use TypeScript strictly. Use Tailwind utility classes throughout — no raw CSS except for CSS custom property declarations in index.css. Every API call from frontend goes through src/lib/api.ts. Do not use any libraries not listed in section 2.
```

---

*End of SCHEMA.md — CascoBay Hotel Management System*
*Version 1.0 — Generated for Claude Code implementation*