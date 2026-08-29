-- 1. Rename the main table
ALTER TABLE public.suppliers RENAME TO companies;

-- 2. Rename columns in referencing tables
ALTER TABLE public.catalog_items RENAME COLUMN supplier_id TO company_id;
ALTER TABLE public.catalog_items RENAME COLUMN supplier_url TO company_url;
ALTER TABLE public.procurement_orders RENAME COLUMN supplier_id TO company_id;

-- 3. Rename indexes for performance
ALTER INDEX IF EXISTS idx_catalog_items_supplier RENAME TO idx_catalog_items_company;
ALTER INDEX IF EXISTS idx_suppliers_category RENAME TO idx_companies_category;
ALTER INDEX IF EXISTS idx_procurement_orders_supplier RENAME TO idx_procurement_orders_company;

-- 4. Re-create RLS (Row Level Security) Policies on the newly named `companies` table
DROP POLICY IF EXISTS "suppliers_all" ON public.companies;
CREATE POLICY "companies_all" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 5. Reload PostgREST schema cache so the API recognizes the changes immediately
NOTIFY pgrst, 'reload schema';
