# HOUSEKEEPING MODULE — Feature Addition Schema
## Addendum to CascoBay HMS SCHEMA.md

> **Purpose**: Add a complete Housekeeping module to the existing CascoBay HMS. This is an ADDENDUM — do not touch any existing code unless explicitly stated. Add new files, new routes, new components, and new DB tables only.

---

## TABLE OF CONTENTS

1. [Feature Overview](#1-feature-overview)
2. [Database Schema — New Tables](#2-database-schema)
3. [Supabase SQL Migration](#3-supabase-sql-migration)
4. [Backend — New Routes](#4-backend-new-routes)
5. [Frontend — New Pages & Components](#5-frontend-new-pages--components)
6. [Business Logic & Rules](#6-business-logic--rules)
7. [Claude Code Prompt](#7-claude-code-prompt)

---

## 1. FEATURE OVERVIEW

### Three new surfaces:

| Surface | Who uses it | Access |
|---------|-------------|--------|
| Housekeeping Admin Tab | Hotel manager | Existing admin dashboard (new sidebar nav item) |
| Housekeeping Analysis Tab | Hotel manager | Existing admin dashboard (sub-tab) |
| Housekeeper Link | Individual housekeeper | Public shared link `/housekeeping` |

### Admin Tab 1 — "Assignment"
- Text input + Save button to add new housekeeper names (saved to DB)
- Dropdown to select a housekeeper
- Room grid showing all 136 rooms across 4 floors:
  - Floor 1: rooms 101–134
  - Floor 2: rooms 201–234
  - Floor 3: rooms 301–334
  - Floor 4: rooms 401–434
- Each room shows as a checkbox tile
- "Assign Selected" button assigns checked rooms to selected housekeeper
- "Transfer Rooms" section: select source housekeeper → select destination housekeeper → transfer button moves all rooms from source to destination

### Admin Tab 2 — "Overview & Analysis"
- Live dashboard showing all housekeepers and their progress
- Per-housekeeper: assigned count, done count, pending count, completion %, estimated finish time
- Color-coded pace indicator: Fast / On Track / Slow / Not Started
- Room status grid: visual map of all 136 rooms color-coded by status
- Floor-by-floor breakdown
- Today's completion timeline (who finished what and when)

### Housekeeper Public Link (`/housekeeping`)
- Dropdown: "Select your name" — lists all housekeepers from DB
- Once selected: shows only their assigned rooms for today
- Each room shows as a toggle card (Pending → Done)
- Progress bar showing X/Y rooms done
- No login required

---

## 2. DATABASE SCHEMA

### 2.1 Table: `housekeepers`

**Purpose**: Stores housekeeper names. Admin adds them via the admin panel.

```sql
CREATE TABLE housekeepers (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `name` | TEXT UNIQUE | Housekeeper's full name |
| `is_active` | BOOLEAN | Soft delete — inactive housekeepers hidden from dropdown |
| `created_at` | TIMESTAMPTZ | When they were added |

---

### 2.2 Table: `room_assignments`

**Purpose**: Tracks which housekeeper is assigned to which room for each day. One row per room per day.

```sql
CREATE TABLE room_assignments (
  id                BIGSERIAL PRIMARY KEY,
  date              DATE        NOT NULL,
  room_number       TEXT        NOT NULL,
  floor             INTEGER     NOT NULL,
  housekeeper_id    BIGINT      NOT NULL REFERENCES housekeepers(id),
  status            TEXT        NOT NULL DEFAULT 'pending',
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_per_day UNIQUE (date, room_number),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'done'))
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `date` | DATE | The date this assignment is for (always today when assigned) |
| `room_number` | TEXT | Room number e.g. `"101"`, `"234"` |
| `floor` | INTEGER | Floor number: 1, 2, 3, or 4 |
| `housekeeper_id` | BIGINT FK | References `housekeepers.id` |
| `status` | TEXT | `pending` / `in_progress` / `done` |
| `assigned_at` | TIMESTAMPTZ | When admin assigned this room |
| `started_at` | TIMESTAMPTZ | When housekeeper marked in_progress (future use) |
| `completed_at` | TIMESTAMPTZ | When housekeeper marked done |
| `updated_at` | TIMESTAMPTZ | Auto-updated on any change |

**Indexes**:
```sql
CREATE INDEX idx_room_assignments_date          ON room_assignments(date);
CREATE INDEX idx_room_assignments_housekeeper   ON room_assignments(housekeeper_id);
CREATE INDEX idx_room_assignments_date_hk       ON room_assignments(date, housekeeper_id);
CREATE INDEX idx_room_assignments_status        ON room_assignments(status);
```

**UNIQUE constraint** `(date, room_number)`: A room can only be assigned to one housekeeper per day. If admin re-assigns, it UPSERTs (updates the housekeeper_id on the existing row).

---

### 2.3 Room Number Reference

All valid rooms (136 total):

| Floor | Rooms | Count |
|-------|-------|-------|
| 1 | 101, 102, 103 ... 134 | 34 |
| 2 | 201, 202, 203 ... 234 | 34 |
| 3 | 301, 302, 303 ... 334 | 34 |
| 4 | 401, 402, 403 ... 434 | 34 |

Generate programmatically:
```python
ALL_ROOMS = []
for floor in [1, 2, 3, 4]:
    for room in range(1, 35):
        ALL_ROOMS.append({"room_number": f"{floor}{room:02d}", "floor": floor})
```

---

## 3. SUPABASE SQL MIGRATION

**File**: `supabase/migrations/002_housekeeping.sql`

Run this in Supabase SQL Editor AFTER the initial schema (001).

```sql
-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Housekeeping Module Migration
-- ══════════════════════════════════════════════════════

-- ── TABLE: housekeepers ──
CREATE TABLE IF NOT EXISTS housekeepers (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_housekeeper_name UNIQUE (name)
);

-- ── TABLE: room_assignments ──
CREATE TABLE IF NOT EXISTS room_assignments (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE        NOT NULL,
  room_number     TEXT        NOT NULL,
  floor           INTEGER     NOT NULL,
  housekeeper_id  BIGINT      NOT NULL REFERENCES housekeepers(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending',
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_per_day UNIQUE (date, room_number),
  CONSTRAINT valid_room_status CHECK (status IN ('pending', 'in_progress', 'done'))
);

-- ── INDEXES ──
CREATE INDEX IF NOT EXISTS idx_room_assignments_date
  ON room_assignments(date);

CREATE INDEX IF NOT EXISTS idx_room_assignments_housekeeper
  ON room_assignments(housekeeper_id);

CREATE INDEX IF NOT EXISTS idx_room_assignments_date_hk
  ON room_assignments(date, housekeeper_id);

CREATE INDEX IF NOT EXISTS idx_room_assignments_status
  ON room_assignments(status);

-- ── TRIGGER: auto-update updated_at ──
CREATE TRIGGER room_assignments_updated_at
  BEFORE UPDATE ON room_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Note: update_updated_at_column() already exists from migration 001

-- ── ROW LEVEL SECURITY ──
ALTER TABLE housekeepers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

-- housekeepers: public read (housekeeper dropdown), anon write (admin adds via backend)
CREATE POLICY "anon_select_housekeepers"
  ON housekeepers FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_housekeepers"
  ON housekeepers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_housekeepers"
  ON housekeepers FOR UPDATE TO anon USING (true);

-- room_assignments: full anon access (housekeeper marks done, admin assigns)
CREATE POLICY "anon_select_room_assignments"
  ON room_assignments FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_room_assignments"
  ON room_assignments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_room_assignments"
  ON room_assignments FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_delete_room_assignments"
  ON room_assignments FOR DELETE TO anon USING (true);

-- ── REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE room_assignments;

-- ── SAMPLE DATA (delete after testing) ──
INSERT INTO housekeepers (name) VALUES
  ('Maria Garcia'),
  ('James Wilson'),
  ('Sarah Johnson')
ON CONFLICT (name) DO NOTHING;
```

---

## 4. BACKEND — NEW ROUTES

### 4.1 New files to create:

```
backend/models/housekeeping.py
backend/routers/housekeeping.py
```

### 4.2 Register in `main.py` — ADD this line (do not remove existing lines):
```python
from routers.housekeeping import router as housekeeping_router
app.include_router(housekeeping_router, prefix="/api/housekeeping")
```

---

### 4.3 `backend/models/housekeeping.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class Housekeeper(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

class CreateHousekeeperRequest(BaseModel):
    name: str   # min 2 chars, max 50 chars, strip whitespace

class RoomAssignment(BaseModel):
    id: int
    date: str
    room_number: str
    floor: int
    housekeeper_id: int
    housekeeper_name: Optional[str] = None   # joined from housekeepers table
    status: str
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    updated_at: datetime

class AssignRoomsRequest(BaseModel):
    date: str               # "YYYY-MM-DD" — must be today
    housekeeper_id: int
    room_numbers: list[str] # list of room numbers to assign e.g. ["101","102","201"]

class TransferRoomsRequest(BaseModel):
    date: str               # "YYYY-MM-DD"
    from_housekeeper_id: int
    to_housekeeper_id: int
    room_numbers: list[str] # if empty list, transfer ALL rooms from source housekeeper

class UpdateRoomStatusRequest(BaseModel):
    status: str             # must be: pending, in_progress, done

class HousekeeperProgress(BaseModel):
    housekeeper_id: int
    housekeeper_name: str
    assigned: int
    done: int
    pending: int
    in_progress: int
    completion_rate: float
    pace: str               # "fast" | "on_track" | "slow" | "not_started"
    estimated_finish: Optional[str]  # e.g. "2:30 PM" or null

class DailyProgressResponse(BaseModel):
    date: str
    total_rooms: int
    total_assigned: int
    total_done: int
    total_pending: int
    overall_completion_rate: float
    housekeepers: list[HousekeeperProgress]

# Constants
ALL_ROOMS = []
for _floor in [1, 2, 3, 4]:
    for _room in range(1, 35):
        ALL_ROOMS.append({"room_number": f"{_floor}{_room:02d}", "floor": _floor})

VALID_ROOM_NUMBERS = {r["room_number"] for r in ALL_ROOMS}
```

---

### 4.4 `backend/routers/housekeeping.py` — All endpoints:

---

#### `GET /api/housekeeping/housekeepers`

**Purpose**: Get all active housekeepers for dropdowns.

**Response `200`**:
```json
{
  "housekeepers": [
    {"id": 1, "name": "Maria Garcia", "is_active": true, "created_at": "..."},
    {"id": 2, "name": "James Wilson", "is_active": true, "created_at": "..."}
  ]
}
```

**Logic**: SELECT * FROM housekeepers WHERE is_active = true ORDER BY name ASC

---

#### `POST /api/housekeeping/housekeepers`

**Purpose**: Admin adds a new housekeeper.

**Request body**:
```json
{"name": "Maria Garcia"}
```

**Validation**:
- name length must be 2–50 characters after stripping whitespace
- Return `409` if name already exists: `{"detail": "Housekeeper with this name already exists"}`

**Response `201`**:
```json
{"message": "Housekeeper added", "housekeeper": {...}}
```

---

#### `DELETE /api/housekeeping/housekeepers/{housekeeper_id}`

**Purpose**: Soft-delete a housekeeper (set is_active = false).

**Response `200`**:
```json
{"message": "Housekeeper deactivated"}
```

---

#### `GET /api/housekeeping/assignments`

**Purpose**: Get all room assignments for a given date with housekeeper names joined.

**Query params**:
- `date`: "YYYY-MM-DD" (defaults to today)
- `housekeeper_id`: optional integer filter

**Response `200`**:
```json
{
  "date": "2025-04-30",
  "assignments": [
    {
      "id": 1,
      "date": "2025-04-30",
      "room_number": "101",
      "floor": 1,
      "housekeeper_id": 1,
      "housekeeper_name": "Maria Garcia",
      "status": "done",
      "assigned_at": "...",
      "completed_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

#### `POST /api/housekeeping/assignments`

**Purpose**: Admin assigns a list of rooms to a housekeeper for today. Uses UPSERT — if a room is already assigned to someone else today, it gets reassigned.

**Request body**:
```json
{
  "date": "2025-04-30",
  "housekeeper_id": 1,
  "room_numbers": ["101", "102", "103", "201"]
}
```

**Validation**:
- `date` must be today or a future date (no past assignments)
- All room_numbers must be in VALID_ROOM_NUMBERS
- `housekeeper_id` must exist in housekeepers table
- room_numbers list must not be empty

**Logic**: For each room_number, compute floor from first digit. UPSERT into room_assignments — if (date, room_number) exists, update housekeeper_id and reset status to 'pending'. If new, insert.

**Response `201`**:
```json
{
  "message": "4 rooms assigned to Maria Garcia",
  "assigned_count": 4
}
```

---

#### `POST /api/housekeeping/assignments/transfer`

**Purpose**: Transfer rooms from one housekeeper to another.

**Request body**:
```json
{
  "date": "2025-04-30",
  "from_housekeeper_id": 1,
  "to_housekeeper_id": 2,
  "room_numbers": []
}
```

**Logic**:
- If `room_numbers` is empty: transfer ALL rooms assigned to `from_housekeeper_id` for that date
- If `room_numbers` is provided: transfer only those specific rooms
- Only transfer rooms with status `pending` or `in_progress` (not `done`)
- UPDATE room_assignments SET housekeeper_id = to_housekeeper_id WHERE date = date AND room_number IN (list) AND housekeeper_id = from_housekeeper_id AND status != 'done'

**Response `200`**:
```json
{
  "message": "12 rooms transferred from Maria Garcia to James Wilson",
  "transferred_count": 12
}
```

---

#### `PATCH /api/housekeeping/assignments/{assignment_id}/status`

**Purpose**: Housekeeper marks a room as done (or admin updates status).

**Request body**:
```json
{"status": "done"}
```

**Logic**:
- If status = "done": set completed_at = now()
- If status = "in_progress": set started_at = now() (if not already set)
- If status = "pending": clear completed_at and started_at

**Response `200`**:
```json
{"message": "Room 101 marked as done", "assignment": {...}}
```

---

#### `GET /api/housekeeping/progress`

**Purpose**: Get today's full progress summary for the analysis tab.

**Query params**:
- `date`: "YYYY-MM-DD" (defaults to today)

**Response `200`**:
```json
{
  "date": "2025-04-30",
  "total_rooms": 136,
  "total_assigned": 80,
  "total_done": 45,
  "total_pending": 35,
  "overall_completion_rate": 56.3,
  "housekeepers": [
    {
      "housekeeper_id": 1,
      "housekeeper_name": "Maria Garcia",
      "assigned": 30,
      "done": 25,
      "pending": 5,
      "in_progress": 0,
      "completion_rate": 83.3,
      "pace": "fast",
      "estimated_finish": "11:45 AM"
    }
  ]
}
```

**Pace logic** (based on current time and completion rate):
- Before 10 AM: `not_started` if 0 done, otherwise `on_track`
- 10 AM – 2 PM: `fast` if >= 70%, `on_track` if >= 40%, `slow` if < 40%
- After 2 PM: `fast` if 100%, `on_track` if >= 70%, `slow` if < 70%
- 0 assigned: `not_started`

**Estimated finish**: Based on current rate (rooms/hour × remaining rooms). Return null if not started or already done.

---

#### `GET /api/housekeeping/timeline`

**Purpose**: Chronological list of room completions today (for analysis tab).

**Query params**:
- `date`: "YYYY-MM-DD" (defaults to today)

**Response `200`**:
```json
{
  "timeline": [
    {
      "room_number": "101",
      "floor": 1,
      "housekeeper_name": "Maria Garcia",
      "completed_at": "2025-04-30T09:15:00Z",
      "time_display": "9:15 AM"
    }
  ]
}
```

**Logic**: SELECT assignments WHERE status = 'done' AND date = today ORDER BY completed_at ASC

---

## 5. FRONTEND — NEW PAGES & COMPONENTS

### 5.1 New files to create:

```
frontend/src/hooks/useHousekeeping.ts
frontend/src/pages/admin/HousekeepingPage.tsx
frontend/src/pages/public/HousekeepingStaffPage.tsx
frontend/src/components/housekeeping/RoomGrid.tsx
frontend/src/components/housekeeping/HousekeeperSelect.tsx
frontend/src/components/housekeeping/ProgressCard.tsx
frontend/src/components/housekeeping/RoomStatusMap.tsx
frontend/src/components/housekeeping/TransferModal.tsx
frontend/src/components/housekeeping/TimelineList.tsx
```

### 5.2 Add to React Router in `App.tsx` (ADD only, do not change existing routes):

```tsx
<Route path="/admin/housekeeping" element={<HousekeepingPage />} />
<Route path="/housekeeping" element={<HousekeepingStaffPage />} />
```

### 5.3 Add to Sidebar in `Sidebar.tsx` (ADD one new nav link under the existing nav items):

```tsx
<NavLink to="/admin/housekeeping" icon={<BedDouble />} label="Housekeeping" badgeId="hk-badge" />
```

Badge shows count of total pending rooms today. Hidden if 0.

Also add to "QUICK LINKS" section:
```tsx
<button onClick={() => copyLink('housekeeping')}>Copy Housekeeping Link</button>
```

---

### 5.4 `useHousekeeping.ts` hook

```typescript
// React Query hooks for housekeeping data
// Query keys:
//   ["housekeepers"]               — list of all active housekeepers
//   ["assignments", date]          — all assignments for a date
//   ["assignments", date, hkId]    — assignments filtered by housekeeper
//   ["hk-progress", date]          — progress summary
//   ["hk-timeline", date]          — completion timeline

// All queries: staleTime 30000

// Mutations:
//   addHousekeeperMutation         — POST /api/housekeeping/housekeepers
//   assignRoomsMutation            — POST /api/housekeeping/assignments
//   transferRoomsMutation          — POST /api/housekeeping/assignments/transfer
//   updateRoomStatusMutation       — PATCH /api/housekeeping/assignments/{id}/status

// Exports:
export function useHousekeepers()
export function useAssignments(date: string, housekeeperId?: number)
export function useHousekeepingProgress(date: string)
export function useHousekeepingTimeline(date: string)
export function useAddHousekeeper()
export function useAssignRooms()
export function useTransferRooms()
export function useUpdateRoomStatus()
```

Add these API functions to `frontend/src/lib/api.ts`:
```typescript
export async function getHousekeepers()
export async function addHousekeeper(name: string)
export async function getAssignments(date: string, housekeeperId?: number)
export async function assignRooms(data: AssignRoomsRequest)
export async function transferRooms(data: TransferRoomsRequest)
export async function updateRoomStatus(assignmentId: number, status: string)
export async function getHousekeepingProgress(date: string)
export async function getHousekeepingTimeline(date: string)
```

Add these types to `frontend/src/types/index.ts`:
```typescript
export interface Housekeeper {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface RoomAssignment {
  id: number;
  date: string;
  room_number: string;
  floor: number;
  housekeeper_id: number;
  housekeeper_name?: string;
  status: 'pending' | 'in_progress' | 'done';
  assigned_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface HousekeeperProgress {
  housekeeper_id: number;
  housekeeper_name: string;
  assigned: number;
  done: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
  pace: 'fast' | 'on_track' | 'slow' | 'not_started';
  estimated_finish: string | null;
}

export interface AssignRoomsRequest {
  date: string;
  housekeeper_id: number;
  room_numbers: string[];
}

export interface TransferRoomsRequest {
  date: string;
  from_housekeeper_id: number;
  to_housekeeper_id: number;
  room_numbers: string[];
}
```

---

### 5.5 `HousekeepingPage.tsx` — Admin page

**Topbar title**: "Housekeeping"

**Tab navigation** (2 tabs): "Assignment" | "Overview & Analysis"

---

#### Tab 1: Assignment

**Layout** (top to bottom):

**Section 1 — Add Housekeeper**
White card. Title "Add Housekeeper". Row: text input (placeholder "Enter full name") + "Add" button. On submit calls `addHousekeeper`. Shows success toast or error if duplicate.

**Section 2 — Assign Rooms**
White card. Title "Assign Rooms".

Row 1: Label "Select Housekeeper" + dropdown (all active housekeepers). Label "Select Floor" + dropdown (All Floors / Floor 1 / Floor 2 / Floor 3 / Floor 4) — filters the room grid below.

Row 2: Room grid (`RoomGrid` component) — shows rooms filtered by selected floor. Each room is a square checkbox tile showing room number. Rooms already assigned to someone else today show in light gray with that person's initials. Rooms assigned to the currently selected housekeeper show in orange. Unassigned rooms show in white/outlined.

Row 3: Selection summary "X rooms selected" + "Assign Selected" button (orange, disabled if no rooms selected or no housekeeper selected) + "Clear Selection" button.

**Section 3 — Transfer Rooms**
White card. Title "Transfer Rooms". 

Row: "From" dropdown (housekeeper) → arrow icon → "To" dropdown (housekeeper) → "Transfer All Pending Rooms" button.

Below: small text showing "X pending rooms will be transferred from [name] to [name]".

On click: calls transfer API with empty room_numbers (transfers all pending). Shows toast with result count.

---

#### Tab 2: Overview & Analysis

**Section 1 — Summary Stats** (4 stat cards in a row):
- Total Assigned Today
- Total Done
- Total Pending
- Overall Completion %

**Section 2 — Housekeeper Progress Cards**
One `ProgressCard` per housekeeper. Each card shows:
- Name (large)
- Pace badge: "🚀 Fast" (green) / "✓ On Track" (yellow) / "⚠ Slow" (red) / "— Not Started" (gray)
- Progress bar: done/assigned
- Numbers: "X done · Y pending · Z in progress"
- Estimated finish time (if calculable)

Cards sorted by: Not Started last, then by completion_rate descending.

**Section 3 — Room Status Map**
`RoomStatusMap` component. Visual grid of ALL 136 rooms. Color coded:
- White/outlined = unassigned
- Light blue = assigned, pending
- Orange = in progress
- Green = done
Grouped by floor with floor labels. Hovering a room shows tooltip: "Room 204 — Maria Garcia — Done at 10:32 AM".

**Section 4 — Completion Timeline**
`TimelineList` component. Chronological list of room completions today. Shows: time | room number | housekeeper name | floor. Most recent at top.

**Section 5 — Floor Breakdown Table**
Table with columns: Floor | Assigned | Done | Pending | Completion %. One row per floor.

---

### 5.6 `HousekeepingStaffPage.tsx` — Public housekeeper page

**No admin shell. Standalone page. No login required.**

**Layout**: Centered, max-width 520px, top padding 40px.

**Header**:
- "CASCO BAY HOTEL" in Playfair Display
- "Housekeeping" subtitle
- Orange/yellow divider

**Step 1 — Name selection** (shown until name is selected):
White card. "Select your name" label. Dropdown of all active housekeepers. "View My Rooms" button.

**Step 2 — Room list** (shown after name selected):
Header row: "Good morning, {name}!" | today's date | "Switch name" link (goes back to step 1)

Progress summary card:
- Large progress bar
- "X of Y rooms completed"
- Percentage

Room list — one card per assigned room:
- Room number (large, bold)
- Floor label ("Floor 2")
- Status toggle button:
  - If pending: orange "Mark Done" button
  - If done: green "✓ Done" with timestamp "Completed at 10:32 AM" + gray "Undo" link
- Rooms sorted: pending first, then done at bottom

On "Mark Done" click: PATCH status to 'done', optimistic update in UI, show success toast.

**If no rooms assigned**: Show empty state — "No rooms assigned yet. Check back after the manager assigns rooms."

---

### 5.7 `RoomGrid` Component

**Props**:
```typescript
interface RoomGridProps {
  floor: number | 'all';
  assignments: RoomAssignment[];        // today's existing assignments
  selectedHousekeeper: Housekeeper | null;
  selectedRooms: string[];              // currently checked rooms
  onToggleRoom: (roomNumber: string) => void;
  onSelectAll: (floor?: number) => void;
  onClearAll: () => void;
}
```

**Appearance**: Grid of room tiles. Each tile is a square ~56px wide. Grouped by floor with floor label header ("Floor 1", "Floor 2" etc). Each tile shows room number. Visual states:
- Unchecked, unassigned: white bg, gray border
- Unchecked, assigned to selected housekeeper: orange bg, white text
- Unchecked, assigned to OTHER housekeeper: gray bg, shows first 2 letters of their name in tiny text, not clickable (or clicking shows toast "Room already assigned to [name]")
- Checked: orange border, orange checkmark overlay

"Select All Floor X" button above each floor group.

---

### 5.8 `ProgressCard` Component

**Props**:
```typescript
interface ProgressCardProps {
  progress: HousekeeperProgress;
}
```

**Appearance**: White card with left border colored by pace (green=fast, yellow=on_track, red=slow, gray=not_started). Name as title. Pace badge. Stats row. Progress bar. Estimated finish.

---

## 6. BUSINESS LOGIC & RULES

### 6.1 Room assignment rules:
- Each room can only be assigned to ONE housekeeper per day (enforced by DB UNIQUE constraint)
- Re-assigning a room via the admin panel moves it to the new housekeeper and resets status to `pending`
- Only `pending` and `in_progress` rooms can be transferred — `done` rooms stay with the housekeeper who completed them
- Admin can assign rooms for today only (date = today enforced in backend)

### 6.2 Pace calculation:
```python
from datetime import datetime

def calculate_pace(assigned: int, done: int, current_hour: int) -> str:
    if assigned == 0:
        return "not_started"
    rate = done / assigned if assigned > 0 else 0
    if current_hour < 10:
        return "not_started" if done == 0 else "on_track"
    elif current_hour < 14:
        if rate >= 0.7: return "fast"
        elif rate >= 0.4: return "on_track"
        else: return "slow"
    else:
        if rate >= 1.0: return "fast"
        elif rate >= 0.7: return "on_track"
        else: return "slow"
```

### 6.3 Estimated finish calculation:
```python
from datetime import datetime, timedelta

def estimate_finish(done: int, assigned: int, first_completion: datetime) -> str | None:
    if done == 0 or assigned == 0:
        return None
    if done == assigned:
        return "Completed"
    elapsed_hours = (datetime.now() - first_completion).total_seconds() / 3600
    rate_per_hour = done / elapsed_hours if elapsed_hours > 0 else 0
    if rate_per_hour == 0:
        return None
    remaining = assigned - done
    hours_left = remaining / rate_per_hour
    finish_time = datetime.now() + timedelta(hours=hours_left)
    return finish_time.strftime("%-I:%M %p")
```

### 6.4 Sidebar badge:
The "Housekeeping" sidebar nav item shows a badge with the count of total pending rooms today. Fetched from `/api/housekeeping/progress`. Hidden if 0 or if no assignments exist yet.

### 6.5 Copy link:
`copyLink('housekeeping')` copies `{base_url}/housekeeping` to clipboard with toast "Housekeeping link copied!".

---

## 7. CLAUDE CODE PROMPT

Paste this exactly into Claude Code:

```
Read the file HOUSEKEEPING_SCHEMA.md completely before writing any code.

Add the Housekeeping module to the existing CascoBay HMS application. This is an ADDENDUM — do not modify or break any existing functionality.

Follow these steps in order:

1. Create backend/models/housekeeping.py with all Pydantic models as defined
2. Create backend/routers/housekeeping.py with all 8 endpoints as defined
3. Register the housekeeping router in backend/main.py
4. Add all new TypeScript types to frontend/src/types/index.ts
5. Add all new API functions to frontend/src/lib/api.ts
6. Create frontend/src/hooks/useHousekeeping.ts
7. Create all housekeeping components in frontend/src/components/housekeeping/
8. Create frontend/src/pages/admin/HousekeepingPage.tsx
9. Create frontend/src/pages/public/HousekeepingStaffPage.tsx
10. Add the new routes to frontend/src/App.tsx
11. Add the Housekeeping nav link and quick link to frontend/src/components/layout/Sidebar.tsx

Use the existing design system (same colors, fonts, card styles, badge styles) from the rest of the application. Do not install any new npm packages. Keep all styling in Tailwind utility classes.
```