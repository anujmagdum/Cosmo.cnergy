-- ====================================================================
-- COSMOCNERGY — COMPLETE IDEMPOTENT RLS POLICY & CRUD FIX SCRIPT
-- ====================================================================
-- Description: Sets explicit per-operation RLS policies (SELECT, INSERT, UPDATE, DELETE)
--              for all tables (catalog_items, suppliers, procurement_orders,
--              order_items, product_folders, product_boms, categories, users, webmail_accounts).
--
-- Instructions: Execute this entire script directly in the Supabase SQL Editor.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DROP ALL OLD POLICIES TO AVOID DUPLICATE / CONFLICTING POLICIES
-- --------------------------------------------------------------------

-- public.users
DROP POLICY IF EXISTS "Public full access users" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- categories
DROP POLICY IF EXISTS "Public full access categories" ON categories;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

-- suppliers
DROP POLICY IF EXISTS "Public full access suppliers" ON suppliers;
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;

-- catalog_items
DROP POLICY IF EXISTS "Public full access catalog_items" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_select" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_insert" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_update" ON catalog_items;
DROP POLICY IF EXISTS "catalog_items_delete" ON catalog_items;

-- product_folders
DROP POLICY IF EXISTS "Public full access product_folders" ON product_folders;
DROP POLICY IF EXISTS "product_folders_select" ON product_folders;
DROP POLICY IF EXISTS "product_folders_insert" ON product_folders;
DROP POLICY IF EXISTS "product_folders_update" ON product_folders;
DROP POLICY IF EXISTS "product_folders_delete" ON product_folders;

-- product_boms
DROP POLICY IF EXISTS "Public full access product_boms" ON product_boms;
DROP POLICY IF EXISTS "product_boms_select" ON product_boms;
DROP POLICY IF EXISTS "product_boms_insert" ON product_boms;
DROP POLICY IF EXISTS "product_boms_update" ON product_boms;
DROP POLICY IF EXISTS "product_boms_delete" ON product_boms;

-- procurement_orders
DROP POLICY IF EXISTS "Public full access procurement_orders" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_select" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_insert" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_update" ON procurement_orders;
DROP POLICY IF EXISTS "procurement_orders_delete" ON procurement_orders;

-- order_items
DROP POLICY IF EXISTS "Public full access order_items" ON order_items;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
DROP POLICY IF EXISTS "order_items_delete" ON order_items;

-- webmail_accounts
DROP POLICY IF EXISTS "Public full access webmail_accounts" ON webmail_accounts;
DROP POLICY IF EXISTS "webmail_accounts_select" ON webmail_accounts;
DROP POLICY IF EXISTS "webmail_accounts_insert" ON webmail_accounts;
DROP POLICY IF EXISTS "webmail_accounts_update" ON webmail_accounts;
DROP POLICY IF EXISTS "webmail_accounts_delete" ON webmail_accounts;


-- --------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY & CREATE EXPLICIT PER-OPERATION POLICIES
-- --------------------------------------------------------------------

-- ---- public.users ----
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (true);

-- ---- categories ----
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (true);

-- ---- suppliers ----
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE USING (true);

-- ---- catalog_items ----
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_items_select" ON catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_items_insert" ON catalog_items FOR INSERT WITH CHECK (true);
CREATE POLICY "catalog_items_update" ON catalog_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "catalog_items_delete" ON catalog_items FOR DELETE USING (true);

-- ---- product_folders ----
ALTER TABLE product_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_folders_select" ON product_folders FOR SELECT USING (true);
CREATE POLICY "product_folders_insert" ON product_folders FOR INSERT WITH CHECK (true);
CREATE POLICY "product_folders_update" ON product_folders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_folders_delete" ON product_folders FOR DELETE USING (true);

-- ---- product_boms ----
ALTER TABLE product_boms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_boms_select" ON product_boms FOR SELECT USING (true);
CREATE POLICY "product_boms_insert" ON product_boms FOR INSERT WITH CHECK (true);
CREATE POLICY "product_boms_update" ON product_boms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "product_boms_delete" ON product_boms FOR DELETE USING (true);

-- ---- procurement_orders ----
ALTER TABLE procurement_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procurement_orders_select" ON procurement_orders FOR SELECT USING (true);
CREATE POLICY "procurement_orders_insert" ON procurement_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "procurement_orders_update" ON procurement_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "procurement_orders_delete" ON procurement_orders FOR DELETE USING (true);

-- ---- order_items ----
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (true);

-- ---- webmail_accounts ----
ALTER TABLE webmail_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webmail_accounts_select" ON webmail_accounts FOR SELECT USING (true);
CREATE POLICY "webmail_accounts_insert" ON webmail_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "webmail_accounts_update" ON webmail_accounts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "webmail_accounts_delete" ON webmail_accounts FOR DELETE USING (true);


-- --------------------------------------------------------------------
-- 3. COMPOSITE INDEXES FOR HIGH-PERFORMANCE QUERIES
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_catalog_items_category_status
  ON catalog_items(category_id, procurement_status);

CREATE INDEX IF NOT EXISTS idx_suppliers_name_category
  ON suppliers(name, category_id);

CREATE INDEX IF NOT EXISTS idx_procurement_orders_type_status
  ON procurement_orders(type, status);

CREATE INDEX IF NOT EXISTS idx_order_items_item
  ON order_items(item_id);


-- --------------------------------------------------------------------
-- 4. IDEMPOTENT AUTH PROFILE TRIGGER (SYNC AUTH.USERS -> PUBLIC.USERS)
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
-- 5. VERIFICATION QUERY (CONFIRMS ALL 36 CRUD POLICIES ARE ACTIVE)
-- --------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
