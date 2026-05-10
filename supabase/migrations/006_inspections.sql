-- ══════════════════════════════════════════════════════
-- CascoBay HMS — Inspection Module Migration
-- Run AFTER 005_remove_vendor_constraint.sql
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

-- ── TRIGGER: auto-update updated_at on issues (reuses function from 001) ──
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
