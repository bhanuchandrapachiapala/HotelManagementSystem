CREATE TABLE IF NOT EXISTS group_contracts (
  id                BIGSERIAL PRIMARY KEY,
  group_name        TEXT        NOT NULL,
  contact_name      TEXT        NOT NULL,
  contact_phone     TEXT        NOT NULL,
  company_address   TEXT,
  check_in_date     DATE        NOT NULL,
  check_out_date    DATE        NOT NULL,
  room_count        INTEGER     NOT NULL,
  room_type         TEXT        NOT NULL DEFAULT 'standard',
  room_rate         NUMERIC(10,2),
  triple_rate       NUMERIC(10,2),
  quad_rate         NUMERIC(10,2),
  deposit_by_date   DATE,
  cutoff_date       DATE,
  signed_by_date    DATE,
  status            TEXT        NOT NULL DEFAULT 'inquiry',
  deposit_paid      BOOLEAN     NOT NULL DEFAULT false,
  special_notes     TEXT,
  internal_notes    TEXT,
  source            TEXT        NOT NULL DEFAULT 'admin',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_group_status CHECK (status IN ('inquiry','confirmed','checked_in','completed','cancelled')),
  CONSTRAINT valid_room_type CHECK (room_type IN ('standard','triple','quad','mixed'))
);

CREATE TABLE IF NOT EXISTS group_activity_log (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   BIGINT NOT NULL REFERENCES group_contracts(id) ON DELETE CASCADE,
  note          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_contracts_status ON group_contracts(status);
CREATE INDEX IF NOT EXISTS idx_group_contracts_checkin ON group_contracts(check_in_date);
CREATE INDEX IF NOT EXISTS idx_group_activity_contract ON group_activity_log(contract_id);

CREATE TRIGGER group_contracts_updated_at
  BEFORE UPDATE ON group_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE group_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_group_contracts" ON group_contracts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_group_activity" ON group_activity_log FOR ALL TO anon USING (true) WITH CHECK (true);
