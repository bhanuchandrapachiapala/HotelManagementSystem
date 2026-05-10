# INSPECTION MODULE — Feature Addition Schema
## Addendum to CascoBay HMS SCHEMA.md

> **Purpose**: Add a complete Room Inspection & Issue Tracking module to the existing CascoBay HMS. This is an ADDENDUM — do not touch any existing code unless explicitly stated. Photos are implemented using Supabase Storage (free tier). No issue assignment — issues are tracked at hotel level only.

---

## TABLE OF CONTENTS

1. [Feature Overview](#1-feature-overview)
2. [Database Schema](#2-database-schema)
3. [Supabase SQL Migration](#3-supabase-sql-migration)
4. [Backend Routes](#4-backend-routes)
5. [Frontend Pages & Components](#5-frontend-pages--components)
6. [Business Logic & Rules](#6-business-logic--rules)
7. [Claude Code Prompt](#7-claude-code-prompt)

---

## 1. FEATURE OVERVIEW

### Three surfaces:

| Surface | Who uses it | Access |
|---------|-------------|--------|
| Inspections Admin Tab | Hotel manager | Admin dashboard — new sidebar nav item |
| Inspection Public Link | Inspector (staff) | Public shared link `/inspection` |
| No home dashboard widget | — | Intentionally excluded |

### Admin Tab — 4 sub-tabs:
1. **Live Issues** — all open/in-progress issues sorted by severity
2. **Inspection Log** — all completed inspections with expandable details
3. **Room Status Board** — visual 136-room grid color-coded by inspection status
4. **Analytics** — deep analysis of patterns, durations, issue trends

### Public Inspection Link (`/inspection`):
- Step 1: Select inspector name + room number + inspection type
- Step 2: Overall room condition rating + quick checks
- Step 3: Flag issues (multiple, each with category, severity, description, optional photo)
- Step 4: Review and submit
- Draft auto-saved to localStorage so nothing is lost if phone sleeps
- Professional app-like feel, large tap targets, mobile-first

---

## 2. DATABASE SCHEMA

### 2.1 Table: `inspectors`

```sql
CREATE TABLE inspectors (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_inspector_name UNIQUE (name)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `name` | TEXT UNIQUE | Inspector's full name |
| `is_active` | BOOLEAN | Soft delete — inactive hidden from dropdown |
| `created_at` | TIMESTAMPTZ | When added |

---

### 2.2 Table: `inspections`

```sql
CREATE TABLE inspections (
  id                    BIGSERIAL PRIMARY KEY,
  room_number           TEXT        NOT NULL,
  floor                 INTEGER     NOT NULL,
  inspector_id          BIGINT      NOT NULL REFERENCES inspectors(id),
  inspection_type       TEXT        NOT NULL DEFAULT 'routine',
  overall_cleanliness   INTEGER     CHECK (overall_cleanliness BETWEEN 1 AND 5),
  overall_condition     TEXT        CHECK (overall_condition IN ('excellent','good','fair','poor')),
  quick_checks          JSONB       NOT NULL DEFAULT '{}',
  general_notes         TEXT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at          TIMESTAMPTZ,
  duration_minutes      INTEGER GENERATED ALWAYS AS (
    CASE WHEN submitted_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) / 60
    ELSE NULL END
  ) STORED,
  status                TEXT        NOT NULL DEFAULT 'in_progress',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_inspection_type CHECK (inspection_type IN (
    'routine','post_checkout','post_maintenance','deep_clean','pre_vip'
  )),
  CONSTRAINT valid_inspection_status CHECK (status IN (
    'in_progress','submitted','voided'
  ))
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `room_number` | TEXT | e.g. "204" |
| `floor` | INTEGER | 1–4, derived from room_number first digit |
| `inspector_id` | BIGINT FK | References inspectors.id |
| `inspection_type` | TEXT | routine / post_checkout / post_maintenance / deep_clean / pre_vip |
| `overall_cleanliness` | INTEGER | 1–5 star rating |
| `overall_condition` | TEXT | excellent / good / fair / poor |
| `quick_checks` | JSONB | Boolean map of quick check items (see section 6.2) |
| `general_notes` | TEXT | Free text notes for the whole inspection |
| `started_at` | TIMESTAMPTZ | When inspector tapped "Begin Inspection" |
| `submitted_at` | TIMESTAMPTZ | When inspector tapped "Submit" |
| `duration_minutes` | INTEGER | Computed: submitted_at - started_at in minutes |
| `status` | TEXT | in_progress / submitted / voided |

---

### 2.3 Table: `inspection_issues`

```sql
CREATE TABLE inspection_issues (
  id                BIGSERIAL PRIMARY KEY,
  inspection_id     BIGINT      NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  room_number       TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  severity          TEXT        NOT NULL DEFAULT 'standard',
  location_in_room  TEXT,
  description       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open',
  resolved_by       TEXT,
  resolution_notes  TEXT,
  before_photo_url  TEXT,
  after_photo_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  work_started_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_issue_category CHECK (category IN (
    'cleanliness','maintenance','furniture','plumbing',
    'electrical','hvac','safety','cosmetic'
  )),
  CONSTRAINT valid_issue_severity CHECK (severity IN (
    'urgent','standard','minor','note'
  )),
  CONSTRAINT valid_issue_status CHECK (status IN (
    'open','in_progress','resolved','closed'
  ))
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `inspection_id` | BIGINT FK | References inspections.id |
| `room_number` | TEXT | Denormalized for fast queries |
| `category` | TEXT | cleanliness / maintenance / furniture / plumbing / electrical / hvac / safety / cosmetic |
| `severity` | TEXT | urgent / standard / minor / note |
| `location_in_room` | TEXT | Bathroom / Bedroom / Closet / Entryway / Balcony / Common area |
| `description` | TEXT | What was found |
| `status` | TEXT | open / in_progress / resolved / closed |
| `resolved_by` | TEXT | Name of person who fixed it (free text) |
| `resolution_notes` | TEXT | What was done to fix it |
| `before_photo_url` | TEXT | Supabase Storage URL of issue photo |
| `after_photo_url` | TEXT | Supabase Storage URL of resolution photo |
| `work_started_at` | TIMESTAMPTZ | When fix work began |
| `resolved_at` | TIMESTAMPTZ | When issue was marked resolved |
| `closed_at` | TIMESTAMPTZ | When manager closed/verified |

**SLA targets** (used in analytics):
- `urgent`: resolve within 4 hours
- `standard`: resolve within 24 hours
- `minor`: resolve within 72 hours
- `note`: no SLA

---

### 2.4 Supabase Storage Bucket

Bucket name: `inspection-photos`
Access: Public read, authenticated write (but since we use anon key, set to public)
File path pattern: `{inspection_id}/{issue_id}/{before|after}_{timestamp}.jpg`

---

## 3. SUPABASE SQL MIGRATION

**File**: `supabase/migrations/005_inspections.sql`

```sql
-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Inspection Module Migration
-- ══════════════════════════════════════════════════════

-- ── TABLE: inspectors ──
CREATE TABLE IF NOT EXISTS inspectors (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_inspector_name UNIQUE (name)
);

-- ── TABLE: inspections ──
CREATE TABLE IF NOT EXISTS inspections (
  id                  BIGSERIAL PRIMARY KEY,
  room_number         TEXT        NOT NULL,
  floor               INTEGER     NOT NULL,
  inspector_id        BIGINT      NOT NULL REFERENCES inspectors(id) ON DELETE RESTRICT,
  inspection_type     TEXT        NOT NULL DEFAULT 'routine',
  overall_cleanliness INTEGER     CHECK (overall_cleanliness BETWEEN 1 AND 5),
  overall_condition   TEXT        CHECK (overall_condition IN ('excellent','good','fair','poor')),
  quick_checks        JSONB       NOT NULL DEFAULT '{}',
  general_notes       TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at        TIMESTAMPTZ,
  duration_minutes    NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN submitted_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) / 60.0
    ELSE NULL END
  ) STORED,
  status              TEXT        NOT NULL DEFAULT 'in_progress',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_inspection_type CHECK (inspection_type IN (
    'routine','post_checkout','post_maintenance','deep_clean','pre_vip'
  )),
  CONSTRAINT valid_inspection_status CHECK (status IN (
    'in_progress','submitted','voided'
  ))
);

-- ── TABLE: inspection_issues ──
CREATE TABLE IF NOT EXISTS inspection_issues (
  id                BIGSERIAL PRIMARY KEY,
  inspection_id     BIGINT      NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  room_number       TEXT        NOT NULL,
  category          TEXT        NOT NULL DEFAULT 'maintenance',
  severity          TEXT        NOT NULL DEFAULT 'standard',
  location_in_room  TEXT,
  description       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'open',
  resolved_by       TEXT,
  resolution_notes  TEXT,
  before_photo_url  TEXT,
  after_photo_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  work_started_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_issue_category CHECK (category IN (
    'cleanliness','maintenance','furniture','plumbing',
    'electrical','hvac','safety','cosmetic'
  )),
  CONSTRAINT valid_issue_severity CHECK (severity IN (
    'urgent','standard','minor','note'
  )),
  CONSTRAINT valid_issue_status CHECK (status IN (
    'open','in_progress','resolved','closed'
  ))
);

-- ── INDEXES ──
CREATE INDEX IF NOT EXISTS idx_inspections_room        ON inspections(room_number);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector   ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_started     ON inspections(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status      ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_issues_inspection       ON inspection_issues(inspection_id);
CREATE INDEX IF NOT EXISTS idx_issues_room             ON inspection_issues(room_number);
CREATE INDEX IF NOT EXISTS idx_issues_severity         ON inspection_issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_status           ON inspection_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_created          ON inspection_issues(created_at DESC);

-- ── TRIGGER: auto-update updated_at on issues ──
CREATE TRIGGER inspection_issues_updated_at
  BEFORE UPDATE ON inspection_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ROW LEVEL SECURITY ──
ALTER TABLE inspectors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_inspectors"
  ON inspectors FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_inspections"
  ON inspections FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_inspection_issues"
  ON inspection_issues FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE inspection_issues;

-- ── SUPABASE STORAGE BUCKET ──
-- Run this separately in Supabase dashboard Storage section
-- OR via the Supabase client:
-- Bucket name: inspection-photos
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- ── SAMPLE INSPECTORS ──
INSERT INTO inspectors (name) VALUES
  ('Alex Rivera'),
  ('Jordan Smith'),
  ('Casey Brown')
ON CONFLICT (name) DO NOTHING;
```

---

## 4. BACKEND ROUTES

### New files:
```
backend/models/inspection.py
backend/routers/inspections.py
```

### Register in `main.py`:
```python
from routers.inspections import router as inspections_router
app.include_router(inspections_router, prefix="/api/inspections")
```

---

### `backend/models/inspection.py`

```python
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class Inspector(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime

class CreateInspectorRequest(BaseModel):
    name: str  # min 2 chars, max 50 chars, strip whitespace

class Inspection(BaseModel):
    id: int
    room_number: str
    floor: int
    inspector_id: int
    inspector_name: Optional[str] = None
    inspection_type: str
    overall_cleanliness: Optional[int] = None
    overall_condition: Optional[str] = None
    quick_checks: dict
    general_notes: Optional[str] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    status: str
    issues: Optional[list] = None
    created_at: datetime

class CreateInspectionRequest(BaseModel):
    room_number: str
    inspector_id: int
    inspection_type: str = 'routine'
    # floor computed from room_number first digit

class UpdateInspectionRequest(BaseModel):
    overall_cleanliness: Optional[int] = None
    overall_condition: Optional[str] = None
    quick_checks: Optional[dict] = None
    general_notes: Optional[str] = None

class SubmitInspectionRequest(BaseModel):
    overall_cleanliness: int          # 1-5, required on submit
    overall_condition: str            # required on submit
    quick_checks: dict
    general_notes: Optional[str] = None

class InspectionIssue(BaseModel):
    id: int
    inspection_id: int
    room_number: str
    category: str
    severity: str
    location_in_room: Optional[str] = None
    description: str
    status: str
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    before_photo_url: Optional[str] = None
    after_photo_url: Optional[str] = None
    created_at: datetime
    work_started_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    updated_at: datetime
    # computed
    time_open_hours: Optional[float] = None
    sla_status: Optional[str] = None  # 'within_sla' | 'breached' | 'at_risk'

class CreateIssueRequest(BaseModel):
    inspection_id: int
    room_number: str
    category: str
    severity: str = 'standard'
    location_in_room: Optional[str] = None
    description: str  # min 5 chars
    before_photo_url: Optional[str] = None

class UpdateIssueStatusRequest(BaseModel):
    status: str                         # open / in_progress / resolved / closed
    resolved_by: Optional[str] = None  # required if status = resolved
    resolution_notes: Optional[str] = None
    after_photo_url: Optional[str] = None

class AnalyticsResponse(BaseModel):
    period_days: int
    total_inspections: int
    total_issues: int
    open_issues: int
    urgent_open: int
    avg_inspection_duration: Optional[float]
    avg_resolution_hours_by_severity: dict
    issues_by_category: list
    issues_by_severity: list
    most_problematic_rooms: list
    inspector_stats: list
    sla_compliance: dict
    monthly_trend: list

# Constants
VALID_INSPECTION_TYPES = ['routine','post_checkout','post_maintenance','deep_clean','pre_vip']
VALID_CONDITIONS = ['excellent','good','fair','poor']
VALID_CATEGORIES = ['cleanliness','maintenance','furniture','plumbing','electrical','hvac','safety','cosmetic']
VALID_SEVERITIES = ['urgent','standard','minor','note']
VALID_ISSUE_STATUSES = ['open','in_progress','resolved','closed']

INSPECTION_TYPE_LABELS = {
    'routine': 'Routine Check',
    'post_checkout': 'Post-Checkout',
    'post_maintenance': 'Post-Maintenance',
    'deep_clean': 'Deep Clean',
    'pre_vip': 'Pre-VIP'
}

CATEGORY_LABELS = {
    'cleanliness': 'Cleanliness',
    'maintenance': 'Maintenance',
    'furniture': 'Furniture',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'hvac': 'HVAC',
    'safety': 'Safety',
    'cosmetic': 'Cosmetic'
}

CATEGORY_EMOJIS = {
    'cleanliness': '🧹',
    'maintenance': '🔧',
    'furniture': '🪑',
    'plumbing': '🚿',
    'electrical': '⚡',
    'hvac': '❄️',
    'safety': '🔒',
    'cosmetic': '🎨'
}

SEVERITY_LABELS = {
    'urgent': 'Urgent',
    'standard': 'Standard',
    'minor': 'Minor',
    'note': 'Note'
}

# SLA in hours
SLA_HOURS = {
    'urgent': 4,
    'standard': 24,
    'minor': 72,
    'note': None
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

def compute_sla_status(severity: str, created_at, resolved_at=None) -> str:
    if severity == 'note' or SLA_HOURS.get(severity) is None:
        return 'no_sla'
    from datetime import datetime, timezone
    now = resolved_at or datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours_elapsed = (now - created_at).total_seconds() / 3600
    sla = SLA_HOURS[severity]
    if resolved_at:
        return 'within_sla' if hours_elapsed <= sla else 'breached'
    if hours_elapsed >= sla:
        return 'breached'
    elif hours_elapsed >= sla * 0.75:
        return 'at_risk'
    return 'within_sla'
```

---

### `backend/routers/inspections.py` — All endpoints

All prefixed `/api/inspections`.

---

#### `GET /api/inspections/inspectors`
Returns all active inspectors ordered by name.
```json
{"inspectors": [{"id": 1, "name": "Alex Rivera", ...}]}
```

---

#### `POST /api/inspections/inspectors`
Add new inspector.
Validation: name 2–50 chars, unique.
Returns 201 with created inspector.

---

#### `DELETE /api/inspections/inspectors/{id}`
Soft delete (set is_active = false).

---

#### `POST /api/inspections/start`
Inspector begins an inspection. Records started_at immediately.

Request:
```json
{"room_number": "204", "inspector_id": 1, "inspection_type": "routine"}
```

Logic: compute floor from room_number[0]. Insert inspection with status='in_progress'. Return created inspection.

Response 201:
```json
{"message": "Inspection started", "inspection": {...}}
```

---

#### `PATCH /api/inspections/{inspection_id}`
Update inspection details mid-flow (quick checks, notes, condition ratings).

Request body: UpdateInspectionRequest (all optional).
Returns updated inspection.

---

#### `POST /api/inspections/{inspection_id}/submit`
Inspector submits the completed inspection.

Request body: SubmitInspectionRequest

Logic:
1. Validate inspection exists and status = 'in_progress'
2. Update: overall_cleanliness, overall_condition, quick_checks, general_notes
3. Set submitted_at = now(), status = 'submitted'
4. Return full inspection with issues

Response 201:
```json
{
  "message": "Inspection submitted",
  "inspection": {...},
  "duration_minutes": 8.5,
  "issues_count": 3
}
```

---

#### `POST /api/inspections/{inspection_id}/issues`
Add an issue to an inspection.

Request body: CreateIssueRequest

Logic:
1. Validate inspection exists
2. Insert issue with status='open'
3. Return created issue with computed sla_status and time_open_hours

Response 201: `{"message": "Issue logged", "issue": {...}}`

---

#### `PATCH /api/inspections/issues/{issue_id}/status`
Update issue status (open → in_progress → resolved → closed).

Request body: UpdateIssueStatusRequest

Logic:
- If status = 'in_progress': set work_started_at = now() if not already set
- If status = 'resolved': set resolved_at = now(), require resolved_by, update after_photo_url if provided
- If status = 'closed': set closed_at = now()
- Compute and return sla_status

Response 200: updated issue with sla_status

---

#### `GET /api/inspections/issues/open`
Get all open and in_progress issues across all rooms. Used by Live Issues tab.

Query params:
- `severity`: optional filter
- `room_number`: optional filter
- `category`: optional filter

Response:
```json
{
  "total": 12,
  "urgent": 2,
  "standard": 7,
  "minor": 3,
  "issues": [
    {
      "id": 1,
      "room_number": "204",
      "category": "plumbing",
      "severity": "urgent",
      "description": "Hot water not working",
      "status": "open",
      "time_open_hours": 2.3,
      "sla_status": "at_risk",
      "before_photo_url": "https://...",
      "created_at": "..."
    }
  ]
}
```

Sorted: urgent first, then standard, then minor. Within same severity: oldest first.

---

#### `GET /api/inspections/log`
All submitted inspections with inspector name joined. Paginated.

Query params:
- `limit`: default 20, max 50
- `offset`: default 0
- `room_number`: optional filter
- `inspector_id`: optional filter
- `date_from`: optional
- `date_to`: optional

Response:
```json
{
  "total": 45,
  "inspections": [
    {
      "id": 1,
      "room_number": "204",
      "floor": 2,
      "inspector_name": "Alex Rivera",
      "inspection_type": "post_checkout",
      "overall_cleanliness": 4,
      "overall_condition": "good",
      "duration_minutes": 8.5,
      "submitted_at": "...",
      "issues_count": 2,
      "open_issues_count": 1
    }
  ]
}
```

---

#### `GET /api/inspections/{inspection_id}`
Full inspection detail with all issues and their photos.

Response: full Inspection object + issues array with all fields.

---

#### `GET /api/inspections/room-status`
Summary of latest inspection status per room. Used by Room Status Board.

Response:
```json
{
  "rooms": {
    "101": {
      "room_number": "101",
      "floor": 1,
      "last_inspection_date": "2025-05-07",
      "last_inspection_type": "routine",
      "overall_condition": "good",
      "open_issues": 0,
      "urgent_issues": 0,
      "status": "clear"
    },
    "204": {
      "room_number": "204",
      "floor": 2,
      "last_inspection_date": "2025-05-07",
      "open_issues": 2,
      "urgent_issues": 1,
      "status": "urgent"
    }
  }
}
```

Room status values:
- `never_inspected`: no inspection records
- `clear`: inspected, 0 open issues
- `minor_issues`: only minor/note issues open
- `standard_issues`: standard issues open
- `urgent`: any urgent issue open

---

#### `GET /api/inspections/analytics`
Deep analytics. Used by Analytics tab.

Query params:
- `days`: integer, default 30, max 90

Response:
```json
{
  "period_days": 30,
  "total_inspections": 45,
  "total_issues": 87,
  "open_issues": 12,
  "urgent_open": 2,
  "avg_inspection_duration_minutes": 9.3,
  "avg_resolution_hours_by_severity": {
    "urgent": 3.2,
    "standard": 18.5,
    "minor": 48.0
  },
  "issues_by_category": [
    {"category": "cleanliness", "label": "Cleanliness", "emoji": "🧹", "count": 23, "percentage": 26.4},
    {"category": "maintenance", "label": "Maintenance", "emoji": "🔧", "count": 18, "percentage": 20.7}
  ],
  "issues_by_severity": [
    {"severity": "urgent", "count": 8, "resolved": 6, "sla_met": 5},
    {"severity": "standard", "count": 45, "resolved": 40, "sla_met": 38}
  ],
  "most_problematic_rooms": [
    {"room_number": "204", "floor": 2, "total_issues": 8, "open_issues": 2, "inspection_count": 5}
  ],
  "inspector_stats": [
    {
      "inspector_name": "Alex Rivera",
      "total_inspections": 18,
      "avg_duration_minutes": 8.2,
      "total_issues_found": 34,
      "avg_issues_per_inspection": 1.9
    }
  ],
  "sla_compliance": {
    "urgent": {"total": 8, "within_sla": 5, "compliance_rate": 62.5},
    "standard": {"total": 45, "within_sla": 38, "compliance_rate": 84.4},
    "minor": {"total": 34, "within_sla": 28, "compliance_rate": 82.4}
  },
  "monthly_trend": [
    {"month": "2025-03", "inspections": 12, "issues": 18},
    {"month": "2025-04", "inspections": 16, "issues": 25}
  ]
}
```

---

#### `POST /api/inspections/photos/upload-url`
Generate a Supabase Storage signed upload URL for a photo.

Request:
```json
{"inspection_id": 1, "issue_id": 5, "photo_type": "before", "file_extension": "jpg"}
```

Logic: Generate file path `{inspection_id}/{issue_id}/{photo_type}_{timestamp}.{ext}`. Use Supabase storage client to create a signed URL for upload. Return the URL and the final public URL.

Response:
```json
{
  "upload_url": "https://supabase.co/storage/v1/...",
  "public_url": "https://supabase.co/storage/v1/object/public/inspection-photos/1/5/before_1234567890.jpg"
}
```

---

## 5. FRONTEND PAGES & COMPONENTS

### New files:
```
frontend/src/hooks/useInspections.ts
frontend/src/pages/admin/InspectionsPage.tsx
frontend/src/pages/public/InspectionFormPage.tsx
frontend/src/components/inspections/IssueCard.tsx
frontend/src/components/inspections/RoomStatusGrid.tsx
frontend/src/components/inspections/InspectionLogRow.tsx
frontend/src/components/inspections/SeverityBadge.tsx
frontend/src/components/inspections/AnalyticsCharts.tsx
frontend/src/components/inspections/QuickChecks.tsx
frontend/src/components/inspections/IssueForm.tsx
frontend/src/components/inspections/PhotoUpload.tsx
```

### Add to `App.tsx`:
```tsx
<Route path="/admin/inspections" element={<InspectionsPage />} />
<Route path="/inspection" element={<InspectionFormPage />} />
```

### Add to `Sidebar.tsx`:
```tsx
// Nav link after Inventory
<NavLink to="/admin/inspections" icon={<ClipboardCheck />} label="Inspections" badgeId="insp-badge" />
// Badge shows count of urgent open issues. Hidden if 0.

// Quick links
<button onClick={() => copyLink('inspection')}>Copy Inspection Link</button>
```

---

### `useInspections.ts`

```typescript
// React Query hooks
// Query keys:
//   ["inspectors"]
//   ["open-issues", filters]
//   ["inspection-log", filters]
//   ["inspection", id]
//   ["room-status"]
//   ["inspection-analytics", days]

// staleTime: 30000 for open issues (fast refresh), 60000 for others

export function useInspectors()
export function useOpenIssues(filters?)
export function useInspectionLog(filters?)
export function useInspection(id)
export function useRoomStatus()
export function useInspectionAnalytics(days?)
export function useStartInspection()
export function useUpdateInspection()
export function useSubmitInspection()
export function useAddIssue()
export function useUpdateIssueStatus()
export function useAddInspector()
export function useGetUploadUrl()
```

Add to `frontend/src/types/index.ts`:
```typescript
export interface Inspector {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Inspection {
  id: number;
  room_number: string;
  floor: number;
  inspector_id: number;
  inspector_name?: string;
  inspection_type: string;
  overall_cleanliness?: number;
  overall_condition?: string;
  quick_checks: Record<string, boolean>;
  general_notes?: string;
  started_at: string;
  submitted_at?: string;
  duration_minutes?: number;
  status: string;
  issues?: InspectionIssue[];
  created_at: string;
}

export interface InspectionIssue {
  id: number;
  inspection_id: number;
  room_number: string;
  category: string;
  severity: 'urgent' | 'standard' | 'minor' | 'note';
  location_in_room?: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolved_by?: string;
  resolution_notes?: string;
  before_photo_url?: string;
  after_photo_url?: string;
  created_at: string;
  work_started_at?: string;
  resolved_at?: string;
  closed_at?: string;
  updated_at: string;
  time_open_hours?: number;
  sla_status?: 'within_sla' | 'at_risk' | 'breached' | 'no_sla';
}

export interface RoomInspectionStatus {
  room_number: string;
  floor: number;
  last_inspection_date?: string;
  last_inspection_type?: string;
  overall_condition?: string;
  open_issues: number;
  urgent_issues: number;
  status: 'never_inspected' | 'clear' | 'minor_issues' | 'standard_issues' | 'urgent';
}
```

---

### `InspectionsPage.tsx` — Admin page

Topbar title: "Inspections"

4 tabs: "Live Issues" | "Inspection Log" | "Room Status" | "Analytics"

---

#### Tab 1: Live Issues

**Stats row** (4 StatCards):
- Total Open Issues (accentColor="orange", icon="🔍")
- Urgent (accentColor="red", icon="🔴")
- Standard (accentColor="yellow", icon="🟡")
- Minor (accentColor="blue", icon="🔵")

**Filter bar** inside SectionCard: severity filter buttons (All / Urgent / Standard / Minor) | category dropdown | room number search input

**Issue list** — one `IssueCard` per issue:

`IssueCard` component:
- Left border color: red=urgent, yellow=standard, blue=minor, gray=note
- Top row: `SeverityBadge` | category emoji + category label | room number pill (black bg, white text) | time open ("Open 2h 15m" — red if SLA breached, orange if at_risk, gray if ok)
- Row 2: description text (truncated to 2 lines, expand on click)
- Row 3: location in room (small gray) | inspection type badge
- Row 4: if before_photo_url exists → small thumbnail (click to open full size in modal)
- Bottom row: SLA indicator bar (thin colored progress bar showing % of SLA time elapsed) | status select dropdown (Open / In Progress / Resolved / Closed) | if resolved: "Resolved by {name}" green text
- Expand button → shows resolution section:
  - "Mark as Resolved" form: Resolved by (text input) + Resolution notes + After photo upload + Submit button
  - If already resolved: shows resolved_by, resolution_notes, after_photo_url, resolved_at timestamp, resolution time ("Fixed in 3h 20m")

SLA indicator bar:
- Shows percentage of SLA time elapsed as a horizontal bar
- Color: green if < 50%, yellow if 50-75%, orange if 75-99%, red if >= 100%
- Note text: "4h SLA · 2h 15m elapsed" or "SLA breached — 6h ago"

---

#### Tab 2: Inspection Log

**Filter bar** inside SectionCard: date range inputs | room number search | inspector dropdown | inspection type dropdown

**Log table** inside SectionCard:

Columns: Room | Inspector | Type | Date & Time | Duration | Condition | Issues | Status

Each row `InspectionLogRow`:
- Room number pill (black bg)
- Inspector name
- Inspection type badge (color coded: routine=gray, post_checkout=blue, deep_clean=green, pre_vip=gold, post_maintenance=purple)
- Date and time
- Duration: "8m 30s" — green if < 10min, yellow if 10-20min, red if > 20min (unusually slow)
- Overall condition badge: excellent=green, good=blue, fair=yellow, poor=red
- Issues count: "{n} issues" — red if any urgent, yellow if standard, green if all minor/note, gray if 0
- Status badge

Row click expands inline to show:
- Quick checks grid (12 items with ✓/✗ icons)
- All issues for this inspection listed with their current status
- General notes
- Timeline: "Started {time} · Submitted {time} · Duration {n}m"

**Add Inspector button** at top right — opens small modal with name input.

---

#### Tab 3: Room Status Board

**Legend row**: ⚪ Never Inspected | 🟢 Clear | 🔵 Minor Issues | 🟡 Standard Issues | 🔴 Urgent Issues

`RoomStatusGrid` component — identical layout to housekeeping RoomGrid:
- 4 floor sections with "Floor 1", "Floor 2" etc headers
- Each room tile: 56px square, rounded, room number, colored background
  - `bg-gray-100 text-gray-400` = never inspected
  - `bg-green-100 text-green-700 border border-green-200` = clear
  - `bg-blue-100 text-blue-700 border border-blue-200` = minor issues
  - `bg-yellow-100 text-yellow-700 border border-yellow-200` = standard issues
  - `bg-red-100 text-red-700 border border-red-200` = urgent
- Hover tooltip: "Room {n} · Last inspected {date} · {n} open issues"
- Click: opens room detail slide-over panel showing:
  - Room number large
  - Last inspection details
  - All open issues for this room with full details
  - Full inspection history list (date, type, inspector, condition, issue count)

---

#### Tab 4: Analytics

**Period selector**: Last 7 days / 30 days / 90 days (buttons, default 30)

**Row 1 — Summary stats** (5 StatCards):
- Total Inspections (orange)
- Total Issues Found (red)
- Open Issues (yellow)
- Avg Inspection Time in minutes (green)
- SLA Compliance % (blue)

**Row 2 — Two charts side by side**:
Left: "Issues by Category" — Recharts BarChart, X=category labels, Y=count, orange bars
Right: "Issues by Severity" — Recharts BarChart showing count + resolved + SLA met per severity

**Row 3 — Two charts side by side**:
Left: "Monthly Trend" — Recharts LineChart, two lines: inspections (orange) and issues (red), last 6 months
Right: "SLA Compliance by Severity" — 3 horizontal progress bars (urgent/standard/minor) showing compliance rate %, color coded

**Row 4 — Most Problematic Rooms**:
SectionCard table: Room | Floor | Total Issues | Open Issues | Inspections | Avg Issues/Inspection
Sorted by total_issues descending. Top 10.
Room numbers are clickable — navigates to Room Status tab filtered to that room.

**Row 5 — Inspector Performance**:
SectionCard table: Inspector | Inspections | Avg Duration | Issues Found | Avg Issues/Inspection
Sorted by total_inspections descending.
Duration shown with color coding (fast/normal/slow).

---

### `InspectionFormPage.tsx` — Public page

**No admin shell. Standalone. Mobile-first. Professional inspection app feel.**

URL: `/inspection`

Draft auto-saved to localStorage key `inspection_draft_{room}_{date}` every time anything changes. On page load, check for existing draft and offer to resume.

---

**Header** (fixed at top, doesn't scroll):
- "CASCO BAY HOTEL" in font-display text-lg font-bold uppercase tracking-wider
- "Room Inspection" subtitle
- Progress bar showing current step (4 steps)

---

**Step 1 — Start Inspection**

White card, centered, max-width 480px.

Title: "Begin Room Inspection"

Fields:
- "Your Name" — dropdown of active inspectors. Last option: "+ Add your name" which shows a text input inline.
- "Room Number" — text input, large, placeholder "e.g. 204". Validate: must match format (3 digits, first digit 1-4, last two 01-34).
- "Inspection Type" — large segmented selector (not dropdown), 5 options displayed as tappable pills:
  - Routine Check | Post-Checkout | Post-Maintenance | Deep Clean | Pre-VIP
  - Selected pill: orange bg, white text. Unselected: white bg, gray border.

"Begin Inspection →" orange button, full width, large.

On tap: POST /api/inspections/start → save inspection_id to state and localStorage → advance to Step 2.

---

**Step 2 — Room Condition**

Title: "Room Overview"
Subtitle: "Rate the overall condition before logging specific issues"

Section A — "Overall Cleanliness":
5 large star buttons in a row (⭐). Tapping star N selects 1–N stars. Selected stars are orange, unselected are gray outline. Size: 40px each.

Section B — "Overall Condition":
4 large tappable cards in a row (2x2 on mobile):
- 🟢 Excellent | 🔵 Good | 🟡 Fair | 🔴 Poor
Each card: emoji + label, 80px tall, border. Selected: orange border + orange text.

Section C — "Quick Checks" (`QuickChecks` component):
12 items as a 2-column grid. Each item: toggle switch (same style as housekeeping) + label.
Default: all ON (green). If something is wrong, toggle OFF (red).
Items: Bed Made, Bathroom Clean, Floor Vacuumed, Windows Clean, AC/Heat Working, TV Working, Safe Working, Mini Fridge Working, Towels Stocked, Toiletries Stocked, Door Lock Working, All Lights Working.

"Continue →" button.

On continue: PATCH /api/inspections/{id} with condition data → save to draft → advance to Step 3.

---

**Step 3 — Log Issues**

Title: "Flag Issues"
Subtitle: "Add any problems found. Leave empty if room is perfect."

**Existing issues list**: each added issue shown as a compact card with severity color + category + description + delete button.

**"+ Add Issue" button**: opens `IssueForm` panel below the list:

`IssueForm` component:
- Category selector: 8 large icon+label buttons in a grid (2x4), each 70px tall:
  🧹 Cleanliness | 🔧 Maintenance | 🪑 Furniture | 🚿 Plumbing
  ⚡ Electrical | ❄️ HVAC | 🔒 Safety | 🎨 Cosmetic
  Selected: orange background

- Severity selector: 4 horizontal pills:
  🔴 Urgent | 🟡 Standard | 🔵 Minor | 📝 Note
  With subtitle under each:
  "Fix before next check-in" | "Fix within 24h" | "Fix when possible" | "Record only"

- Location in room: dropdown (Bathroom / Bedroom / Closet / Entryway / Balcony / Other)

- Description: large textarea, placeholder "Describe what you found...", min 5 chars

- Photo (`PhotoUpload` component):
  - Large dashed border box with camera icon: "Tap to take photo or upload"
  - On tap: opens device camera or file picker
  - After selection: shows thumbnail with remove button
  - Upload: POST to /api/inspections/photos/upload-url to get signed URL, then PUT to that URL
  - Stores public_url in state for submission

- "Add Issue" button → calls POST /api/inspections/{id}/issues → adds to list → collapses form

- "Skip — No Issues" link below the issue list if no issues added yet

---

**Step 4 — Review & Submit**

Title: "Review Inspection"

Summary card:
- Room number (large)
- Inspector name
- Inspection type badge
- Overall condition + cleanliness stars
- Quick checks summary: "{n}/12 passed" with green checkmark or "{n} failed" with red X

Issues summary:
- Count by severity with colored badges
- List of all issues with category emoji + description + severity badge
- If any urgent issues: red warning box "⚠ {n} urgent issue(s) flagged — management will be notified"

General notes textarea (optional final notes).

"Submit Inspection" orange button, full width, large.

On submit: POST /api/inspections/{id}/submit → clear localStorage draft → show Success screen.

**Success screen**:
- Large green checkmark in circle
- "Inspection Complete!"
- Room number + inspector name
- Duration: "Completed in {n} minutes"
- Summary: "{n} issues logged · {n} urgent · {n} standard · {n} minor"
- "Start New Inspection" button (resets all state)
- "View Issues" link (goes to /admin/inspections for admin users)

---

### Component: `SeverityBadge`
```typescript
interface SeverityBadgeProps {
  severity: 'urgent' | 'standard' | 'minor' | 'note';
  size?: 'sm' | 'md';
}
```
- urgent: `bg-red-100 text-red-700 border border-red-200` + 🔴
- standard: `bg-yellow-100 text-yellow-700 border border-yellow-200` + 🟡
- minor: `bg-blue-100 text-blue-700 border border-blue-200` + 🔵
- note: `bg-gray-100 text-gray-600 border border-gray-200` + 📝

---

### Component: `PhotoUpload`
```typescript
interface PhotoUploadProps {
  inspectionId: number;
  issueId?: number;
  photoType: 'before' | 'after';
  existingUrl?: string;
  onUploaded: (url: string) => void;
}
```
- Shows large dashed upload zone when no photo
- Shows thumbnail + remove button when photo exists
- Handles: file selection → get signed URL → upload → callback with public URL
- Shows upload progress indicator
- Error handling with retry

---

## 6. BUSINESS LOGIC & RULES

### 6.1 Room Number Validation
Valid room numbers: 101–134, 201–234, 301–334, 401–434
```typescript
function isValidRoomNumber(room: string): boolean {
  const num = parseInt(room);
  if (isNaN(num)) return false;
  const floor = Math.floor(num / 100);
  const roomNum = num % 100;
  return floor >= 1 && floor <= 4 && roomNum >= 1 && roomNum <= 34;
}
```

### 6.2 Quick Checks Default
All 12 quick check items default to `true` (passing). Inspector only toggles items that FAIL.

### 6.3 Inspection Duration Color Coding
- < 5 minutes: `text-red-500` "Too fast — may be incomplete"
- 5–15 minutes: `text-green-600` "Normal"
- 15–25 minutes: `text-yellow-600` "Thorough"
- > 25 minutes: `text-orange` "Detailed"

### 6.4 SLA Logic
```
urgent:  4 hours  → at_risk after 3h, breached after 4h
standard: 24 hours → at_risk after 18h, breached after 24h
minor:   72 hours → at_risk after 54h, breached after 72h
note:    no SLA
```

### 6.5 Sidebar badge
Shows count of urgent open issues only. Hidden if 0. Fetched from /api/inspections/issues/open with severity=urgent filter.

### 6.6 localStorage draft structure
```json
{
  "inspection_id": 5,
  "room_number": "204",
  "inspector_id": 1,
  "inspector_name": "Alex Rivera",
  "inspection_type": "routine",
  "started_at": "2025-05-08T10:30:00Z",
  "step": 3,
  "overall_cleanliness": 4,
  "overall_condition": "good",
  "quick_checks": {"bed_made": true, "bathroom_clean": false, ...},
  "issues": [...],
  "general_notes": ""
}
```

---

## 7. CLAUDE CODE PROMPT

```
Read INSPECTION_SCHEMA.md completely before writing any code.

Add the Inspection & Issue Tracking module to the existing CascoBay HMS. This is an ADDENDUM — do not modify or break any existing functionality.

Follow these steps in order:

1. Create supabase/migrations/005_inspections.sql with all SQL including indexes, triggers, RLS policies, and sample inspectors

2. Create backend/models/inspection.py with all Pydantic models, constants (QUICK_CHECK_ITEMS, SLA_HOURS, CATEGORY_EMOJIS etc), and the compute_sla_status() helper function

3. Create backend/routers/inspections.py with all 11 endpoints. Critical: the /issues/open and /analytics and /room-status routes must be registered BEFORE the /{inspection_id} parameterized route to avoid FastAPI routing conflicts

4. Register the inspections router in backend/main.py

5. Add all TypeScript types (Inspector, Inspection, InspectionIssue, RoomInspectionStatus) to frontend/src/types/index.ts

6. Add all API functions to frontend/src/lib/api.ts

7. Create frontend/src/hooks/useInspections.ts with all React Query hooks

8. Create frontend/src/components/inspections/SeverityBadge.tsx

9. Create frontend/src/components/inspections/IssueCard.tsx — with SLA progress bar, expand/collapse, resolution form, photo thumbnails

10. Create frontend/src/components/inspections/RoomStatusGrid.tsx — 136 rooms in 4 floor groups, color coded by status, hover tooltip, click to open detail panel

11. Create frontend/src/components/inspections/InspectionLogRow.tsx — expandable table row with quick checks grid and issue list

12. Create frontend/src/components/inspections/QuickChecks.tsx — 12-item 2-column grid with toggle switches

13. Create frontend/src/components/inspections/IssueForm.tsx — category grid selector, severity pills, location dropdown, description textarea, photo upload

14. Create frontend/src/components/inspections/PhotoUpload.tsx — handles signed URL upload to Supabase Storage bucket "inspection-photos", shows thumbnail, progress indicator

15. Create frontend/src/components/inspections/AnalyticsCharts.tsx — all Recharts charts for the analytics tab

16. Create frontend/src/pages/admin/InspectionsPage.tsx — 4 tabs: Live Issues / Inspection Log / Room Status / Analytics. Use SectionCard, StatCard, TabNav, Badge components throughout. Match HousekeepingPage design patterns exactly.

17. Create frontend/src/pages/public/InspectionFormPage.tsx — 4-step mobile-first inspection form with localStorage draft persistence, step progress bar, professional app-like feel. Large tap targets minimum 48px. No admin shell.

18. Add Inspections nav link (ClipboardCheck icon) and Copy Inspection Link to frontend/src/components/layout/Sidebar.tsx. Badge shows urgent open issue count.

19. Add routes /admin/inspections and /inspection to frontend/src/App.tsx

Design requirements:
- Admin page must match HousekeepingPage design exactly: SectionCard for every section, StatCard for all KPIs, font-display text-base font-semibold headers, space-y-5 spacing, shadow-sm cards
- Public page must be mobile-first with minimum 48px tap targets, 16px minimum font on inputs, large category and severity selectors
- Severity colors: urgent=red, standard=yellow, minor=blue, note=gray — consistent everywhere
- Use existing Tailwind classes and design system throughout
- Do not install any new npm packages
- Commit and push all changes to GitHub when complete
```
