import React, { useState, useEffect } from 'react';
import {
  CatalogItem,
  Supplier,
  ProcurementOrder,
  OrderStatus,
  ProductFolder,
  ProductBOM,
  MultiSupplierPODraft,
  ProductFolderComponent,
  QueuedMailDraft,
  determineOrderType,
  formatProcurementSubject,
  Category
} from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Header } from './components/Header';
import { CatalogSection } from './components/CatalogSection';
import { SupplierDashboard } from './components/SupplierDashboard';
import { AIProcurementStudio } from './components/AIProcurementStudio';
import { OrderHistoryTimeline } from './components/OrderHistoryTimeline';
import { BOMProcurementModal } from './components/BOMProcurementModal';
import { Webmail } from './components/Webmail';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { WhatsAppSmartModal } from './components/WhatsAppSmartModal';
import { NativeWebmailModal } from './components/NativeWebmailModal';
import { MultiVendorDispatchModal } from './components/MultiVendorDispatchModal';
import { ChannelChoiceModal } from './components/ChannelChoiceModal';

// Initial Mock Seed Data
import {
  INITIAL_CATALOG,
  INITIAL_SUPPLIERS,
  INITIAL_BOMS,
  INITIAL_FOLDERS,
  INITIAL_ORDERS
} from './services/mockData';

export const App: React.FC = () => {
  // Navigation State — Orders as default main landing view
  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers' | 'ai' | 'orders' | 'webmail'>('orders');

  // Core Data States
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-1', name: 'Battery Cells' },
    { id: 'cat-2', name: 'Electronics / BMS' },
    { id: 'cat-3', name: 'Connectors & Busbars' },
    { id: 'cat-4', name: 'Metal Enclosures' },
    { id: 'cat-5', name: 'Wiring & Harnesses' },
    { id: 'cat-6', name: 'General Supplier' }
  ]);
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('cosmo_catalog');
    return saved ? JSON.parse(saved) : INITIAL_CATALOG;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('cosmo_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });
  const [boms, setBoms] = useState<ProductBOM[]>(() => {
    const saved = localStorage.getItem('cosmo_boms');
    return saved ? JSON.parse(saved) : INITIAL_BOMS;
  });
  const [folders, setFolders] = useState<ProductFolder[]>(() => {
    const saved = localStorage.getItem('cosmo_folders');
    return saved ? JSON.parse(saved) : INITIAL_FOLDERS;
  });
  const [orders, setOrders] = useState<ProcurementOrder[]>(() => {
    const saved = localStorage.getItem('cosmo_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  // Persistent Synchronization to LocalStorage to prevent stale mock data on refresh
  useEffect(() => {
    try {
      localStorage.setItem('cosmo_catalog', JSON.stringify(catalog));
    } catch {}
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_suppliers', JSON.stringify(suppliers));
    } catch {}
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_folders', JSON.stringify(folders));
    } catch {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_boms', JSON.stringify(boms));
    } catch {}
  }, [boms]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_categories', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Persistent Multi-Vendor Mail Draft Queue
  const [mailDraftQueue, setMailDraftQueue] = useState<QueuedMailDraft[]>(() => {
    try {
      const saved = localStorage.getItem('cosmo_mail_draft_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cosmo_mail_draft_queue', JSON.stringify(mailDraftQueue));
  }, [mailDraftQueue]);

  // Modals & UI States
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('cosmo_user_name') || 'Anuj');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('cosmo_user_email') || 'anuj@cosmocnergy.com');

  // Single choice order modal for 1-tap reorder dispatch choice
  const [singleChoiceOrder, setSingleChoiceOrder] = useState<ProcurementOrder | null>(null);

  // Global Webmail Initial Compose State for direct deep routing
  const [webmailInitialCompose, setWebmailInitialCompose] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    context?: string;
    orderToConfirm?: any;
  } | null>(null);

  // Global WhatsApp and Webmail Modals State
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    supplier: Supplier;
    context?: string;
  } | null>(null);

  const [webmailModalData, setWebmailModalData] = useState<{
    supplier: Supplier;
    itemName?: string;
    specs?: string;
    qty?: number | string;
    context?: string;
    statusState?: string;
  } | null>(null);

  // Multi-vendor dispatch queue state
  const [multiVendorState, setMultiVendorState] = useState<{
    drafts: MultiSupplierPODraft[];
    type: 'PO' | 'RFQ';
  } | null>(null);

  // Supabase Auth & Realtime Data Listener
  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchSupabaseData();

      // Check initial auth session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const email = session.user.email || 'anuj@cosmocnergy.com';
          const name = session.user.user_metadata?.full_name || email.split('@')[0].toUpperCase();
          setUserName(name);
          setUserEmail(email);
        }
      });

      // Listen to auth state changes
      const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const email = session.user.email || 'anuj@cosmocnergy.com';
          const name = session.user.user_metadata?.full_name || email.split('@')[0].toUpperCase();
          setUserName(name);
          setUserEmail(email);
        } else if (!session && _event === 'SIGNED_OUT') {
          setUserName('');
          setUserEmail('');
        }
      });

      // Realtime listener for orders
      const channel = supabase
        .channel('procurement_orders_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'procurement_orders' },
          () => {
            fetchSupabaseOrders();
          }
        )
        .subscribe();

      return () => {
        authSub.unsubscribe();
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Database Sync & Category Persistence Hydration
  // Uses 'cat_rel' alias with fallback to direct text columns to ensure
  // categories and items load seamlessly under all schema states.
  const fetchSupabaseData = async () => {
    try {
      const { data: catgs, error: catgsErr } = await supabase.from('categories').select('*').order('name');
      if (catgsErr) console.error('[fetchSupabaseData] categories error:', catgsErr);
      if (catgs && catgs.length > 0) {
        setCategories(catgs);
        try { localStorage.setItem('cosmo_categories', JSON.stringify(catgs)); } catch {}
      }

      // 1. Fetch Suppliers (with graceful fallback if join fails)
      let loadedSupps: any[] | null = null;
      const { data: supps, error: suppsErr } = await supabase.from('suppliers').select('*, cat_rel:categories(id, name)');
      if (suppsErr) {
        console.warn('[fetchSupabaseData] Relational suppliers query failed, attempting standard select:', suppsErr);
        const { data: fallbackSupps } = await supabase.from('suppliers').select('*');
        if (fallbackSupps) loadedSupps = fallbackSupps;
      } else if (supps) {
        loadedSupps = supps;
      }

      if (loadedSupps) {
        const normalizedSupps = loadedSupps.map((s: any) => ({
          ...s,
          category: s.cat_rel?.name || s.category || 'General Supplier',
          category_id: s.cat_rel?.id || s.category_id
        }));
        normalizedSupps.forEach((s: any) => delete s.cat_rel);
        setSuppliers(normalizedSupps);
        try { localStorage.setItem('cosmo_suppliers', JSON.stringify(normalizedSupps)); } catch {}
      }

      // 2. Fetch Catalog Items (with graceful fallback if join fails)
      let loadedCats: any[] | null = null;
      const { data: cats, error: catsErr } = await supabase.from('catalog_items').select('*, cat_rel:categories(id, name)');
      if (catsErr) {
        console.warn('[fetchSupabaseData] Relational catalog query failed, attempting standard select:', catsErr);
        const { data: fallbackCats } = await supabase.from('catalog_items').select('*');
        if (fallbackCats) loadedCats = fallbackCats;
      } else if (cats) {
        loadedCats = cats;
      }

      if (loadedCats) {
        const normalizedCats = loadedCats.map((c: any) => ({
          ...c,
          category: c.cat_rel?.name || c.category || 'Battery Cells',
          category_id: c.cat_rel?.id || c.category_id
        }));
        normalizedCats.forEach((c: any) => delete c.cat_rel);
        setCatalog(normalizedCats);
        try { localStorage.setItem('cosmo_catalog', JSON.stringify(normalizedCats)); } catch {}
      }

      // 3. Fetch Product Folders
      const { data: flds, error: fldsErr } = await supabase.from('product_folders').select('*');
      if (fldsErr) console.error('[fetchSupabaseData] product_folders error:', fldsErr);
      if (flds) {
        setFolders(flds);
        try { localStorage.setItem('cosmo_folders', JSON.stringify(flds)); } catch {}
      }

      // 4. Fetch Product BOMs
      const { data: bomData, error: bomErr } = await supabase.from('product_boms').select('*');
      if (bomErr) console.error('[fetchSupabaseData] product_boms error:', bomErr);
      if (bomData) {
        setBoms(bomData);
        try { localStorage.setItem('cosmo_boms', JSON.stringify(bomData)); } catch {}
      }

      fetchSupabaseOrders();
    } catch (e) {
      console.warn('Failed to load Supabase data, utilizing dev state:', e);
    }
  };

  const fetchSupabaseOrders = async () => {
    try {
      const { data: ords, error: ordsErr } = await supabase
        .from('procurement_orders')
        .select('*, supplier:suppliers(*), items:order_items(*, item:catalog_items(*))')
        .order('created_at', { ascending: false });

      if (ordsErr) console.error('[fetchSupabaseOrders] error:', ordsErr);
      if (ords) {
        setOrders(ords);
        try { localStorage.setItem('cosmo_orders', JSON.stringify(ords)); } catch {}
      }
    } catch (e) {
      console.warn('Failed to load orders from Supabase:', e);
    }
  };

  // Logout handler with full session termination
  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUserName('');
    setUserEmail('');
    localStorage.clear();
    sessionStorage.clear();
    setIsAuthOpen(true);
  };

  // State/DB Sync: Product Folder creation
  const handleAddProductFolder = async (folderName: string) => {
    const newFolder: ProductFolder = {
      id: `f-${Date.now()}`,
      name: folderName,
      linked_po_ids: [],
      components: [],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('product_folders').insert(newFolder).select().single();
        if (error) {
          console.error('[Supabase INSERT product_folders failed]', error);
          throw new Error(`Failed to save product folder to database: ${error.message}`);
        }
        if (data) {
          setFolders(prev => [data, ...prev]);
          return data;
        }
      } catch (e: any) {
        console.error('Failed to insert folder in Supabase:', e);
        throw e;
      }
    }

    setFolders(prev => [newFolder, ...prev]);
    return newFolder;
  };

  // Update Folder Linked PO IDs
  const handleUpdateFolderLinkedPOs = async (folderId: string, poIds: string[]) => {
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, linked_po_ids: poIds } : f))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('product_folders')
          .update({ linked_po_ids: poIds })
          .eq('id', folderId);
      } catch (e) {
        console.warn('Failed to update folder linked POs in Supabase:', e);
      }
    }
  };

  // Synchronous Delete Product Folder Mutation: Await Supabase with .select() verification
  const handleDeleteProductFolder = async (folderId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('product_folders').delete().eq('id', folderId).select();
        if (error) {
          console.error('[DELETE product_folders failed]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
          throw new Error(`Failed to delete product folder (${error.code}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          console.warn(`[DELETE product_folders] 0 rows deleted in DB for ID: ${folderId}`);
        }
      } catch (err: any) {
        console.error('Delete folder exception:', err);
        throw err;
      }
    }
    setFolders(prev => {
      const updated = prev.filter(f => f.id !== folderId);
      try { localStorage.setItem('cosmo_folders', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Synchronous Delete Catalog Item Mutation: Await Supabase with cascade cleanup & .select() verification
  const handleDeleteCatalogItem = async (itemId: string) => {
    if (isSupabaseConfigured()) {
      try {
        // Cascade delete BOM entries for this raw material
        const { error: bomErr } = await supabase.from('product_boms').delete().eq('raw_material_id', itemId);
        if (bomErr) console.warn('[DELETE product_boms for item]', bomErr);

        const { data, error } = await supabase.from('catalog_items').delete().eq('id', itemId).select();
        if (error) {
          console.error('[DELETE catalog_items failed]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
          throw new Error(`Failed to delete catalog item (${error.code}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          console.warn(`[DELETE catalog_items] 0 rows deleted in DB for ID: ${itemId}`);
        }
      } catch (err: any) {
        console.error('Delete catalog item exception:', err);
        throw err;
      }
    }
    setCatalog(prev => {
      const updated = prev.filter(c => c.id !== itemId);
      try { localStorage.setItem('cosmo_catalog', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setBoms(prev => {
      const updated = prev.filter(b => b.raw_material_id !== itemId);
      try { localStorage.setItem('cosmo_boms', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Synchronous Delete Supplier Mutation: Await Supabase with .select() verification
  const handleDeleteSupplier = async (supplierId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('suppliers').delete().eq('id', supplierId).select();
        if (error) {
          console.error('[DELETE suppliers failed]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
          throw new Error(`Failed to delete supplier (${error.code}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          console.warn(`[DELETE suppliers] 0 rows deleted in DB for ID: ${supplierId}`);
        }
      } catch (err: any) {
        console.error('Delete supplier exception:', err);
        throw err;
      }
    }
    setSuppliers(prev => {
      const updated = prev.filter(s => s.id !== supplierId);
      try { localStorage.setItem('cosmo_suppliers', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Synchronous Delete Procurement Order Mutation: Await Supabase with line items & .select() verification
  const handleDeleteOrder = async (orderId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { error: itemsErr } = await supabase.from('order_items').delete().eq('order_id', orderId);
        if (itemsErr) console.warn('[DELETE order_items]', itemsErr);

        const { data, error } = await supabase.from('procurement_orders').delete().eq('id', orderId).select();
        if (error) {
          console.error('[DELETE procurement_orders failed]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
          throw new Error(`Failed to delete order (${error.code}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          console.warn(`[DELETE procurement_orders] 0 rows deleted in DB for ID: ${orderId}`);
        }
      } catch (e: any) {
        console.error('Failed to delete order in Supabase:', e);
        throw e;
      }
    }

    setOrders(prev => {
      const updated = prev.filter(o => o.id !== orderId);
      try { localStorage.setItem('cosmo_orders', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setFolders(prev => {
      const updated = prev.map(f => ({
        ...f,
        linked_po_ids: (f.linked_po_ids || []).filter(id => id !== orderId)
      }));
      try { localStorage.setItem('cosmo_folders', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Update Supplier Contact Info
  const handleUpdateSupplierPhone = async (supplierId: string, email: string, phone: string) => {
    setSuppliers(prev =>
      prev.map(s => (s.id === supplierId ? { ...s, email, phone, whatsapp: phone } : s))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('suppliers')
          .update({ email, phone, whatsapp: phone })
          .eq('id', supplierId);
      } catch (e) {
        console.warn('Failed to update supplier contact in Supabase:', e);
      }
    }
  };

  // Add Supplier with Category Relation & DB Persistence
  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    let categoryId = supplierData.category_id;
    if (!categoryId && supplierData.category) {
      const match = categories.find(c => c.name.toLowerCase() === supplierData.category!.toLowerCase());
      categoryId = match?.id;
    }

    const payload: any = {
      name: supplierData.name,
      contact_person: supplierData.contact_person || 'Sales Dept',
      email: supplierData.email,
      phone: supplierData.phone || '',
      whatsapp: supplierData.whatsapp || supplierData.phone || '',
      buying_url: supplierData.buying_url || '',
      address: supplierData.address || '',
      gstin: supplierData.gstin || '',
      payment_terms: supplierData.payment_terms || 'Net 30 Days',
      category: supplierData.category || 'General Supplier',
      category_id: categoryId || null,
      rating: 4.8
    };

    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('suppliers').insert(payload).select().single();
        
        // If FK violation on category_id, retry without category_id
        if (error && (error.code === '23503' || error.message?.includes('category_id'))) {
          console.warn('[Supabase INSERT supplier] Retrying without category_id FK:', error.message);
          const { category_id, ...fallbackPayload } = payload;
          const retryRes = await supabase.from('suppliers').insert(fallbackPayload).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[Supabase INSERT supplier failed]', error);
          throw new Error(`Failed to save supplier to database: ${error.message}`);
        }

        if (data) {
          const suppWithCategory = {
            ...data,
            category: supplierData.category || 'General Supplier'
          };
          setSuppliers(prev => [suppWithCategory, ...prev]);
          return suppWithCategory;
        }
      } catch (e: any) {
        console.error('Failed to add supplier in Supabase:', e);
        throw e;
      }
    }

    const newSupplier: Supplier = {
      id: `supp-${Date.now()}`,
      ...supplierData,
      rating: 4.8
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    return newSupplier;
  };

  // Update Supplier Attributes
  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => (s.id === updatedSupplier.id ? updatedSupplier : s)));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('suppliers')
          .update({
            name: updatedSupplier.name,
            contact_person: updatedSupplier.contact_person,
            email: updatedSupplier.email,
            phone: updatedSupplier.phone,
            whatsapp: updatedSupplier.whatsapp,
            buying_url: updatedSupplier.buying_url,
            address: updatedSupplier.address,
            category: updatedSupplier.category,
            category_id: updatedSupplier.category_id,
            rating: updatedSupplier.rating,
            gstin: updatedSupplier.gstin,
            payment_terms: updatedSupplier.payment_terms
          })
          .eq('id', updatedSupplier.id);
      } catch (e) {
        console.error('Failed to update supplier in Supabase:', e);
      }
    }
  };

  // Add Catalog Item with Category Normalization & DB Persistence
  const handleAddCatalogItem = async (itemData: Omit<CatalogItem, 'id'>) => {
    let categoryId = itemData.category_id;
    if (!categoryId && itemData.category) {
      const match = categories.find(c => c.name.toLowerCase() === itemData.category!.toLowerCase());
      categoryId = match?.id;
    }

    const payload: any = {
      name: itemData.name,
      category: itemData.category || 'Battery Cells',
      category_id: categoryId || null,
      specs: itemData.specs || '',
      uom: itemData.uom || 'Pcs',
      preset_price: Number(itemData.preset_price) || 0,
      in_stock_qty: Number(itemData.in_stock_qty) || 0,
      min_order_qty: Number(itemData.min_order_qty) || 1,
      supplier_id: itemData.supplier_id || null,
      procurement_status: itemData.procurement_status || 'TO_BE_ORDERED'
    };

    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('catalog_items').insert(payload).select().single();
        
        // If FK violation on category_id or supplier_id, retry without FK
        if (error && (error.code === '23503' || error.message?.includes('category_id') || error.message?.includes('supplier_id'))) {
          console.warn('[Supabase INSERT item] Retrying without category_id/supplier_id FK:', error.message);
          const { category_id, supplier_id, ...fallbackPayload } = payload;
          const retryRes = await supabase.from('catalog_items').insert(fallbackPayload).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[Supabase INSERT catalog_items failed]', error);
          throw new Error(`Failed to save component to database: ${error.message}`);
        }

        if (data) {
          const itemWithCategory = {
            ...data,
            category: itemData.category || 'Battery Cells'
          };
          setCatalog(prev => [itemWithCategory, ...prev]);
          return itemWithCategory;
        }
      } catch (e: any) {
        console.error('Failed to insert catalog item in Supabase:', e);
        throw e;
      }
    }

    const newItem: CatalogItem = {
      id: `cat-${Date.now()}`,
      ...itemData,
      category: itemData.category || 'Battery Cells'
    };
    setCatalog(prev => [newItem, ...prev]);
    return newItem;
  };

  // Update Catalog Item / Component (Explicit Category & Metadata Persistence)
  const handleUpdateCatalogItem = async (updatedItem: CatalogItem) => {
    // Resolve relational category_id if not present
    const matchedCat = categories.find(
      c => c.id === updatedItem.category_id || c.name.toLowerCase() === (updatedItem.category || '').toLowerCase()
    );
    const resolvedCatId = matchedCat?.id || updatedItem.category_id || null;
    const resolvedCatName = updatedItem.category || matchedCat?.name || 'Battery Cells';

    const normalizedItem: CatalogItem = {
      ...updatedItem,
      category: resolvedCatName,
      category_id: resolvedCatId || undefined
    };

    // Optimistic UI state update
    setCatalog(prev => prev.map(c => (c.id === normalizedItem.id ? normalizedItem : c)));

    // Explicit Supabase UPDATE query with resilience
    if (isSupabaseConfigured()) {
      try {
        const updatePayload: any = {
          name: normalizedItem.name,
          category: resolvedCatName,
          category_id: resolvedCatId,
          specs: normalizedItem.specs || '',
          uom: normalizedItem.uom || 'Pcs',
          preset_price: Number(normalizedItem.preset_price) || 0,
          in_stock_qty: Number(normalizedItem.in_stock_qty) || 0,
          min_order_qty: Number(normalizedItem.min_order_qty) || 1,
          supplier_id: normalizedItem.supplier_id || null,
          procurement_status: normalizedItem.procurement_status || 'TO_BE_ORDERED'
        };

        let { data, error } = await supabase
          .from('catalog_items')
          .update(updatePayload)
          .eq('id', normalizedItem.id)
          .select();

        // If FK violation on category_id, retry updating with category text column only
        if (error && (error.code === '23503' || error.message?.includes('category_id'))) {
          console.warn('[Supabase UPDATE] Retrying update with category text column fallback:', error.message);
          const { category_id, ...fallbackPayload } = updatePayload;
          const retryRes = await supabase
            .from('catalog_items')
            .update(fallbackPayload)
            .eq('id', normalizedItem.id)
            .select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[Supabase UPDATE catalog_items failed]', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        } else {
          console.info(`[Supabase UPDATE] Successfully persisted component "${normalizedItem.name}" with category: ${resolvedCatName}`);
        }
      } catch (e: any) {
        console.error('Failed to update catalog item in Supabase:', e?.message || e);
      }
    }
  };

  // CSV Import Batch Handlers
  const handleImportComponents = async (rows: any[]): Promise<number> => {
    const importedItems: CatalogItem[] = rows.map((row, idx) => {
      let suppId = row.supplier_id;
      if (!suppId && row.supplier_name) {
        const found = suppliers.find(s => s.name.toLowerCase() === row.supplier_name.toLowerCase());
        if (found) suppId = found.id;
      }
      return {
        id: `cat-${Date.now()}-${idx}`,
        name: row.name,
        category: row.category || 'Battery Cells',
        specs: row.specs || '',
        uom: row.uom || 'Pcs',
        preset_price: Number(row.preset_price) || 0,
        in_stock_qty: Number(row.in_stock_qty) || 100,
        min_order_qty: Number(row.min_order_qty) || 1,
        supplier_id: suppId || suppliers[0]?.id || '',
        procurement_status: row.procurement_status || 'TO_BE_ORDERED'
      };
    });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('catalog_items').upsert(importedItems);
      } catch (e) {
        console.warn('Batch insert catalog_items to Supabase error:', e);
      }
    }

    setCatalog(prev => [...importedItems, ...prev]);
    return importedItems.length;
  };

  const handleImportOrders = async (rows: any[]): Promise<number> => {
    const importedOrders: ProcurementOrder[] = rows.map((row, idx) => {
      const supp = suppliers.find(s => s.id === row.supplier_id || s.name.toLowerCase() === (row.supplier_name || '').toLowerCase());
      return {
        id: `po-${Date.now()}-${idx}`,
        order_number: row.order_number,
        supplier_id: supp?.id || suppliers[0]?.id || '',
        supplier: supp || suppliers[0],
        type: row.type || 'PO',
        status: row.status || 'ORDERED',
        total_amount: Number(row.total_amount) || 0,
        notes: row.notes || 'Imported via CSV',
        created_by: row.created_by || userName,
        created_at: new Date().toISOString()
      };
    });

    if (isSupabaseConfigured()) {
      try {
        const payload = importedOrders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          supplier_id: o.supplier_id,
          type: o.type,
          status: o.status,
          total_amount: o.total_amount,
          notes: o.notes,
          created_by: o.created_by,
          created_at: o.created_at
        }));
        await supabase.from('procurement_orders').upsert(payload);
      } catch (e) {
        console.warn('Batch insert procurement_orders to Supabase error:', e);
      }
    }

    setOrders(prev => [...importedOrders, ...prev]);
    return importedOrders.length;
  };

  const handleImportSuppliers = async (rows: any[]): Promise<number> => {
    const importedSupps: Supplier[] = rows.map((row, idx) => ({
      id: `supp-${Date.now()}-${idx}`,
      name: row.name,
      contact_person: row.contact_person || 'Sales Dept',
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp || row.phone,
      category: row.category || 'General Supplier',
      gstin: row.gstin || '',
      payment_terms: row.payment_terms || 'Net 30 Days',
      address: row.address || '',
      buying_url: row.buying_url || '',
      rating: Number(row.rating) || 4.8
    }));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('suppliers').upsert(importedSupps);
      } catch (e) {
        console.warn('Batch insert suppliers to Supabase error:', e);
      }
    }

    setSuppliers(prev => [...importedSupps, ...prev]);
    return importedSupps.length;
  };

  // Update Order Details from PDF Editor
  const handleUpdateOrder = async (updatedOrder: ProcurementOrder) => {
    setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('procurement_orders')
          .update({
            order_number: updatedOrder.order_number,
            type: updatedOrder.type,
            status: updatedOrder.status,
            total_amount: updatedOrder.total_amount,
            notes: updatedOrder.notes,
            created_by: updatedOrder.created_by
          })
          .eq('id', updatedOrder.id);

        if (updatedOrder.items && updatedOrder.items.length > 0) {
          for (const it of updatedOrder.items) {
            await supabase.from('order_items').upsert({
              id: it.id,
              order_id: updatedOrder.id,
              item_id: it.item_id,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.total_price
            });
          }
        }
      } catch (e) {
        console.warn('Failed to update order in Supabase:', e);
      }
    }
  };

  // Component-Level Reorder Trigger (Targets only component-specific supplier)
  const handleQuickReorderItem = (item: CatalogItem, qty: number) => {
    const supplier = suppliers.find(s => s.id === item.supplier_id) || suppliers[0];

    const draft: MultiSupplierPODraft = {
      supplier,
      items: [
        {
          catalogItem: item,
          quantity: qty,
          unit_price: item.preset_price || 0,
          total_price: qty * (item.preset_price || 0)
        }
      ],
      total_amount: qty * (item.preset_price || 0)
    };

    handleDispatchOrders([draft], 'PO');
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o))
    );

    if (isSupabaseConfigured()) {
      await supabase.from('procurement_orders').update({ status: newStatus }).eq('id', orderId);
    }
  };

  // Update Product Folder Recipe Components
  const handleUpdateFolderComponents = async (folderId: string, components: ProductFolderComponent[]) => {
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, components } : f))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('product_folders')
          .update({ components })
          .eq('id', folderId);
      } catch (e) {
        console.warn('Failed to update product folder components in Supabase:', e);
      }
    }
  };

  // Dispatch Multi-Supplier Orders & Sync with Product Folder
  const handleDispatchOrders = async (drafts: MultiSupplierPODraft[], type: 'PO' | 'RFQ') => {
    const newOrders: ProcurementOrder[] = [];

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const orderId = `po-${Date.now()}-${i}`;
      const orderNumber = `${type}-${new Date().getFullYear()}-${(orders.length + i + 1).toString().padStart(4, '0')}`;

      const newOrder: ProcurementOrder = {
        id: orderId,
        order_number: orderNumber,
        supplier_id: draft.supplier.id,
        supplier: draft.supplier,
        type,
        status: type === 'PO' ? 'ORDERED' : 'RFQ_SENT',
        total_amount: draft.total_amount,
        notes: `Automated ${type} dispatch via 1-Tap BOM Procurement OS`,
        created_by: userName,
        created_at: new Date().toISOString(),
        items: draft.items.map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          order_id: orderId,
          item_id: it.catalogItem.id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          item: it.catalogItem
        }))
      };

      newOrders.push(newOrder);

      // Save to Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('procurement_orders').insert({
            id: newOrder.id,
            order_number: newOrder.order_number,
            supplier_id: newOrder.supplier_id,
            type: newOrder.type,
            status: newOrder.status,
            total_amount: newOrder.total_amount,
            notes: newOrder.notes,
            created_by: newOrder.created_by,
            created_at: newOrder.created_at
          });

          const orderItemsPayload = (newOrder.items || []).map(it => ({
            id: it.id,
            order_id: it.order_id,
            item_id: it.item_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price
          }));

          await supabase.from('order_items').insert(orderItemsPayload);
        } catch (e) {
          console.warn('Failed to insert orders into Supabase:', e);
        }
      }
    }

    setOrders(prev => [...newOrders, ...prev]);
    setActiveTab('orders');

    if (newOrders.length === 1) {
      setSingleChoiceOrder(newOrders[0]);
    }
  };

  // Persistent Mail Draft Queue Enqueue Handler
  const handleEnqueueMailDrafts = (drafts: QueuedMailDraft[], openFirstImmediately = true) => {
    if (drafts.length === 0) return;

    if (openFirstImmediately) {
      const first = drafts[0];
      const remaining = drafts.slice(1);
      setMailDraftQueue(remaining);

      setWebmailInitialCompose({
        to: first.to,
        subject: first.subject,
        body: first.body,
        context: first.context,
        orderToConfirm: first.orderToConfirm
      });
      setActiveTab('webmail');
    } else {
      setMailDraftQueue(prev => [...prev, ...drafts]);
    }
  };

  const handlePopMailDraftQueue = (id: string) => {
    setMailDraftQueue(prev => prev.filter(d => d.id !== id));
  };

  const handleClearMailDraftQueue = () => {
    setMailDraftQueue([]);
  };

  const handleClearInitialCompose = () => {
    setWebmailInitialCompose(null);
  };

  // Internal Webmail Global Routing
  const handleOpenWebmail = (
    supplier: Supplier,
    itemName?: string,
    specs?: string,
    qty?: number | string,
    context?: string,
    statusState?: string
  ) => {
    const orderType = determineOrderType(context || 'CATALOG_BOM', statusState);
    const subject = formatProcurementSubject(orderType, itemName || 'Battery Components');
    const defaultBody = `Dear Sales Team (${supplier.name}),\n\nWe at Cosmo Cnergy would like to request an official ${orderType} for the following:\n\n• Item: ${itemName || 'Catalog Component'}\n• Specifications: ${specs || 'Standard industrial spec'}\n• Quantity Required: ${qty || 100}\n\nPlease confirm availability, GST rates, and delivery schedule to Pune plant.\n\nBest regards,\n${userName}\nCosmo Cnergy`;

    setWebmailInitialCompose({
      to: supplier.email || '',
      subject,
      body: defaultBody,
      context
    });
    setActiveTab('webmail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EEE8D5] text-[#073642] selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBOMModal={() => setIsBOMModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        userName={userName}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Tab Views */}
        {activeTab === 'catalog' && (
          <CatalogSection
            catalog={catalog}
            suppliers={suppliers}
            orders={orders}
            folders={folders}
            boms={boms}
            categories={categories}
            onAddCatalogItem={handleAddCatalogItem}
            onUpdateCatalogItem={handleUpdateCatalogItem}
            onAddProductFolder={handleAddProductFolder}
            onUpdateFolderLinkedPOs={handleUpdateFolderLinkedPOs}
            onUpdateFolderComponents={handleUpdateFolderComponents}
            onUpdateSupplierContact={handleUpdateSupplierPhone}
            onLogOrders={drafts => handleDispatchOrders(drafts, 'PO')}
            onDeleteProductFolder={handleDeleteProductFolder}
            onDeleteOrder={handleDeleteOrder}
            onDeleteCatalogItem={handleDeleteCatalogItem}
            onQuickReorder={handleQuickReorderItem}
            onOpenWhatsApp={(supplier, context) => setWhatsAppModalData({ supplier, context })}
            onOpenWebmail={handleOpenWebmail}
            onEnqueueMailDrafts={handleEnqueueMailDrafts}
            onImportComponents={handleImportComponents}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierDashboard
            suppliers={suppliers}
            catalog={catalog}
            categories={categories}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onImportSuppliers={handleImportSuppliers}
          />
        )}

        {activeTab === 'ai' && (
          <AIProcurementStudio
            catalog={catalog}
            suppliers={suppliers}
            onGenerateOrderFromAI={drafts => handleDispatchOrders(drafts, 'PO')}
          />
        )}

        {activeTab === 'orders' && (
          <OrderHistoryTimeline
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onOpenWhatsApp={(supplier, context) => setWhatsAppModalData({ supplier, context })}
            onOpenWebmail={handleOpenWebmail}
            onImportOrders={handleImportOrders}
          />
        )}

        {activeTab === 'webmail' && (
          <Webmail
            currentUser={userName}
            onOpenAuth={() => setIsAuthOpen(true)}
            initialCompose={webmailInitialCompose}
            onSendSuccess={orderToConfirm => {
              if (orderToConfirm) {
                handleDispatchOrders(orderToConfirm.drafts, orderToConfirm.type);
              }
            }}
            mailDraftQueue={mailDraftQueue}
            onPopMailDraftQueue={handlePopMailDraftQueue}
            onClearMailDraftQueue={handleClearMailDraftQueue}
            onClearInitialCompose={handleClearInitialCompose}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-[#1e3e62] py-6 text-center text-xs text-slate-300 bg-[#0B192C]">
        <p>CosmoCnergy Procurement OS — Datlion Cnergy Enterprise Edition</p>
      </footer>

      {/* Global Modals */}
      {isBOMModalOpen && (
        <BOMProcurementModal
          catalog={catalog}
          boms={boms}
          suppliers={suppliers}
          folders={folders}
          orders={orders}
          onClose={() => setIsBOMModalOpen(false)}
          onDispatchOrders={handleDispatchOrders}
          onOpenWebmail={handleOpenWebmail}
          onEnqueueMailDrafts={handleEnqueueMailDrafts}
        />
      )}

      {/* WhatsApp Smart Modal */}
      {whatsAppModalData && (
        <WhatsAppSmartModal
          supplier={whatsAppModalData.supplier}
          itemNameOrContext={whatsAppModalData.context}
          onClose={() => setWhatsAppModalData(null)}
          onUpdateSupplierPhone={async (supplierId: string, phone: string) => {
            await handleUpdateSupplierPhone(supplierId, whatsAppModalData.supplier.email || '', phone);
          }}
        />
      )}

      {/* Native Webmail Dispatcher Modal */}
      {webmailModalData && (
        <NativeWebmailModal
          supplier={webmailModalData.supplier}
          itemName={webmailModalData.itemName}
          itemSpecs={webmailModalData.specs}
          quantity={webmailModalData.qty}
          context={webmailModalData.context}
          statusState={webmailModalData.statusState}
          onClose={() => setWebmailModalData(null)}
          onSuccess={() => {
            console.log('Dispatched successfully from modal');
          }}
        />
      )}

      {multiVendorState && (
        <MultiVendorDispatchModal
          drafts={multiVendorState.drafts}
          type={multiVendorState.type}
          onClose={() => setMultiVendorState(null)}
          onConfirmAll={async (drafts, type) => {
            await handleDispatchOrders(drafts, type);
            setMultiVendorState(null);
          }}
          onOpenWebmail={handleOpenWebmail}
        />
      )}

      {singleChoiceOrder && (
        <ChannelChoiceModal
          order={singleChoiceOrder}
          onClose={() => setSingleChoiceOrder(null)}
          onOpenWebmail={handleOpenWebmail}
        />
      )}

      {/* Global Ctrl+K Universal Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        catalog={catalog}
        folders={folders}
        suppliers={suppliers}
        boms={boms}
        onNavigateTab={tab => setActiveTab(tab)}
        onOpenWebmail={handleOpenWebmail}
      />

      {/* Authentication Modal */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onLogin={(name, email) => {
            setUserName(name);
            setUserEmail(email);
          }}
        />
      )}
    </div>
  );
};
