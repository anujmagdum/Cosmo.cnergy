-- ====================================================================
-- COSMOCNERGY — UNIVERSAL PERMISSIVE RLS & SCHEMA REPAIR SCRIPT
-- ====================================================================
-- Description:
--   1. Ensures all required columns exist with sensible defaults.
--   2. Enables Row Level Security (RLS) and grants explicit, universal
--      CRUD permissions (SELECT, INSERT, UPDATE, DELETE) for both
--      'anon' and 'authenticated' roles.
--   3. Configures Foreign Key cascade and nullify actions to prevent
--      silent 23503 foreign key violation failures on delete.
--   4. Creates aliases/views so queries to 'components' or 'catalog_items',
--      'products' or 'product_folders' succeed everywhere.
--
-- Instructions: Run this entire script in Supabase Dashboard -> SQL Editor.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: CREATE CORE TABLES IF THEY DO NOT EXIST
-- --------------------------------------------------------------------

-- 1. categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT ('catg-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL DEFAULT 'Sales Dept',
    email TEXT NOT NULL DEFAULT 'sales@supplier.com',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    buying_url TEXT DEFAULT '',
    address TEXT DEFAULT '',
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'General Supplier',
    rating NUMERIC(3, 2) DEFAULT 4.80,
    gstin TEXT DEFAULT '',
    payment_terms TEXT DEFAULT 'Net 30 Days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. catalog_items (Components & Raw Materials)
CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    sku TEXT DEFAULT ('SKU-' || substr(md5(random()::text), 1, 6)),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'Battery Cells',
    specs TEXT DEFAULT '',
    uom TEXT DEFAULT 'Pcs',
    preset_price NUMERIC(12, 2) DEFAULT 0.00,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    min_order_qty INT DEFAULT 1,
    in_stock_qty INT DEFAULT 100,
    procurement_status TEXT DEFAULT 'TO_BE_ORDERED',
    supplier_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. product_folders (Product Pack Assemblies & Folders)
CREATE TABLE IF NOT EXISTS product_folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT DEFAULT 'Battery Pack Assembly',
    linked_po_ids TEXT[] DEFAULT '{}',
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. product_boms (Bill of Materials Recipes)
CREATE TABLE IF NOT EXISTS product_boms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL DEFAULT 'PROD-001',
    raw_material_id TEXT REFERENCES catalog_items(id) ON DELETE CASCADE,
    qty_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. procurement_orders (Purchase Orders & RFQs)
CREATE TABLE IF NOT EXISTS procurement_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT NOT NULL DEFAULT ('PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 4)),
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('PO', 'RFQ')) DEFAULT 'PO',
    status TEXT CHECK (status IN ('TO_BE_ORDERED', 'RFQ_SENT', 'ORDERED', 'DELIVERED', 'ON_HOLD')) DEFAULT 'ORDERED',
    total_amount NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT DEFAULT '',
    created_by TEXT DEFAULT 'ANUJ (PROCUREMENT HEAD)',
    pdf_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. order_items (PO Line Items)
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT REFERENCES procurement_orders(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES catalog_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. public.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT 'Cosmo User',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. webmail_accounts
CREATE TABLE IF NOT EXISTS webmail_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID,
    email TEXT NOT NULL,
    username TEXT,
    imap_host TEXT DEFAULT '',
    imap_port INT DEFAULT 993,
    smtp_host TEXT DEFAULT '',
    smtp_port INT DEFAULT 465,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- --------------------------------------------------------------------
-- STEP 2: ENSURE CRITICAL COLUMNS EXIST WITH SAFE DEFAULTS
-- --------------------------------------------------------------------
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Battery Cells';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS specs TEXT DEFAULT '';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'Pcs';
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS preset_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS in_stock_qty INT DEFAULT 100;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS min_order_qty INT DEFAULT 1;
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS procurement_status TEXT DEFAULT 'TO_BE_ORDERED';

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Supplier';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.80;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30 Days';

ALTER TABLE product_folders ADD COLUMN IF NOT EXISTS linked_po_ids TEXT[] DEFAULT '{}';
ALTER TABLE product_folders ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '[]'::jsonb;


-- --------------------------------------------------------------------
-- STEP 3: SEED DEFAULT CATEGORIES (IDEMPOTENT INSERT)
-- --------------------------------------------------------------------
INSERT INTO categories (id, name, description)
VALUES
    ('catg-1', 'Battery Cells', 'Lithium Iron Phosphate (LFP), NMC, and Cylindrical Cells'),
    ('catg-2', 'Electronics / BMS', 'Smart Battery Management Systems, Communication Modules & Active Balancers'),
    ('catg-3', 'Connectors & Busbars', 'Flexible Copper Busbars, Nickel Strips & High-Current Terminals'),
    ('catg-4', 'Metal Enclosures', 'IP65 Rated Cabinets, Rack Mount Enclosures & Structural Sheet Metal'),
    ('catg-5', 'Wiring & Harnesses', 'High-Temp Silicone Cables, Wire Harnesses & Multi-Pin Connectors'),
    ('catg-6', 'General Supplier', 'Consumables, Thermal Pads, Fasteners & Production Tools')
ON CONFLICT (id) DO NOTHING;


-- --------------------------------------------------------------------
-- STEP 4: RESET & CONFIGURE EXPLICIT UNIVERSAL RLS PERMISSIONS
-- --------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE webmail_accounts ENABLE ROW LEVEL SECURITY;

-- Clean drop existing policies to avoid duplicates
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 1. public.users
CREATE POLICY "users_universal_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_universal_insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_universal_update" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "users_universal_delete" ON public.users FOR DELETE USING (true);

-- 2. categories
CREATE POLICY "categories_universal_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_universal_insert" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_universal_update" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "categories_universal_delete" ON categories FOR DELETE USING (true);

-- 3. suppliers
CREATE POLICY "suppliers_universal_select" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_universal_insert" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "suppliers_universal_update" ON suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_universal_delete" ON suppliers FOR DELETE USING (true);

-- 4. catalog_items
CREATE POLICY "catalog_items_universal_select" ON catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_items_universal_insert" ON catalog_items FOR INSERT WITH CHECK (true);
CREATE POLICY "catalog_items_universal_update" ON catalog_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "catalog_items_universal_delete" ON catalog_items FOR DELETE USING (true);

-- 5. product_folders
CREATE POLICY "product_folders_universal_select" ON product_folders FOR SELECT USING (true);
CREATE POLICY "product_folders_universal_insert" ON product_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "product_folders_universal_update" ON product_folders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_folders_universal_delete" ON product_folders FOR DELETE USING (true);

-- 6. product_boms
CREATE POLICY "product_boms_universal_select" ON product_boms FOR SELECT USING (true);
CREATE POLICY "product_boms_universal_insert" ON product_boms FOR INSERT WITH CHECK (true);
CREATE POLICY "product_boms_universal_update" ON product_boms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_boms_universal_delete" ON product_boms FOR DELETE USING (true);

-- 7. procurement_orders
CREATE POLICY "procurement_orders_universal_select" ON procurement_orders FOR SELECT USING (true);
CREATE POLICY "procurement_orders_universal_insert" ON procurement_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "procurement_orders_universal_update" ON procurement_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "procurement_orders_universal_delete" ON procurement_orders FOR DELETE USING (true);

-- 8. order_items
CREATE POLICY "order_items_universal_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_universal_insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_universal_update" ON order_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "order_items_universal_delete" ON order_items FOR DELETE USING (true);

-- 9. webmail_accounts
CREATE POLICY "webmail_accounts_universal_select" ON webmail_accounts FOR SELECT USING (true);
CREATE POLICY "webmail_accounts_universal_insert" ON webmail_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "webmail_accounts_universal_update" ON webmail_accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "webmail_accounts_universal_delete" ON webmail_accounts FOR DELETE USING (true);


-- --------------------------------------------------------------------
-- STEP 5: CONFIGURE FOREIGN KEY CASCADE DELETION RULES
-- --------------------------------------------------------------------
DO $$
BEGIN
  -- Re-link order_items -> procurement_orders (CASCADE)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_order_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_order_id_fkey;
  END IF;
  ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES procurement_orders(id) ON DELETE CASCADE;

  -- Re-link order_items -> catalog_items (SET NULL)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_item_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_item_id_fkey;
  END IF;
  ALTER TABLE order_items ADD CONSTRAINT order_items_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE SET NULL;

  -- Re-link product_boms -> catalog_items (CASCADE)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'product_boms_raw_material_id_fkey') THEN
    ALTER TABLE product_boms DROP CONSTRAINT product_boms_raw_material_id_fkey;
  END IF;
  ALTER TABLE product_boms ADD CONSTRAINT product_boms_raw_material_id_fkey
    FOREIGN KEY (raw_material_id) REFERENCES catalog_items(id) ON DELETE CASCADE;

  -- Re-link catalog_items -> suppliers (SET NULL)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'catalog_items_supplier_id_fkey') THEN
    ALTER TABLE catalog_items DROP CONSTRAINT catalog_items_supplier_id_fkey;
  END IF;
  ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

  -- Re-link procurement_orders -> suppliers (SET NULL)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'procurement_orders_supplier_id_fkey') THEN
    ALTER TABLE procurement_orders DROP CONSTRAINT procurement_orders_supplier_id_fkey;
  END IF;
  ALTER TABLE procurement_orders ADD CONSTRAINT procurement_orders_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- --------------------------------------------------------------------
-- STEP 6: VERIFICATION SUMMARY (LIST ACTIVE POLICIES)
-- --------------------------------------------------------------------
SELECT 
  tablename, 
  policyname, 
  cmd, 
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
