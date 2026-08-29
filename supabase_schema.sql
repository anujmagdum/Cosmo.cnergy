-- ====================================================================
-- COSMOCNERGY ENTERPRISE PROCUREMENT OS — COMPLETE DATABASE RESTORATION
-- ====================================================================
-- Target Supabase Project: obvahbbqvujqxbaqurjg
-- Description:
--   1. Recreates all tables (categories, companies, catalog_items, product_folders,
--      product_boms, procurement_orders, order_items, users, webmail_accounts).
--   2. Enables Row Level Security (RLS) with full permissive CRUD policies
--      for 'anon' and 'authenticated' roles.
--   3. Sets up Foreign Key constraints with proper ON DELETE CASCADE / SET NULL.
--   4. Seeds initial default categories, companies, components, and BOM recipes.
--   5. Reloads PostgREST schema cache via NOTIFY pgrst, 'reload schema'.
--
-- Instructions: Run this entire script in Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: EXTENSIONS
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- STEP 2: CREATE CORE DATABASE TABLES
-- --------------------------------------------------------------------

-- 1. categories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT ('catg-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. companies
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL DEFAULT 'Sales Dept',
    email TEXT NOT NULL DEFAULT 'sales@company.com',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    buying_url TEXT DEFAULT '',
    address TEXT DEFAULT '',
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'General Company',
    rating NUMERIC(3, 2) DEFAULT 4.80,
    gstin TEXT DEFAULT '',
    payment_terms TEXT DEFAULT 'Net 30 Days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. catalog_items (Components & Raw Materials)
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    sku TEXT DEFAULT ('SKU-' || substr(md5(random()::text), 1, 6)),
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'Battery Cells',
    specs TEXT DEFAULT '',
    uom TEXT DEFAULT 'Pcs',
    preset_price NUMERIC(12, 2) DEFAULT 0.00,
    company_id TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
    min_order_qty INT DEFAULT 1,
    in_stock_qty INT DEFAULT 100,
    procurement_status TEXT DEFAULT 'TO_BE_ORDERED',
    company_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. product_folders (Product Pack Assemblies & Folders)
CREATE TABLE IF NOT EXISTS public.product_folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT DEFAULT 'Battery Pack Assembly',
    linked_po_ids TEXT[] DEFAULT '{}',
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. product_boms (Bill of Materials Recipes)
CREATE TABLE IF NOT EXISTS public.product_boms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL DEFAULT 'PROD-001',
    raw_material_id TEXT REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    qty_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. procurement_orders (Purchase Orders & RFQs)
CREATE TABLE IF NOT EXISTS public.procurement_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT NOT NULL DEFAULT ('PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 4)),
    company_id TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. public.users (User Profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT 'Cosmo User',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. webmail_accounts (Configured IMAP/SMTP accounts)
CREATE TABLE IF NOT EXISTS public.webmail_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT NOT NULL DEFAULT 'ANUJ (PROCUREMENT HEAD)',
    email TEXT NOT NULL,
    sender_name TEXT DEFAULT 'CosmoCnergy Procurement Head',
    imap_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    imap_port INTEGER DEFAULT 993,
    smtp_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    smtp_port INTEGER DEFAULT 465,
    auth_username TEXT NOT NULL DEFAULT '',
    auth_password TEXT DEFAULT '',
    is_default BOOLEAN DEFAULT FALSE,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- --------------------------------------------------------------------
-- STEP 3: CREATE INDEXES FOR FAST QUERY EXECUTION
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalog_items_company ON public.catalog_items(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON public.catalog_items(category_id);
CREATE INDEX IF NOT EXISTS idx_companies_category ON public.companies(category_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_company ON public.procurement_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item ON public.order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_product_boms_raw_mat ON public.product_boms(raw_material_id);


-- --------------------------------------------------------------------
-- STEP 4: CONFIGURE ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webmail_accounts ENABLE ROW LEVEL SECURITY;

-- Clean drop existing policies to ensure idempotency
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

-- Universal Permissive Policies (SELECT, INSERT, UPDATE, DELETE for anon & authenticated)
-- 1. categories
CREATE POLICY "categories_all" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 2. companies
CREATE POLICY "companies_all" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 3. catalog_items
CREATE POLICY "catalog_items_all" ON public.catalog_items FOR ALL USING (true) WITH CHECK (true);

-- 4. product_folders
CREATE POLICY "product_folders_all" ON public.product_folders FOR ALL USING (true) WITH CHECK (true);

-- 5. product_boms
CREATE POLICY "product_boms_all" ON public.product_boms FOR ALL USING (true) WITH CHECK (true);

-- 6. procurement_orders
CREATE POLICY "procurement_orders_all" ON public.procurement_orders FOR ALL USING (true) WITH CHECK (true);

-- 7. order_items
CREATE POLICY "order_items_all" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- 8. users
CREATE POLICY "users_all" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 9. webmail_accounts
CREATE POLICY "webmail_accounts_all" ON public.webmail_accounts FOR ALL USING (true) WITH CHECK (true);


-- --------------------------------------------------------------------
-- STEP 5: SEED INITIAL DATA (CATEGORIES, SUPPLIERS, COMPONENTS, BOMS)
-- --------------------------------------------------------------------

-- Categories
INSERT INTO public.categories (id, name, description)
VALUES
    ('catg-1', 'Battery Cells', 'Lithium Iron Phosphate (LFP), NMC, and Cylindrical Cells'),
    ('catg-2', 'Electronics / BMS', 'Smart Battery Management Systems, Communication Modules & Active Balancers'),
    ('catg-3', 'Connectors & Busbars', 'Flexible Copper Busbars, Nickel Strips & High-Current Terminals'),
    ('catg-4', 'Metal Enclosures', 'IP65 Rated Cabinets, Rack Mount Enclosures & Structural Sheet Metal'),
    ('catg-5', 'Wiring & Harnesses', 'High-Temp Silicone Cables, Wire Harnesses & Multi-Pin Connectors'),
    ('catg-6', 'General Company', 'Consumables, Thermal Pads, Fasteners & Production Tools')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Companies
INSERT INTO public.companies (id, name, contact_person, email, phone, whatsapp, buying_url, address, category, category_id, rating)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'CellTech Energy Systems', 'Rajesh Sharma', 'sales@celltechenergy.com', '+91 98765 43210', '919876543210', 'https://celltechenergy.com/portal', 'Plot 45, Electronics City Phase 1, Bengaluru', 'Battery Cells', 'catg-1', 4.80),
    ('22222222-2222-2222-2222-222222222222', 'BMS Master Solutions', 'Anita Desai', 'orders@bmsmasters.com', '+91 98123 45678', '919812345678', 'https://bmsmasters.com/b2b', 'Sector 62, Tech Zone, Noida', 'Electronics / BMS', 'catg-2', 4.90),
    ('33333333-3333-3333-3333-333333333333', 'Busbar & Connector Corp', 'Vikram Verma', 'supply@busbarcorp.com', '+91 99887 76655', '919988776655', 'https://busbarcorp.com/store', 'GIDC Industrial Estate, Vadodara', 'Connectors & Busbars', 'catg-3', 4.60),
    ('44444444-4444-4444-4444-444444444444', 'ThermalShield Enclosures', 'Sanjay Gupta', 'info@thermalshield.in', '+91 97654 32109', '919765432109', 'https://thermalshield.in/portal', 'Ambattur Industrial Estate, Chennai', 'Metal Enclosures', 'catg-4', 4.70)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

-- Catalog Items (Components)
INSERT INTO public.catalog_items (id, sku, name, category, category_id, specs, uom, preset_price, company_id, min_order_qty, in_stock_qty, procurement_status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'CELL-3.2V-100AH', '3.2V 100Ah LFP Grade A Cell', 'Battery Cells', 'catg-1', 'LiFePO4, 3.2V, 100Ah, 6000 Cycles, M6 Terminals', 'Pcs', 2850.00, '11111111-1111-1111-1111-111111111111', 16, 640, 'TO_BE_ORDERED'),
    ('c2222222-2222-2222-2222-222222222222', 'BMS-16S-100A', '16S 100A Smart Bluetooth BMS', 'Electronics / BMS', 'catg-2', 'UART/CAN Bus, Active Balancing 1A, Temp Sensors', 'Pcs', 3400.00, '22222222-2222-2222-2222-222222222222', 1, 45, 'TO_BE_ORDERED'),
    ('c3333333-3333-3333-3333-333333333333', 'BUS-CU-100A', 'Flexible Copper Busbar 100A', 'Connectors & Busbars', 'catg-3', 'Nickel Plated Copper, Hole Pitch 65mm', 'Pcs', 85.00, '33333333-3333-3333-3333-333333333333', 15, 800, 'TO_BE_ORDERED'),
    ('c4444444-4444-4444-4444-444444444444', 'ENC-51V-METAL', 'Heavy Duty Steel Cabinet 51.2V', 'Metal Enclosures', 'catg-4', 'IP65 Rated, Powder Coated, Handles & Display Cutout', 'Set', 4500.00, '44444444-4444-4444-4444-444444444444', 1, 20, 'TO_BE_ORDERED'),
    ('c5555555-5555-5555-5555-555555555555', 'WIRE-HARN-100A', 'High Current Wire Harness 4AWG', 'Wiring & Harnesses', 'catg-5', 'Silicone Insulated, Amphenol Connectors', 'Set', 420.00, '33333333-3333-3333-3333-333333333333', 1, 120, 'TO_BE_ORDERED')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, preset_price = EXCLUDED.preset_price;

-- Product Folders
INSERT INTO public.product_folders (id, name, description, linked_po_ids, components)
VALUES
    ('f-512v-100ah', '51.2V 100Ah Pack Assembly', 'High-density 16S LFP energy storage pack recipe', ARRAY[]::TEXT[], '[{"item_id": "c1111111-1111-1111-1111-111111111111", "qty_per_unit": 16}, {"item_id": "c2222222-2222-2222-2222-222222222222", "qty_per_unit": 1}, {"item_id": "c3333333-3333-3333-3333-333333333333", "qty_per_unit": 15}, {"item_id": "c4444444-4444-4444-4444-444444444444", "qty_per_unit": 1}]'::jsonb),
    ('f-48v-200ah', '48V 200Ah Telecom Rack Unit', '15S2P Telecom backup power assembly recipe', ARRAY[]::TEXT[], '[{"item_id": "c1111111-1111-1111-1111-111111111111", "qty_per_unit": 30}, {"item_id": "c2222222-2222-2222-2222-222222222222", "qty_per_unit": 1}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Product BOMs
INSERT INTO public.product_boms (id, product_name, product_code, raw_material_id, qty_per_unit, notes)
VALUES
    ('b1', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c1111111-1111-1111-1111-111111111111', 16, '16 cells required for 16S series connection'),
    ('b2', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c2222222-2222-2222-2222-222222222222', 1, '1 Smart BMS controller per pack'),
    ('b3', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c3333333-3333-3333-3333-333333333333', 15, '15 inter-cell busbars required'),
    ('b4', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c4444444-4444-4444-4444-444444444444', 1, '1 Metal Enclosure Box'),
    ('b5', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c5555555-5555-5555-5555-555555555555', 1, '1 Internal silicone wiring harness')
ON CONFLICT (id) DO NOTHING;

-- Default Webmail Accounts
INSERT INTO public.webmail_accounts (id, username, email, sender_name, imap_host, imap_port, smtp_host, smtp_port, auth_username, auth_password, is_default)
VALUES 
    ('acc-procurement', 'ANUJ (PROCUREMENT HEAD)', 'procurement@cosmocnergy.com', 'CosmoCnergy Procurement Head', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'procurement@cosmocnergy.com', '', true),
    ('acc-sales', 'ANUJ (PROCUREMENT HEAD)', 'sales@cosmocnergy.com', 'CosmoCnergy Sales & Supply', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'sales@cosmocnergy.com', '', false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;


-- --------------------------------------------------------------------
-- STEP 6: RELOAD POSTGREST SCHEMA CACHE
-- --------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- Verification Query: Output all created tables and their row counts
SELECT 
    table_name, 
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as approximate_row_count
FROM (
    SELECT 
        table_name, 
        query_to_xml(format('SELECT COUNT(*) as cnt FROM public.%I', table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY table_name;
