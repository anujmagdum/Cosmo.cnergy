-- ====================================================================
-- COSMOCNERGY SMART 1-TAP PROCUREMENT OS — COMPLETE SUPABASE DATABASE SCHEMA & SEED
-- Description: Complete DDL, Indexes, RLS Policies, Relational Categories, Users Sync, and Seed Data
-- Repository: https://github.com/canopycorppune-sys/CosmoCnergy.git
-- Execute this entire script directly in the Supabase SQL Editor.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DROP EXISTING TABLES IF RE-INITIALIZING (CASCADE)
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS procurement_orders CASCADE;
DROP TABLE IF EXISTS product_boms CASCADE;
DROP TABLE IF EXISTS product_folders CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS webmail_accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- --------------------------------------------------------------------
-- 2. CREATE PUBLIC USERS PROFILE TABLE (SYNCED WITH SUPABASE AUTH)
-- --------------------------------------------------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'procurement_admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. CREATE CATEGORIES TABLE (CATEGORY NORMALIZATION)
-- --------------------------------------------------------------------
CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. CREATE SUPPLIERS TABLE (LINKED TO CATEGORIES)
-- --------------------------------------------------------------------
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    buying_url TEXT,
    address TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'General Supplier',
    rating NUMERIC(3, 2) DEFAULT 4.80,
    gstin TEXT,
    payment_terms TEXT DEFAULT 'Net 30 Days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. CREATE CATALOG ITEMS TABLE (ONLY NAME REQUIRED; CATEGORY_ID LINKED)
-- --------------------------------------------------------------------
CREATE TABLE catalog_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    sku TEXT DEFAULT ('SKU-' || substr(md5(random()::text), 1, 6)),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'Battery Cells',
    specs TEXT,
    uom TEXT DEFAULT 'Pcs',
    preset_price NUMERIC(12, 2) DEFAULT 0.00,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    min_order_qty INT DEFAULT 1,
    in_stock_qty INT DEFAULT 100,
    procurement_status TEXT DEFAULT 'TO_BE_ORDERED',
    supplier_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. CREATE PRODUCT FOLDERS TABLE (WITH RECIPE COMPONENTS JSONB)
-- --------------------------------------------------------------------
CREATE TABLE product_folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    linked_po_ids TEXT[] DEFAULT '{}',
    components JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. CREATE PRODUCT BOMS (BILL OF MATERIALS) TABLE
-- --------------------------------------------------------------------
CREATE TABLE product_boms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    raw_material_id TEXT REFERENCES catalog_items(id) ON DELETE CASCADE,
    qty_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. CREATE PROCUREMENT ORDERS TABLE
-- --------------------------------------------------------------------
CREATE TABLE procurement_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('PO', 'RFQ')) DEFAULT 'PO',
    status TEXT CHECK (status IN ('TO_BE_ORDERED', 'RFQ_SENT', 'ORDERED', 'DELIVERED', 'ON_HOLD')) DEFAULT 'ORDERED',
    total_amount NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    created_by TEXT DEFAULT 'ANUJ (PROCUREMENT HEAD)',
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. CREATE ORDER ITEMS TABLE
-- --------------------------------------------------------------------
CREATE TABLE order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT REFERENCES procurement_orders(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES catalog_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. CREATE WEBMAIL ACCOUNTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webmail_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    sender_name TEXT,
    imap_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    imap_port INTEGER DEFAULT 993,
    smtp_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    smtp_port INTEGER DEFAULT 465,
    auth_username TEXT NOT NULL,
    auth_password TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 11. PERFORMANCE INDEXES
-- --------------------------------------------------------------------
CREATE INDEX idx_catalog_items_supplier ON catalog_items(supplier_id);
CREATE INDEX idx_catalog_items_sku ON catalog_items(sku);
CREATE INDEX idx_catalog_items_category ON catalog_items(category_id);
CREATE INDEX idx_suppliers_category ON suppliers(category_id);
CREATE INDEX idx_procurement_orders_supplier ON procurement_orders(supplier_id);
CREATE INDEX idx_procurement_orders_status ON procurement_orders(status);
CREATE INDEX idx_procurement_orders_created ON procurement_orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_product_boms_code ON product_boms(product_code);
CREATE INDEX idx_product_folders_created ON product_folders(created_at DESC);

-- --------------------------------------------------------------------
-- 12. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE webmail_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access catalog_items" ON catalog_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access product_folders" ON product_folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access product_boms" ON product_boms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access procurement_orders" ON procurement_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access webmail_accounts" ON webmail_accounts FOR ALL USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------
-- 13. AUTH TRIGGER FOR AUTO-SYNCING AUTH.USERS TO PUBLIC.USERS
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 14. SEED DATA
-- --------------------------------------------------------------------

-- Insert Categories
INSERT INTO categories (id, name, description) VALUES
('catg-1', 'Battery Cells', 'Lithium Iron Phosphate (LFP), NMC, and Sodium-ion raw cells'),
('catg-2', 'Electronics / BMS', 'Battery Management Systems, Active Balancers, Communication Boards'),
('catg-3', 'Connectors & Busbars', 'Copper and Aluminum busbars, Amphenol terminal lugs, inter-cell jumpers'),
('catg-4', 'Metal Enclosures', 'IP65 Sheet metal cabinets, server rack battery cases, brackets'),
('catg-5', 'Wiring & Harnesses', 'High current silicone wire harnesses, BMS balance ribbon cables'),
('catg-6', 'General Supplier', 'Packaging, insulation sheets, hardware, fasteners');

-- Insert Suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone, whatsapp, buying_url, address, category_id, category, rating, gstin, payment_terms) VALUES
('11111111-1111-1111-1111-111111111111', 'CellTech Energy Systems', 'Rajesh Sharma', 'sales@celltechenergy.com', '+91 98765 43210', '919876543210', 'https://celltechenergy.com/portal', 'Plot 45, Electronics City Phase 1, Bengaluru', 'catg-1', 'Battery Cells', 4.85, '29AABCC1234F1Z5', 'Net 30 Days'),
('22222222-2222-2222-2222-222222222222', 'BMS Master Solutions', 'Anita Desai', 'orders@bmsmasters.com', '+91 98123 45678', '919812345678', 'https://bmsmasters.com/b2b', 'Sector 62, Tech Zone, Noida', 'catg-2', 'Electronics / BMS', 4.90, '07AABCB5678G2Z1', 'Net 15 Days'),
('33333333-3333-3333-3333-333333333333', 'Busbar & Connector Corp', 'Vikram Verma', 'supply@busbarcorp.com', '+91 99887 76655', '919988776655', 'https://busbarcorp.com/store', 'GIDC Industrial Estate, Vadodara', 'catg-3', 'Connectors & Busbars', 4.65, '24AABCD9012H3Z7', 'Net 30 Days'),
('44444444-4444-4444-4444-444444444444', 'ThermalShield Enclosures', 'Sanjay Gupta', 'info@thermalshield.in', '+91 97654 32109', '919765432109', 'https://thermalshield.in/portal', 'Ambattur Industrial Estate, Chennai', 'catg-4', 'Metal Enclosures', 4.70, '33AABCE3456J4Z9', 'Net 45 Days');

-- Insert Catalog Items
INSERT INTO catalog_items (id, sku, name, category_id, category, specs, uom, preset_price, supplier_id, min_order_qty, in_stock_qty, procurement_status) VALUES
('c1111111-1111-1111-1111-111111111111', 'CELL-3.2V-100AH', '3.2V 100Ah LFP Grade A Cell', 'catg-1', 'Battery Cells', 'LiFePO4, 3.2V, 100Ah, 6000 Cycles, M6 Terminals', 'Pcs', 2850.00, '11111111-1111-1111-1111-111111111111', 16, 640, 'TO_BE_ORDERED'),
('c2222222-2222-2222-2222-222222222222', 'BMS-16S-100A', '16S 100A Smart Bluetooth BMS', 'catg-2', 'Electronics / BMS', 'UART/CAN Bus, Active Balancing 1A, Temp Sensors', 'Pcs', 3400.00, '22222222-2222-2222-2222-222222222222', 1, 45, 'TO_BE_ORDERED'),
('c3333333-3333-3333-3333-333333333333', 'BUS-CU-100A', 'Flexible Copper Busbar 100A', 'catg-3', 'Connectors & Busbars', 'Nickel Plated Copper, Hole Pitch 65mm', 'Pcs', 85.00, '33333333-3333-3333-3333-333333333333', 15, 800, 'TO_BE_ORDERED'),
('c4444444-4444-4444-4444-444444444444', 'ENC-51V-METAL', 'Heavy Duty Steel Cabinet 51.2V', 'catg-4', 'Metal Enclosures', 'IP65 Rated, Powder Coated, Handles & Display Cutout', 'Set', 4500.00, '44444444-4444-4444-4444-444444444444', 1, 20, 'TO_BE_ORDERED'),
('c5555555-5555-5555-5555-555555555555', 'WIRE-HARN-100A', 'High Current Wire Harness 4AWG', 'catg-5', 'Wiring & Harnesses', 'Silicone Insulated, Amphenol Connectors', 'Set', 420.00, '33333333-3333-3333-3333-333333333333', 1, 120, 'TO_BE_ORDERED');

-- Insert Initial Procurement Orders
INSERT INTO procurement_orders (id, order_number, supplier_id, type, status, total_amount, notes, created_by, created_at) VALUES
('po-101', 'PO-2026-0801', '11111111-1111-1111-1111-111111111111', 'PO', 'ORDERED', 45600.00, 'Order for 16x LFP cells for Pack Assembly Batch A', 'ANUJ (PROCUREMENT HEAD)', '2026-08-01T10:30:00Z'),
('po-102', 'RFQ-2026-0802', '22222222-2222-2222-2222-222222222222', 'RFQ', 'RFQ_SENT', 34000.00, 'RFQ for 10x 16S Smart BMS units', 'ANUJ (PROCUREMENT HEAD)', '2026-08-02T14:15:00Z'),
('po-103', 'PO-2026-0803', '33333333-3333-3333-3333-333333333333', 'PO', 'TO_BE_ORDERED', 1275.00, 'Pending purchase of 15x Busbars', 'ANUJ (PROCUREMENT HEAD)', '2026-08-03T09:00:00Z');

-- Insert Product Folders (Linked to active POs and Raw Material Recipes)
INSERT INTO product_folders (id, name, description, linked_po_ids, components) VALUES
('f-1', '51.2V 100Ah Pack Assembly', 'LFP Battery Pack Main Assembly', ARRAY['po-101', 'po-102'], '[{"item_id":"c1111111-1111-1111-1111-111111111111","qty_per_unit":16},{"item_id":"c2222222-2222-2222-2222-222222222222","qty_per_unit":1},{"item_id":"c3333333-3333-3333-3333-333333333333","qty_per_unit":15},{"item_id":"c4444444-4444-4444-4444-444444444444","qty_per_unit":1}]'::jsonb),
('f-2', '24V 200Ah Pack Assembly', 'Commercial Energy Storage Pack', ARRAY['po-103'], '[{"item_id":"c1111111-1111-1111-1111-111111111111","qty_per_unit":8},{"item_id":"c2222222-2222-2222-2222-222222222222","qty_per_unit":1}]'::jsonb),
('f-3', 'LFP Cell Modules', '3.2V Grade A Cell Stacks', ARRAY[]::text[], '[{"item_id":"c1111111-1111-1111-1111-111111111111","qty_per_unit":4}]'::jsonb);

-- Insert Product BOMs
INSERT INTO product_boms (id, product_name, product_code, raw_material_id, qty_per_unit, notes) VALUES
('b1', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c1111111-1111-1111-1111-111111111111', 16, '16 cells required for 16S series connection'),
('b2', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c2222222-2222-2222-2222-222222222222', 1, '1 Smart BMS controller per pack'),
('b3', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c3333333-3333-3333-3333-333333333333', 15, '15 inter-cell busbars required'),
('b4', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c4444444-4444-4444-4444-444444444444', 1, '1 Metal Enclosure Box'),
('b5', '51.2V 100Ah Solar Energy Storage Pack', 'PACK-51.2V-100AH', 'c5555555-5555-5555-5555-555555555555', 1, '1 Internal silicone wiring harness');

-- Insert Order Items
INSERT INTO order_items (id, order_id, item_id, quantity, unit_price, total_price) VALUES
('oi-1', 'po-101', 'c1111111-1111-1111-1111-111111111111', 16, 2850.00, 45600.00),
('oi-2', 'po-102', 'c2222222-2222-2222-2222-222222222222', 10, 3400.00, 34000.00),
('oi-3', 'po-103', 'c3333333-3333-3333-3333-333333333333', 15, 85.00, 1275.00);

-- Insert Default Webmail Accounts
INSERT INTO webmail_accounts (id, username, email, sender_name, imap_host, imap_port, smtp_host, smtp_port, auth_username, auth_password, is_default) VALUES
('acc-procurement', 'procurement@cosmocnergy.com', 'procurement@cosmocnergy.com', 'CosmoCnergy Procurement Head', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'procurement@cosmocnergy.com', '', true),
('acc-sales', 'sales@cosmocnergy.com', 'sales@cosmocnergy.com', 'CosmoCnergy Sales & Supply', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'sales@cosmocnergy.com', '', false);
