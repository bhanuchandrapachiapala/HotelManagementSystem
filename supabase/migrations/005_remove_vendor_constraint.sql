-- Remove the vendor allowlist constraint so any custom vendor string is accepted.
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS valid_inv_vendor;
