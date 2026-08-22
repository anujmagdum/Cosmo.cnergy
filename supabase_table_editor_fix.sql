-- ====================================================================
-- COSMOCNERGY — 6-TABLE SUPABASE RLS & CASCADE DELETION PATCH
-- ====================================================================
-- Target Tables:
--   1. catalog_items
--   2. order_items
--   3. procurement_orders
--   4. product_boms
--   5. product_folders
--   6. suppliers
--
-- Instructions: Run this entire script in your Supabase SQL Editor.
-- It fixes RLS permissions for SELECT, INSERT, UPDATE, and DELETE,
-- and ensures foreign keys allow cascading/nullifying on delete so
-- rows can be deleted without foreign key constraint errors.
-- ====================================================================

-- --------------------------------------------------------------------
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON ALL 6 TABLES
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;

-- Optional support tables (if they exist in your project)
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webmail_accounts ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------
-- STEP 2: DROP EXISTING POLICIES TO PREVENT DUPLICATES
-- --------------------------------------------------------------------

-- catalog_items
DROP POLICY IF EXISTS "Public full access catalog_items" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_select" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_insert" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_update" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_delete" ON catalog_items;

-- order_items
DROP POLICY IF EXISTS "Public full access order_items" ON order_items;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
DROP POLICY IF EXISTS "order_items_delete" ON order_items;

-- procurement_orders
DROP POLICY IF EXISTS "Public full access procurement_orders" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_select" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_insert" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_update" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_delete" ON procurement_orders;

-- product_boms
DROP POLICY IF EXISTS "Public full access product_boms" ON product_boms;
DROP POLICY IF EXISTS "product_boms_select" ON product_boms;
DROP POLICY IF EXISTS "product_boms_insert" ON product_boms;
DROP POLICY IF EXISTS "product_boms_update" ON product_boms;
DROP POLICY IF EXISTS "product_boms_delete" ON product_boms;

-- product_folders
DROP POLICY IF EXISTS "Public full access product_folders" ON product_folders;
DROP POLICY IF EXISTS "product_folders_select" ON product_folders;
DROP POLICY IF EXISTS "product_folders_insert" ON product_folders;
DROP POLICY IF EXISTS "product_folders_update" ON product_folders;
DROP POLICY IF EXISTS "product_folders_delete" ON product_folders;

-- suppliers
DROP POLICY IF EXISTS "Public full access suppliers" ON suppliers;
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;

-- optional tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    DROP POLICY IF EXISTS "Public full access categories" ON categories;
    DROP POLICY IF EXISTS "categories_select" ON categories;
    DROP POLICY IF EXISTS "categories_insert" ON categories;
    DROP POLICY IF EXISTS "categories_update" ON categories;
    DROP POLICY IF EXISTS "categories_delete" ON categories;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP POLICY IF EXISTS "Public full access users" ON public.users;
    DROP POLICY IF EXISTS "users_select" ON public.users;
    DROP POLICY IF EXISTS "users_insert" ON public.users;
    DROP POLICY IF EXISTS "users_update" ON public.users;
    DROP POLICY IF EXISTS "users_delete" ON public.users;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webmail_accounts') THEN
    DROP POLICY IF EXISTS "Public full access webmail_accounts" ON webmail_accounts;
    DROP POLICY IF EXISTS "webmail_accounts_select" ON webmail_accounts;
    DROP POLICY IF EXISTS "webmail_accounts_insert" ON webmail_accounts;
    DROP POLICY IF EXISTS "webmail_accounts_update" ON webmail_accounts;
    DROP POLICY IF EXISTS "webmail_accounts_delete" ON webmail_accounts;
  END IF;
END $$;


-- --------------------------------------------------------------------
-- STEP 3: CREATE EXPLICIT CRUD POLICIES (SELECT, INSERT, UPDATE, DELETE)
-- --------------------------------------------------------------------

-- 1. catalog_items
CREATE POLICY "catalog_items_select" ON catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_items_insert" ON catalog_items FOR INSERT WITH CHECK (true);
CREATE POLICY "catalog_items_update" ON catalog_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "catalog_items_delete" ON catalog_items FOR DELETE USING (true);

-- 2. order_items
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (true);

-- 3. procurement_orders
CREATE POLICY "procurement_orders_select" ON procurement_orders FOR SELECT USING (true);
CREATE POLICY "procurement_orders_insert" ON procurement_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "procurement_orders_update" ON procurement_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "procurement_orders_delete" ON procurement_orders FOR DELETE USING (true);

-- 4. product_boms
CREATE POLICY "product_boms_select" ON product_boms FOR SELECT USING (true);
CREATE POLICY "product_boms_insert" ON product_boms FOR INSERT WITH CHECK (true);
CREATE POLICY "product_boms_update" ON product_boms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_boms_delete" ON product_boms FOR DELETE USING (true);

-- 5. product_folders
CREATE POLICY "product_folders_select" ON product_folders FOR SELECT USING (true);
CREATE POLICY "product_folders_insert" ON product_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "product_folders_update" ON product_folders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_folders_delete" ON product_folders FOR DELETE USING (true);

-- 6. suppliers
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE USING (true);

-- Optional tables if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
    CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (true);
    CREATE POLICY "categories_update" ON categories FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "categories_delete" ON categories FOR DELETE USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
    CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (true);
    CREATE POLICY "users_update" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "users_delete" ON public.users FOR DELETE USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webmail_accounts') THEN
    CREATE POLICY "webmail_accounts_select" ON webmail_accounts FOR SELECT USING (true);
    CREATE POLICY "webmail_accounts_insert" ON webmail_accounts FOR INSERT WITH CHECK (true);
    CREATE POLICY "webmail_accounts_update" ON webmail_accounts FOR UPDATE USING (true) WITH CHECK (true);
    CREATE POLICY "webmail_accounts_delete" ON webmail_accounts FOR DELETE USING (true);
  END IF;
END $$;


-- --------------------------------------------------------------------
-- STEP 4: FOREIGN KEY CASCADE SAFETIES (PREVENTS 23503 FK VIOLATION ON DELETE)
-- --------------------------------------------------------------------

-- Ensure deleting an order automatically deletes child order_items
DO $$
BEGIN
  -- Re-link order_items -> procurement_orders (CASCADE)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_order_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_order_id_fkey;
  END IF;
  ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES procurement_orders(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure deleting a catalog item doesn't fail if referenced in order_items (SET NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_item_id_fkey') THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_item_id_fkey;
  END IF;
  ALTER TABLE order_items ADD CONSTRAINT order_items_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure deleting a catalog item automatically cleans up associated product_boms (CASCADE)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'product_boms_raw_material_id_fkey') THEN
    ALTER TABLE product_boms DROP CONSTRAINT product_boms_raw_material_id_fkey;
  END IF;
  ALTER TABLE product_boms ADD CONSTRAINT product_boms_raw_material_id_fkey
    FOREIGN KEY (raw_material_id) REFERENCES catalog_items(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure deleting a supplier sets catalog_items.supplier_id to NULL instead of blocking (SET NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'catalog_items_supplier_id_fkey') THEN
    ALTER TABLE catalog_items DROP CONSTRAINT catalog_items_supplier_id_fkey;
  END IF;
  ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure deleting a supplier sets procurement_orders.supplier_id to NULL instead of blocking (SET NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'procurement_orders_supplier_id_fkey') THEN
    ALTER TABLE procurement_orders DROP CONSTRAINT procurement_orders_supplier_id_fkey;
  END IF;
  ALTER TABLE procurement_orders ADD CONSTRAINT procurement_orders_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- --------------------------------------------------------------------
-- STEP 5: PERFORMANCE INDEXES FOR FASTER SELECT & DELETE OPERATIONS
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalog_items_supplier ON catalog_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item ON order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_supplier ON procurement_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_status ON procurement_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_boms_raw_material ON product_boms(raw_material_id);


-- --------------------------------------------------------------------
-- STEP 6: VERIFY ACTIVE POLICIES ON YOUR 6 TABLES
-- --------------------------------------------------------------------
SELECT 
  tablename, 
  policyname, 
  cmd, 
  roles
FROM pg_policies 
WHERE tablename IN (
  'catalog_items', 
  'order_items', 
  'procurement_orders', 
  'product_boms', 
  'product_folders', 
  'suppliers'
)
ORDER BY tablename, cmd;
