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
('Napkins',                     'disposables',    'other',             'pack',   1,  0, NULL),
('Paper Towels',                'disposables',    'other',             'pack',   1,  0, NULL),
('Waffle/Juice Cups 5oz',       'disposables',    'other',             'pack',   1,  0, NULL),
('8-inch Plates',               'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('6-inch Plates',               'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('Bowls',                       'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('Forks',                       'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('Spoons',                      'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('Knives',                      'disposables',    'webstaurantstore',  'pack',   2,  0, NULL),
('Coffee Cups',                 'disposables',    'other',             'pack',   1,  0, NULL),
('Lids',                        'disposables',    'other',             'pack',   1,  0, NULL),
('Stirrers',                    'disposables',    'other',             'pack',   1,  0, NULL),
('Filter Paper',                'disposables',    'other',             'pack',   1,  0, NULL),
('Gloves',                      'disposables',    'other',             'pack',   2,  0, 'M and L sizes'),

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
('Glass Cleaner',               'cleaning_supplies', 'other',      'pack',   2,  0, NULL),
('Febreze',                     'cleaning_supplies', 'other',      'bottle', 2,  0, NULL),
('Lysol Spray',                 'cleaning_supplies', 'other',      'bottle', 2,  0, NULL),
('Lysol Liquid',                'cleaning_supplies', 'other',      'pack',   2,  0, NULL),
('Dryer Sheets',                'cleaning_supplies', 'other',      'pack',   2,  0, NULL),
('Magic Eraser',                'cleaning_supplies', 'other',      'pack',   2,  0, NULL),
('Pledge',                      'cleaning_supplies', 'other',      'bottle', 2,  0, NULL),
('Air Freshener',               'cleaning_supplies', 'other',      'pack',   1,  0, NULL),
('Bleach',                      'cleaning_supplies', 'other',      'bottle', 1,  0, NULL),
('Fabuloso',                    'cleaning_supplies', 'other',      'bottle', 1,  0, NULL),
('Swiffer Pads',                'cleaning_supplies', 'other',      'pack',   1,  0, NULL),
('Mop Heads',                   'cleaning_supplies', 'other',      'pack',   1,  0, NULL),
('Garbage Bags',                'cleaning_supplies', 'other',      'pack',   1,  0, NULL),
('Tide Pods',                   'cleaning_supplies', 'other',      'pack',   1,  0, NULL),

-- ── FRONT DESK ──
('Pens',                        'front_desk', 'other',             'pack',   1,  0, NULL),
('Sharpie',                     'front_desk', 'other',             'pack',   1,  0, NULL),
('Printer Paper',               'front_desk', 'other',             'ream',   2,  0, NULL),
('Notepad / Post-it',           'front_desk', 'other',             'pack',   1,  0, NULL),
('Toner',                       'front_desk', 'other',             'unit',   1,  0, NULL),
('Staples',                     'front_desk', 'other',             'pack',   1,  0, NULL),
('Envelopes — Cash',            'front_desk', 'other',             'pack',   1,  0, NULL),
('Envelopes — File',            'front_desk', 'other',             'pack',   1,  0, NULL),
('Elastic Bands',               'front_desk', 'other',             'pack',   1,  0, NULL),
('AAA Batteries',               'front_desk', 'other',             'pack',   2,  0, NULL),
('Key Holders',                 'front_desk', 'other',             'pack',   1,  0, NULL)

ON CONFLICT DO NOTHING;
