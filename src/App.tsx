import { Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  CatalogItem,
  Company,
  ProcurementOrder,
  OrderStatus,
  ProductFolder,
  ProductBOM,
  MultiCompanyPODraft,
  ProductFolderComponent,
  QueuedMailDraft,
  determineOrderType,
  formatProcurementSubject,
  Category,
  ComponentCompany,
  NavigationTab
} from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ComponentComparisonPage } from './components/ComponentComparisonPage';
import { Header } from './components/Header';
import { CatalogSection } from './components/CatalogSection';
import { CompanyDashboard } from './components/CompanyDashboard';
import { AIProcurementStudio } from './components/AIProcurementStudio';
import { OrderHistoryTimeline } from './components/OrderHistoryTimeline';
import { BOMProcurementModal } from './components/BOMProcurementModal';
import { Webmail } from './components/Webmail';
import { MailQueueManager } from './components/MailQueueManager';
import { useMailQueue } from './context/MailQueueContext';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { WhatsAppSmartModal } from './components/WhatsAppSmartModal';
import { NativeWebmailModal } from './components/NativeWebmailModal';
import { MultiVendorDispatchModal } from './components/MultiVendorDispatchModal';
import { ChannelChoiceModal } from './components/ChannelChoiceModal';
import { CompanyComparisonDrawer } from './components/CompanyComparisonDrawer';

// Initial Mock Seed Data
import {
  INITIAL_CATALOG,
  INITIAL_SUPPLIERS,
  INITIAL_BOMS,
  INITIAL_FOLDERS,
  INITIAL_ORDERS,
  INITIAL_COMPONENT_SUPPLIERS
} from './services/mockData';

export const App: React.FC = () => {
  // Navigation State — Procurement as default main landing view
  const [activeTab, setActiveTab] = useState<NavigationTab>('procurement');
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const rawPath = location.pathname.toLowerCase();
    const segments = rawPath.split('/').filter(Boolean);
    const firstSegment = segments[0] || '';

    if (firstSegment === 'companies') setActiveTab('companies');
    else if (firstSegment === 'ai') setActiveTab('ai');
    else if (firstSegment === 'procurement') setActiveTab('procurement');
    else if (firstSegment === 'webmail') setActiveTab('webmail');
    else if (firstSegment === 'inventory' || firstSegment === '') setActiveTab('inventory');
    else setActiveTab('inventory');
  }, [location.pathname]);

  const handleUpdateComponentCompany = (
    linkId: string,
    field: 'rfq_quoted_price' | 'moq' | 'lead_time_days' | 'unit_price',
    value: number
  ) => {
    setComponentCompanies(prev => {
      const next = prev.map(cc => {
        if (cc.id === linkId) {
          return {
            ...cc,
            [field]: value,
            ...(field === 'rfq_quoted_price' ? { unit_price: value } : {})
          };
        }
        return cc;
      });
      try {
        localStorage.setItem('cosmo_component_companies', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === 'inventory') navigate('/');
    else navigate('/' + tab);
  };

  // Core Data States
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-1', name: 'Capacitor' },
    { id: 'cat-2', name: 'Resistor' },
    { id: 'cat-3', name: 'Diode' },
    { id: 'cat-4', name: 'IC' },
    { id: 'cat-5', name: 'IGBT' },
    { id: 'cat-6', name: 'Transistor' },
    { id: 'cat-7', name: 'Mosfet' },
    { id: 'cat-8', name: 'Micro-Controller' },
    { id: 'cat-9', name: 'Triac' },
    { id: 'cat-10', name: 'IC Base' },
    { id: 'cat-11', name: 'Connector' },
    { id: 'cat-12', name: 'Push Button' },
    { id: 'cat-13', name: 'MOV' },
    { id: 'cat-14', name: 'Coil' },
    { id: 'cat-15', name: 'Regulator' },
    { id: 'cat-16', name: 'Fuse' },
    { id: 'cat-17', name: 'Drill Bit' }
  ]);
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('cosmo_catalog');
    let items: CatalogItem[] = saved ? JSON.parse(saved) : INITIAL_CATALOG;
    const catRemap: Record<string, string> = {
      'Battery Cells': 'Capacitor',
      'Electronics / BMS': 'Micro-Controller',
      'Connectors & Busbars': 'Connector',
      'Metal Enclosures': 'Push Button',
      'Wiring & Harnesses': 'Connector',
      'General Company': 'Capacitor',
      'General Supplier': 'Capacitor'
    };
    return items.map(it => ({
      ...it,
      category: catRemap[it.category || ''] || it.category || 'Capacitor'
    }));
  });
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('cosmo_companies');
    let items: Company[] = saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    const catRemap: Record<string, string> = {
      'Battery Cells': 'Capacitor',
      'Electronics / BMS': 'Micro-Controller',
      'Connectors & Busbars': 'Connector',
      'Metal Enclosures': 'Push Button',
      'Wiring & Harnesses': 'Connector',
      'General Company': 'Capacitor',
      'General Supplier': 'Capacitor'
    };
    return items.map(s => ({
      ...s,
      category: catRemap[s.category || ''] || s.category || 'Capacitor',
      categories: (s.categories || [s.category || 'Capacitor']).map(c => catRemap[c] || c)
    }));
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
  const [componentCompanies, setComponentCompanies] = useState<ComponentCompany[]>(() => {
    try {
      const saved = localStorage.getItem('cosmo_component_companies');
      return saved ? JSON.parse(saved) : INITIAL_COMPONENT_SUPPLIERS;
    } catch {
      return INITIAL_COMPONENT_SUPPLIERS;
    }
  });
  const [comparisonComponent, setComparisonComponent] = useState<CatalogItem | null>(null);

  // Persistent Synchronization to LocalStorage to prevent stale mock data on refresh
  useEffect(() => {
    try {
      localStorage.setItem('cosmo_catalog', JSON.stringify(catalog));
    } catch {}
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_companies', JSON.stringify(companies));
    } catch {}
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem('cosmo_component_companies', JSON.stringify(componentCompanies));
    } catch {}
  }, [componentCompanies]);

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
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('cosmo_user_name') || '');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('cosmo_user_email') || '');

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
    company: Company;
    context?: string;
  } | null>(null);

  const [webmailModalData, setWebmailModalData] = useState<{
    company: Company;
    itemName?: string;
    specs?: string;
    qty?: number | string;
    context?: string;
    statusState?: string;
  } | null>(null);

  // Multi-vendor dispatch queue state
  const [multiVendorState, setMultiVendorState] = useState<{
    drafts: MultiCompanyPODraft[];
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
      const legacyToExclude = new Set([
        'Battery Cells',
        'Connectors & Busbars',
        'Electronics / BMS',
        'General Supplier',
        'General Company',
        'Metal Enclosures',
        'Wiring & Harnesses'
      ]);
      const catRemap: Record<string, string> = {
        'Battery Cells': 'Capacitor',
        'Electronics / BMS': 'Micro-Controller',
        'Connectors & Busbars': 'Connector',
        'Metal Enclosures': 'Push Button',
        'Wiring & Harnesses': 'Connector',
        'General Company': 'Capacitor',
        'General Supplier': 'Capacitor'
      };

      if (catgs && catgs.length > 0) {
        const filteredCatgs = catgs.filter((c: any) => !legacyToExclude.has(c.name));
        setCategories(filteredCatgs.length > 0 ? filteredCatgs : catgs);
        try { localStorage.setItem('cosmo_categories', JSON.stringify(filteredCatgs)); } catch {}
      }

      // 1. Fetch Companies (with graceful fallback if join fails)
      let loadedSupps: any[] | null = null;
      const { data: supps, error: suppsErr } = await supabase.from('companies').select('*, cat_rel:categories(id, name)');
      if (suppsErr) {
        console.warn('[fetchSupabaseData] Relational companies query failed, attempting standard select:', suppsErr);
        const { data: fallbackSupps } = await supabase.from('companies').select('*');
        if (fallbackSupps) loadedSupps = fallbackSupps;
      } else if (supps) {
        loadedSupps = supps;
      }

      if (loadedSupps) {
        const normalizedSupps = loadedSupps.map((s: any) => {
          const rawCat = s.cat_rel?.name || s.category || 'Capacitor';
          const cleanCat = catRemap[rawCat] || rawCat;
          const cleanCats = (s.categories || [cleanCat])
            .map((c: string) => catRemap[c] || c)
            .filter((c: string) => !legacyToExclude.has(c));

          return {
            ...s,
            category: cleanCat,
            categories: cleanCats.length > 0 ? cleanCats : ['Capacitor'],
            category_id: s.cat_rel?.id || s.category_id
          };
        });
        normalizedSupps.forEach((s: any) => delete s.cat_rel);
        setCompanies(normalizedSupps);
        try { localStorage.setItem('cosmo_companies', JSON.stringify(normalizedSupps)); } catch {}
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
        const normalizedCats = loadedCats.map((c: any) => {
          const rawCat = c.cat_rel?.name || c.category || 'Capacitor';
          const cleanCat = catRemap[rawCat] || rawCat;
          return {
            ...c,
            category: cleanCat,
            category_id: c.cat_rel?.id || c.category_id
          };
        });
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

      // 5. Fetch Component Companies Junction Table
      try {
        const { data: compSupps, error: csErr } = await supabase.from('component_companies').select('*');
        if (!csErr && compSupps && compSupps.length > 0) {
          setComponentCompanies(compSupps);
          try { localStorage.setItem('cosmo_component_companies', JSON.stringify(compSupps)); } catch {}
        }
      } catch (e) {
        console.warn('[fetchSupabaseData] component_companies query:', e);
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
        .select('*, company:companies(*), items:order_items(*, item:catalog_items(*))')
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
    const currentEmail = userEmail;
    
    // Preserve webmail accounts
    const webmailAccounts = localStorage.getItem('cosmo_webmail_accounts');
    
    setUserName('');
    setUserEmail('');
    localStorage.clear();
    sessionStorage.clear();
    
    if (currentEmail) {
      localStorage.setItem('lastLoginEmail', currentEmail);
    }
    if (webmailAccounts) {
      localStorage.setItem('cosmo_webmail_accounts', webmailAccounts);
    }
    
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

  // Synchronous Delete Company Mutation: Await Supabase with .select() verification
  const handleDeleteCompany = async (companyId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('companies').delete().eq('id', companyId).select();
        if (error) {
          console.error('[DELETE companies failed]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
          throw new Error(`Failed to delete company (${error.code}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          console.warn(`[DELETE companies] 0 rows deleted in DB for ID: ${companyId}`);
        }
      } catch (err: any) {
        console.error('Delete company exception:', err);
        throw err;
      }
    }
    setCompanies(prev => {
      const updated = prev.filter(s => s.id !== companyId);
      try { localStorage.setItem('cosmo_companies', JSON.stringify(updated)); } catch {}
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

  // Update Company Contact Info
  const handleUpdateCompanyPhone = async (companyId: string, email: string, phone: string) => {
    setCompanies(prev =>
      prev.map(s => (s.id === companyId ? { ...s, email, phone, whatsapp: phone } : s))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('companies')
          .update({ email, phone, whatsapp: phone })
          .eq('id', companyId);
      } catch (e) {
        console.warn('Failed to update company contact in Supabase:', e);
      }
    }
  };

  // Add Company with Category Relation & DB Persistence
  const handleAddCompany = async (companyData: Omit<Company, 'id'>) => {
    let categoryId = companyData.category_id;
    if (!categoryId && companyData.category) {
      const match = categories.find(c => c.name.toLowerCase() === companyData.category!.toLowerCase());
      categoryId = match?.id;
    }

    const payload: any = {
      name: companyData.name,
      contact_person: companyData.contact_person || 'Sales Dept',
      email: companyData.email,
      phone: companyData.phone || '',
      whatsapp: companyData.whatsapp || companyData.phone || '',
      buying_url: companyData.buying_url || '',
      address: companyData.address || '',
      gstin: companyData.gstin || '',
      payment_terms: companyData.payment_terms || 'Net 30 Days',
      category: companyData.category || 'General Company',
      category_id: categoryId || null,
      rating: 4.8
    };

    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('companies').insert(payload).select().single();
        
        // If FK violation on category_id, retry without category_id
        if (error && (error.code === '23503' || error.message?.includes('category_id'))) {
          console.warn('[Supabase INSERT company] Retrying without category_id FK:', error.message);
          const { category_id, ...fallbackPayload } = payload;
          const retryRes = await supabase.from('companies').insert(fallbackPayload).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[Supabase INSERT company failed]', error);
          throw new Error(`Failed to save company to database: ${error.message}`);
        }

        if (data) {
          const suppWithCategory = {
            ...data,
            category: companyData.category || 'General Company'
          };
          setCompanies(prev => [suppWithCategory, ...prev]);
          return suppWithCategory;
        }
      } catch (e: any) {
        console.error('Failed to add company in Supabase:', e);
        throw e;
      }
    }

    const newCompany: Company = {
      id: `supp-${Date.now()}`,
      ...companyData,
      rating: 4.8
    };
    setCompanies(prev => [newCompany, ...prev]);
    return newCompany;
  };

  // Update Company Attributes
  const handleUpdateCompany = async (updatedCompany: Company) => {
    setCompanies(prev => prev.map(s => (s.id === updatedCompany.id ? updatedCompany : s)));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('companies')
          .update({
            name: updatedCompany.name,
            contact_person: updatedCompany.contact_person,
            email: updatedCompany.email,
            phone: updatedCompany.phone,
            whatsapp: updatedCompany.whatsapp,
            buying_url: updatedCompany.buying_url,
            address: updatedCompany.address,
            category: updatedCompany.category,
            category_id: updatedCompany.category_id,
            rating: updatedCompany.rating,
            gstin: updatedCompany.gstin,
            payment_terms: updatedCompany.payment_terms
          })
          .eq('id', updatedCompany.id);
      } catch (e) {
        console.error('Failed to update company in Supabase:', e);
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
      category: itemData.category || 'Capacitor',
      category_id: categoryId || null,
      specs: itemData.specs || '',
      uom: itemData.uom || 'Pcs',
      preset_price: Number(itemData.preset_price) || 0,
      in_stock_qty: Number(itemData.in_stock_qty) || 0,
      min_order_qty: Number(itemData.min_order_qty) || 1,
      company_id: itemData.company_id || (itemData.company_ids && itemData.company_ids[0]) || null,
      procurement_status: itemData.procurement_status || 'TO_BE_ORDERED',
      image_drive_url: itemData.image_drive_url || null
    };

    let savedItem: CatalogItem;

    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('catalog_items').insert(payload).select().single();
        
        // If FK violation on category_id or company_id, retry without FK
        if (error && (error.code === '23503' || error.message?.includes('category_id') || error.message?.includes('company_id'))) {
          console.warn('[Supabase INSERT item] Retrying without category_id/company_id FK:', error.message);
          const { category_id, company_id, ...fallbackPayload } = payload;
          const retryRes = await supabase.from('catalog_items').insert(fallbackPayload).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.error('[Supabase INSERT catalog_items failed]', error);
          throw new Error(`Failed to save component to database: ${error.message}`);
        }

        savedItem = {
          ...data,
          category: itemData.category || 'Capacitor',
          company_ids: itemData.company_ids,
          company_mappings: itemData.company_mappings,
          image_drive_url: itemData.image_drive_url
        };
      } catch (e: any) {
        console.error('Failed to insert catalog item in Supabase, using local state:', e);
        savedItem = {
          id: `cat-${Date.now()}`,
          ...itemData,
          category: itemData.category || 'Capacitor'
        };
      }
    } else {
      savedItem = {
        id: `cat-${Date.now()}`,
        ...itemData,
        category: itemData.category || 'Capacitor'
      };
    }

    // Persist Multi-Company Junction records in component_companies
    const mappings = itemData.company_mappings || (itemData.company_ids || []).map(sId => ({
      company_id: sId,
      unit_price: Number(itemData.preset_price) || 0,
      rfq_quoted_price: Number(itemData.preset_price) || 0,
      moq: Number(itemData.min_order_qty) || 1,
      lead_time_days: 7,
      part_number_vendor: itemData.sku || 'OEM-SPEC'
    }));

    if (mappings.length > 0) {
      const newJunctions: ComponentCompany[] = mappings.map((m, idx) => {
        const companyObj = companies.find(s => s.id === m.company_id);
        return {
          id: `cs-${Date.now()}-${idx}`,
          component_id: savedItem.id,
          company_id: m.company_id,
          unit_price: Number(m.unit_price) || Number(savedItem.preset_price) || 0,
          rfq_quoted_price: Number(m.rfq_quoted_price) || Number(m.unit_price) || Number(savedItem.preset_price) || 0,
          moq: Number(m.moq) || Number(savedItem.min_order_qty) || 1,
          lead_time_days: Number(m.lead_time_days) || 7,
          part_number_vendor: m.part_number_vendor || savedItem.sku || 'OEM-SPEC',
          external_rating: companyObj?.rating || 4.5,
          review_summary: `Directly associated vendor for ${savedItem.name}.`,
          rating_sources: {
            indiamart: Number((companyObj?.rating || 4.5).toFixed(1)),
            google_maps: Number(Math.max(1, (companyObj?.rating || 4.5) - 0.2).toFixed(1)),
            amazon: Number((companyObj?.rating || 4.5).toFixed(1))
          },
          company: companyObj
        };
      });

      setComponentCompanies(prev => [...newJunctions, ...prev]);

      if (isSupabaseConfigured()) {
        try {
          const dbPayload = newJunctions.map(({ company, ...rest }) => rest);
          await supabase.from('component_companies').upsert(dbPayload);
        } catch (csErr) {
          console.warn('[Supabase component_companies insert]:', csErr);
        }
      }
    }

    setCatalog(prev => [savedItem, ...prev]);
    return savedItem;
  };

  // Update Catalog Item / Component (Explicit Category & Metadata Persistence)
  const handleUpdateCatalogItem = async (updatedItem: CatalogItem) => {
    // Resolve relational category_id if not present
    const matchedCat = categories.find(
      c => c.id === updatedItem.category_id || c.name.toLowerCase() === (updatedItem.category || '').toLowerCase()
    );
    const resolvedCatId = matchedCat?.id || updatedItem.category_id || null;
    const resolvedCatName = updatedItem.category || matchedCat?.name || 'Capacitor';

    const normalizedItem: CatalogItem = {
      ...updatedItem,
      category: resolvedCatName,
      category_id: resolvedCatId || undefined
    };

    // Optimistic UI state update
    setCatalog(prev => prev.map(c => (c.id === normalizedItem.id ? normalizedItem : c)));

    // Sync component_companies state and Supabase table if mappings/ids exist
    const mappings = normalizedItem.company_mappings || (normalizedItem.company_ids ? normalizedItem.company_ids.map(cid => ({
      company_id: cid,
      unit_price: normalizedItem.preset_price ?? 0,
      rfq_quoted_price: normalizedItem.preset_price ?? 0,
      moq: normalizedItem.min_order_qty ?? 1,
      lead_time_days: 7,
      part_number_vendor: 'OEM-SPEC'
    })) : []);

    if (mappings.length > 0) {
      const newJunctions: ComponentCompany[] = mappings.map(m => {
        const companyObj = companies.find(s => s.id === m.company_id);
        return {
          id: `cc-${normalizedItem.id}-${m.company_id}`,
          component_id: normalizedItem.id,
          company_id: m.company_id,
          unit_price: m.unit_price ?? m.rfq_quoted_price ?? normalizedItem.preset_price ?? 0,
          rfq_quoted_price: m.rfq_quoted_price ?? m.unit_price ?? normalizedItem.preset_price ?? 0,
          moq: m.moq ?? normalizedItem.min_order_qty ?? 1,
          lead_time_days: m.lead_time_days ?? 7,
          part_number_vendor: m.part_number_vendor ?? 'OEM-SPEC',
          external_rating: companyObj?.rating || 4.5,
          review_summary: `Directly associated vendor for ${normalizedItem.name}.`,
          company: companyObj
        };
      });

      // Update componentCompanies state immediately
      setComponentCompanies(prev => {
        const filtered = prev.filter(cc => cc.component_id !== normalizedItem.id);
        const updated = [...newJunctions, ...filtered];
        try {
          localStorage.setItem('cosmo_component_companies', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Update component_companies in Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('component_companies').delete().eq('component_id', normalizedItem.id);
          await supabase.from('component_companies').upsert(newJunctions);
        } catch (csErr) {
          console.warn('[Supabase component_companies update error]:', csErr);
        }
      }
    }

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
          company_id: normalizedItem.company_id || null,
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
    const importedItems: CatalogItem[] = [];
    const newJunctions: ComponentCompany[] = [];

    rows.forEach((row, idx) => {
      let suppId = row.company_id;
      if (!suppId && row.company_name) {
        const found = companies.find(s => s.name.toLowerCase() === row.company_name.toLowerCase());
        if (found) suppId = found.id;
      }

      const itemId = `cat-${Date.now()}-${idx}`;
      const presetPrice = Number(row.preset_price) || 0;
      const moq = Number(row.min_order_qty) || 1;
      const matchedCat = categories.find(c => c.name.toLowerCase() === (row.category || '').toLowerCase());

      const item: CatalogItem = {
        id: itemId,
        name: row.name,
        category: row.category || matchedCat?.name || 'Capacitor',
        category_id: matchedCat?.id,
        sku: row.sku || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`,
        specs: row.specs || '',
        uom: row.uom || 'Pcs',
        preset_price: presetPrice,
        in_stock_qty: Number(row.in_stock_qty) || 100,
        min_order_qty: moq,
        company_id: suppId || companies[0]?.id || '',
        company_ids: suppId ? [suppId] : (companies[0]?.id ? [companies[0].id] : []),
        procurement_status: row.procurement_status || 'TO_BE_ORDERED',
        image_drive_url: row.image_drive_url || undefined
      };

      importedItems.push(item);

      const targetCompanyId = item.company_id;
      if (targetCompanyId) {
        const companyObj = companies.find(s => s.id === targetCompanyId);
        newJunctions.push({
          id: `cc-${itemId}-${targetCompanyId}`,
          component_id: itemId,
          company_id: targetCompanyId,
          unit_price: presetPrice,
          rfq_quoted_price: presetPrice,
          moq: moq,
          lead_time_days: 7,
          part_number_vendor: item.sku || 'OEM-SPEC',
          external_rating: companyObj?.rating || 4.8,
          review_summary: `Imported via CSV for ${item.name}`,
          company: companyObj
        });
      }
    });

    if (importedItems.length === 0) return 0;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('catalog_items').upsert(importedItems);
        if (newJunctions.length > 0) {
          await supabase.from('component_companies').upsert(newJunctions);
        }
      } catch (e) {
        console.warn('Batch insert catalog_items to Supabase error:', e);
      }
    }

    setCatalog(prev => [...importedItems, ...prev]);
    if (newJunctions.length > 0) {
      setComponentCompanies(prev => [...newJunctions, ...prev]);
    }
    return importedItems.length;
  };

  const handleImportOrders = async (rows: any[]): Promise<number> => {
    const importedOrders: ProcurementOrder[] = rows.map((row, idx) => {
      const supp = companies.find(s => 
        (row.company_id && s.id === row.company_id) || 
        (row.company_name && s.name.toLowerCase() === row.company_name.toLowerCase())
      );

      const type = (row.type || 'PO').toUpperCase() === 'RFQ' ? 'RFQ' : 'PO';
      const orderNum = row.order_number || `${type}-${new Date().getFullYear()}-${String(orders.length + idx + 1).padStart(4, '0')}`;

      return {
        id: `po-${Date.now()}-${idx}`,
        order_number: orderNum,
        company_id: supp?.id || companies[0]?.id || '',
        company: supp || companies[0],
        type,
        status: (row.status || (type === 'RFQ' ? 'RFQ_SENT' : 'ORDERED')) as OrderStatus,
        total_amount: Number(row.total_amount) || 0,
        notes: row.notes || row.item_details || 'Imported via CSV',
        created_by: row.created_by || userName,
        created_at: row.created_at || new Date().toISOString()
      };
    });

    if (importedOrders.length === 0) return 0;

    if (isSupabaseConfigured()) {
      try {
        const payload = importedOrders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          company_id: o.company_id,
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

  const handleImportCompanies = async (rows: any[]): Promise<number> => {
    const importedSupps: Company[] = rows.map((row, idx) => ({
      id: `supp-${Date.now()}-${idx}`,
      name: row.name,
      contact_person: row.contact_person || 'Sales Department',
      email: row.email || 'sales@company.com',
      phone: row.phone || '+91 98765 43210',
      whatsapp: row.whatsapp || row.phone || '+91 98765 43210',
      category: row.category || 'General Company',
      gstin: row.gstin || '',
      payment_terms: row.payment_terms || 'Net 30 Days',
      address: row.address || '',
      buying_url: row.buying_url || '',
      rating: Number(row.rating) || 4.8
    }));

    if (importedSupps.length === 0) return 0;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('companies').upsert(importedSupps);
      } catch (e) {
        console.warn('Batch insert companies to Supabase error:', e);
      }
    }

    setCompanies(prev => [...importedSupps, ...prev]);
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

  // Component-Level Reorder Trigger (Targets only component-specific company)
  const handleQuickReorderItem = (item: CatalogItem, qty: number) => {
    const company = companies.find(s => s.id === item.company_id) || companies[0];

    const draft: MultiCompanyPODraft = {
      company,
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

  // Dispatch Multi-Company Orders & Sync with Product Folder
  const handleDispatchOrders = async (drafts: MultiCompanyPODraft[], type: 'PO' | 'RFQ') => {
    const newOrders: ProcurementOrder[] = [];

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const orderId = `po-${Date.now()}-${i}`;
      const orderNumber = `${type}-${new Date().getFullYear()}-${(orders.length + i + 1).toString().padStart(4, '0')}`;

      const newOrder: ProcurementOrder = {
        id: orderId,
        order_number: orderNumber,
        company_id: draft.company.id,
        company: draft.company,
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
            company_id: newOrder.company_id,
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
    handleTabChange('procurement');

    // Removed singleChoiceOrder modal popup per user specification
  };

  // Immediate PO Dispatch from Sourcing Comparison Drawer
  const handleCreatePOFromComparison = (company: Company, item: CatalogItem, unitPrice: number, qty: number) => {
    const draft: MultiCompanyPODraft = {
      company,
      items: [
        {
          catalogItem: { ...item, preset_price: unitPrice },
          quantity: qty,
          unit_price: unitPrice,
          total_price: qty * unitPrice
        }
      ],
      total_amount: qty * unitPrice
    };

    handleTabChange('procurement');
    handleDispatchOrders([draft], 'PO');
  };

  // Persistent Mail Draft Queue Enqueue Handler
  const { enqueue } = useMailQueue();
  const handleEnqueueMailDrafts = (drafts: QueuedMailDraft[], openFirstImmediately = true) => {
    if (drafts.length === 0) return;

    enqueue(drafts);
    if (openFirstImmediately && drafts[0]) {
      setWebmailInitialCompose({
        to: drafts[0].to,
        subject: drafts[0].subject,
        body: drafts[0].body,
        context: drafts[0].context,
        orderToConfirm: drafts[0].orderToConfirm
      });
    }
    handleTabChange('webmail');
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
    company: Company,
    itemName?: string,
    specs?: string,
    qty?: number | string,
    context?: string,
    statusState?: string
  ) => {
    const orderType = determineOrderType(context || 'CATALOG_BOM', statusState);
    const subject = formatProcurementSubject(orderType, itemName || 'Battery Components');
    const defaultBody = `Dear Sales Team (${company.name}),\n\nWe at Cosmo Cnergy would like to request an official ${orderType} for the following:\n\n• Item: ${itemName || 'Catalog Component'}\n• Specifications: ${specs || 'Standard industrial spec'}\n• Quantity Required: ${qty || 100}\n\nPlease confirm availability, GST rates, and delivery schedule to Pune plant.\n\nBest regards,\n${userName}\nCosmo Cnergy`;

    setWebmailInitialCompose({
      to: company.email || '',
      subject,
      body: defaultBody,
      context
    });
    handleTabChange('webmail');
  };

  // Strict Auth Guard
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#0B192C] flex items-center justify-center p-4">
        <AuthModal
          onClose={() => {}} // Cannot close until logged in
          onLogin={(name, email) => {
            setUserName(name);
            setUserEmail(email);
            localStorage.setItem('cosmo_user_name', name);
            localStorage.setItem('cosmo_user_email', email);
            setIsAuthOpen(false);
          }}
        />
      </div>
    );
  }

  const lowStockAlertsCount = catalog.filter(c => {
    const alertLimit = Math.floor((c.min_order_qty || 1) * ((c.alert_threshold_percent || 20) / 100));
    return (c.in_stock_qty || 0) < alertLimit;
  }).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Top Header & Navigation */}
      

      {/* Main Content Area */}
      <Routes>
        <Route path="/" element={<Layout activeTab={activeTab} setActiveTab={handleTabChange} unreadWebmailCount={mailDraftQueue.length} onOpenBOMModal={() => setIsBOMModalOpen(true)} onOpenSearch={() => setIsSearchOpen(true)} userName={userName} onOpenAuth={() => setIsAuthOpen(true)} onLogout={handleLogout} ordersCount={orders.length} catalogCount={catalog.length} companiesCount={companies.length} />}>
          <Route index element={
            <CatalogSection
              catalog={catalog}
              companies={companies}
              componentCompanies={componentCompanies}
              orders={orders}
              folders={folders}
              boms={boms}
              categories={categories}
              onAddCatalogItem={handleAddCatalogItem}
              onUpdateCatalogItem={handleUpdateCatalogItem}
              onAddProductFolder={handleAddProductFolder}
              onUpdateFolderLinkedPOs={handleUpdateFolderLinkedPOs}
              onUpdateFolderComponents={handleUpdateFolderComponents}
              onUpdateCompanyContact={handleUpdateCompanyPhone}
              onLogOrders={(drafts, type) => handleDispatchOrders(drafts, type || 'PO')}
              onDeleteProductFolder={handleDeleteProductFolder}
              onDeleteOrder={handleDeleteOrder}
              onDeleteCatalogItem={handleDeleteCatalogItem}
              onQuickReorder={handleQuickReorderItem}
              onOpenWhatsApp={(company, context) => setWhatsAppModalData({ company, context })}
              onOpenWebmail={handleOpenWebmail}
              onEnqueueMailDrafts={handleEnqueueMailDrafts}
              onImportComponents={handleImportComponents}
              onOpenComparisonDrawer={item => setComparisonComponent(item)}
            />
          } />
          <Route path="companies" element={
            <CompanyDashboard
              companies={companies}
              catalog={catalog}
              categories={categories}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onImportCompanies={handleImportCompanies}
              onOpenComparisonDrawer={item => setComparisonComponent(item)}
              onOpenWebmail={(to, subject, body) => {
                setWebmailInitialCompose({
                  to,
                  subject,
                  body: body || '',
                  context: 'COMPANY_SOURCING'
                });
                handleTabChange('webmail');
              }}
            />
          } />
          <Route path="ai" element={
            <AIProcurementStudio
              catalog={catalog}
              companies={companies}
              onGenerateOrderFromAI={drafts => handleDispatchOrders(drafts, 'PO')}
            />
          } />
          <Route path="procurement" element={
            <OrderHistoryTimeline
              orders={orders}
              onUpdateStatus={handleUpdateOrderStatus}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              onOpenWhatsApp={(company, context) => setWhatsAppModalData({ company, context })}
              onOpenWebmail={handleOpenWebmail}
              onImportOrders={handleImportOrders}
            />
          } />
          <Route path="webmail" element={
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
          } />
          <Route path="inventory" element={
            <CatalogSection
              catalog={catalog}
              companies={companies}
              componentCompanies={componentCompanies}
              orders={orders}
              folders={folders}
              boms={boms}
              categories={categories}
              onAddCatalogItem={handleAddCatalogItem}
              onUpdateCatalogItem={handleUpdateCatalogItem}
              onAddProductFolder={handleAddProductFolder}
              onUpdateFolderLinkedPOs={handleUpdateFolderLinkedPOs}
              onUpdateFolderComponents={handleUpdateFolderComponents}
              onUpdateCompanyContact={handleUpdateCompanyPhone}
              onLogOrders={(drafts, type) => handleDispatchOrders(drafts, type || 'PO')}
              onDeleteProductFolder={handleDeleteProductFolder}
              onDeleteOrder={handleDeleteOrder}
              onDeleteCatalogItem={handleDeleteCatalogItem}
              onQuickReorder={handleQuickReorderItem}
              onOpenWhatsApp={(company, context) => setWhatsAppModalData({ company, context })}
              onOpenWebmail={handleOpenWebmail}
              onEnqueueMailDrafts={handleEnqueueMailDrafts}
              onImportComponents={handleImportComponents}
              onOpenComparisonDrawer={item => setComparisonComponent(item)}
            />
          } />
          <Route path="inventory/component/:id" element={
            <ComponentComparisonPage 
              catalog={catalog}
              companies={companies}
              componentCompanies={componentCompanies}
              onUpdateComponentCompany={handleUpdateComponentCompany}
            />
          } />
        </Route>
      </Routes>

      {/* Footer */}
      <footer className="glass-panel border-t border-[#1e3e62] py-6 text-center text-xs text-slate-300 bg-[#0B192C]">
        <p>CosmoCnergy Procurement OS — Datlion Cnergy Enterprise Edition</p>
      </footer>

      {/* Global Modals */}
      {isBOMModalOpen && (
        <BOMProcurementModal
          catalog={catalog}
          boms={boms}
          companies={companies}
          folders={folders}
          orders={orders}
          componentCompanies={componentCompanies}
          onClose={() => setIsBOMModalOpen(false)}
          onDispatchOrders={handleDispatchOrders}
          onOpenWebmail={handleOpenWebmail}
          onEnqueueMailDrafts={handleEnqueueMailDrafts}
        />
      )}

      {/* WhatsApp Smart Modal */}
      {whatsAppModalData && (
        <WhatsAppSmartModal
          company={whatsAppModalData.company}
          itemNameOrContext={whatsAppModalData.context}
          onClose={() => setWhatsAppModalData(null)}
          onUpdateCompanyPhone={async (companyId: string, phone: string) => {
            await handleUpdateCompanyPhone(companyId, whatsAppModalData.company.email || '', phone);
          }}
        />
      )}

      {/* Native Webmail Dispatcher Modal */}
      {webmailModalData && (
        <NativeWebmailModal
          company={webmailModalData.company}
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

      {/* Global Background Mail Queue Manager */}
      <MailQueueManager />

      {/* Global Ctrl+K Universal Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        catalog={catalog}
        folders={folders}
        companies={companies}
        boms={boms}
        orders={orders}
        onNavigateTab={tab => handleTabChange(tab)}
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

      {/* Floating Bottom-Right Master Data Search Button (Reserved z-30 & Margin Clearance) */}
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-white shadow-xl shadow-slate-900/20 active:scale-95 transition-all group cursor-pointer backdrop-blur-md"
        title="Master Data Universal Search (Ctrl + K)"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
          <Search className="w-3.5 h-3.5" />
        </div>
        <span className="font-bold text-xs tracking-wide text-slate-100 group-hover:text-white">
          Master Data Search
        </span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-400 font-bold">
          Ctrl+K
        </kbd>
      </button>
    </div>
  );
};
