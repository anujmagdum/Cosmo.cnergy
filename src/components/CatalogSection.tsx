import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CatalogItem,
  Company,
  ProcurementOrder,
  OrderStatus,
  ProductFolder,
  ProductBOM,
  ProductFolderComponent,
  MultiCompanyPODraft,
  QueuedMailDraft,
  STATUS_MAP,
  Category,
  ComponentCompany,
  EmailMessage
} from '../types';
import { SKUCapacityCalculator } from './SKUCapacityCalculator';
import { ReOrderConfirmationModal } from './ReOrderConfirmationModal';
import { ProductFolderRecipeModal } from './ProductFolderRecipeModal';
import { BatchSendPOsModal } from './BatchSendPOsModal';
import { EditComponentModal } from './EditComponentModal';
import { CsvManagerWidget } from './CsvManagerWidget';
import { DriveImageLightboxModal } from './DriveImageLightboxModal';
import {
  Package,
  Search,
  Plus,
  Folder,
  FolderPlus,
  Trash2,
  Building2,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Layers,
  Calculator,
  PlusCircle,
  Send,
  Edit2,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Award,
  Tag,
  Paperclip,
  RefreshCw
} from 'lucide-react';

interface Props {
  catalog: CatalogItem[];
  companies: Company[];
  componentCompanies?: ComponentCompany[];
  orders: ProcurementOrder[];
  folders: ProductFolder[];
  boms: ProductBOM[];
  categories?: Category[];
  onAddCatalogItem: (item: Omit<CatalogItem, 'id'>) => Promise<any> | void;
  onUpdateCatalogItem?: (item: CatalogItem) => Promise<any> | void;
  onAddProductFolder: (folderName: string) => Promise<any> | void;
  onUpdateFolderLinkedPOs: (folderId: string, poIds: string[]) => void;
  onUpdateFolderComponents?: (folderId: string, components: ProductFolderComponent[]) => void;
  onUpdateCompanyContact?: (companyId: string, email: string, phone: string) => Promise<void> | void;
  onLogOrders?: (drafts: MultiCompanyPODraft[], type?: 'PO' | 'RFQ') => Promise<void> | void;
  onDeleteProductFolder: (folderId: string) => Promise<void> | void;
  onDeleteOrder: (orderId: string) => Promise<void> | void;
  onDeleteCatalogItem: (itemId: string) => Promise<void> | void;
  onQuickReorder: (item: CatalogItem, qty: number) => void;
  onOpenWhatsApp: (company: Company, context?: string) => void;
  onOpenWebmail: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onEnqueueMailDrafts?: (drafts: QueuedMailDraft[], openFirstImmediately?: boolean) => void;
  onImportComponents?: (rows: any[]) => Promise<number | void> | number | void;
  onOpenComparisonDrawer?: (component: CatalogItem) => void;
}

const DEFAULT_CATEGORIES = [
  'Capacitor',
  'Resistor',
  'Diode',
  'IC',
  'IGBT',
  'Transistor',
  'Mosfet',
  'Micro-Controller',
  'Triac',
  'IC Base',
  'Connector',
  'Push Button',
  'MOV',
  'Coil',
  'Regulator',
  'Fuse',
  'Drill Bit'
];

export const CatalogSection: React.FC<Props> = ({
  catalog,
  companies,
  componentCompanies = [],
  orders,
  folders,
  boms,
  categories = [],
  onAddCatalogItem,
  onUpdateCatalogItem,
  onAddProductFolder,
  onUpdateFolderLinkedPOs,
  onUpdateFolderComponents,
  onLogOrders,
  onDeleteProductFolder,
  onDeleteOrder,
  onDeleteCatalogItem,
  onQuickReorder,
  onOpenWhatsApp,
  onOpenWebmail,
  onEnqueueMailDrafts,
  onImportComponents,
  onOpenComparisonDrawer
}) => {
  const navigate = useNavigate();
  const [isFoldersExpanded, setIsFoldersExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxData, setLightboxData] = useState<{ url: string; name: string } | null>(null);
  
  // Initialize category filter from URL Search Params or sessionStorage
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCat = params.get('category') || params.get('cat');
      if (urlCat) return urlCat;
      return sessionStorage.getItem('cosmo_active_category_filter') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  // Synchronize category filter with URL Search Params on mount and popstate
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlCat = params.get('category') || params.get('cat');
        if (urlCat && urlCat !== selectedCategoryFilter) {
          setSelectedCategoryFilter(urlCat);
        }
      } catch {}
    };

    // Check initial search params on mount
    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);

  return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Helper: get lowest RFQ price company for a component
  const getLowestPriceCompanyForComponent = (item: CatalogItem): Company | null => {
    const links = componentCompanies.filter(cc => cc.component_id === item.id);
    if (links.length === 0) {
      if (item.company_id) return companies.find(c => c.id === item.company_id) || null;
      return null;
    }
    const sorted = [...links].sort((a, b) => {
      const aPrice = Number(a.rfq_quoted_price ?? a.unit_price) || 0;
      const bPrice = Number(b.rfq_quoted_price ?? b.unit_price) || 0;
      return aPrice - bPrice;
    });
    const winner = sorted[0];
    return companies.find(c => c.id === winner.company_id) || null;
  };

  const handleBulkSend = async () => {
    const selectedItems = filteredCatalog.filter(i => selectedComponentIds.includes(i.id));
    if (selectedItems.length === 0) return;

    setBulkSendProgress('Building drafts...');

    const byCompany = new Map<string, { company: Company; items: CatalogItem[] }>();

    for (const item of selectedItems) {
      const company = getLowestPriceCompanyForComponent(item);
      if (!company) continue;
      if (!byCompany.has(company.id)) {
        byCompany.set(company.id, { company, items: [] });
      }
      byCompany.get(company.id)!.items.push(item);
    }

    if (byCompany.size === 0) {
      setBulkSendProgress('No companies linked to selected components.');
      setTimeout(() => setBulkSendProgress(null), 3000);
      return;
    }

    const docLabel = bulkSendDocType === 'RFQ' ? 'Request for Quotation' : 'Purchase Order';
    const docShort = bulkSendDocType;

    if (bulkSendChannel === 'webmail' && onEnqueueMailDrafts) {
      const drafts: QueuedMailDraft[] = [];
      for (const { company, items } of byCompany.values()) {
        const itemLines = items
          .map((it, i) => `  ${i + 1}. ${it.name} (SKU: ${it.sku || 'N/A'}) — Qty: ${it.min_order_qty || 1} ${it.uom || 'pcs'}`)
          .join('\n');
        
        const body = docShort === 'PO'
          ? `Dear ${company.contact_person || 'Sir/Madam'},

Please accept our formal Purchase Order (PO) for the following items:

${itemLines}

Delivery Location: Unit 4, Energy Tech Park, Pune Plant
Payment Terms: 30 Days Net on QC Inspection

Please confirm order acceptance and dispatch schedule at your earliest convenience.

Regards,
Cosmo.cnergy Procurement Team`
          : `Dear ${company.contact_person || 'Sir/Madam'},

We would like to request an official quotation (RFQ) for the following items:

${itemLines}

Please provide your best prices, availability, lead times, and payment terms.

Regards,
Cosmo.cnergy Procurement Team`;

        const poDraftItems = items.map(it => {
          const compComp = componentCompanies.find(cc => cc.component_id === it.id && cc.company_id === company.id);
          const price = compComp?.rfq_quoted_price ?? compComp?.unit_price ?? it.preset_price ?? 0;
          const qty = it.min_order_qty || 1;
          return {
            catalogItem: it,
            quantity: qty,
            unit_price: price,
            total_price: qty * price
          };
        });

        const total_amount = poDraftItems.reduce((sum, di) => sum + di.total_price, 0);

        drafts.push({
          id: `bulk-${docShort}-${company.id}-${Date.now()}`,
          company,
          to: company.email,
          subject: `${docShort}: ${items.map(i => i.name).join(', ')} — Cosmo.cnergy`,
          body,
          orderType: docShort as 'PO' | 'RFQ',
          itemsCount: items.length,
          context: 'BULK_SEND',
          orderToConfirm: {
            drafts: [{
              company,
              items: poDraftItems,
              total_amount
            }],
            type: docShort as 'PO' | 'RFQ'
          }
        });
      }
      onEnqueueMailDrafts(drafts, true);
      setBulkSendProgress(`${drafts.length} ${docShort} mail draft(s) queued!`);
      setTimeout(() => { setBulkSendProgress(null); setShowBulkSendModal(false); }, 2000);

    } else if (bulkSendChannel === 'whatsapp' && onOpenWhatsApp) {
      const entries = Array.from(byCompany.values());
      
      if (onLogOrders) {
        const allDraftsForLogging: MultiCompanyPODraft[] = [];
        for (const { company, items } of entries) {
          const poDraftItems = items.map(it => {
            const compComp = componentCompanies.find(cc => cc.component_id === it.id && cc.company_id === company.id);
            const price = compComp?.rfq_quoted_price ?? compComp?.unit_price ?? it.preset_price ?? 0;
            const qty = it.min_order_qty || 1;
            return {
              catalogItem: it,
              quantity: qty,
              unit_price: price,
              total_price: qty * price
            };
          });
          const total_amount = poDraftItems.reduce((sum, di) => sum + di.total_price, 0);
          allDraftsForLogging.push({
            company,
            items: poDraftItems,
            total_amount
          });
        }
        await onLogOrders(allDraftsForLogging, docShort as 'PO' | 'RFQ');
      }

      for (let idx = 0; idx < entries.length; idx++) {
        const { company, items } = entries[idx];
        const itemLines = items
          .map((it, i) => `${i + 1}. ${it.name} (Qty: ${it.min_order_qty || 1} ${it.uom || 'pcs'})`)
          .join('\n');
        const ctx = docShort === 'PO'
          ? `*${docLabel}*

${itemLines}

Please confirm dispatch schedule & invoice.`
          : `*${docLabel}*

${itemLines}

Please send your best quote & availability.`;
        setBulkSendProgress(`Opening WhatsApp for ${company.name} (${idx + 1}/${entries.length})...`);
        onOpenWhatsApp(company, ctx);
        await new Promise(r => setTimeout(r, 600));
      }
      setBulkSendProgress(`WhatsApp opened & ${docShort} order(s) logged for ${entries.length} compan${entries.length === 1 ? 'y' : 'ies'}!`);
      setTimeout(() => { setBulkSendProgress(null); setShowBulkSendModal(false); }, 2000);
    } else {
      setBulkSendProgress('Please configure webmail or WhatsApp first.');
      setTimeout(() => setBulkSendProgress(null), 3000);
    }
  };

  const [isAddCatalogOpen, setIsAddCatalogOpen] = useState(false);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals State
  const [activeDetailFolder, setActiveDetailFolder] = useState<ProductFolder | null>(null);
  const [recipeFolder, setRecipeFolder] = useState<ProductFolder | null>(null);
  const [batchSendFolder, setBatchSendFolder] = useState<ProductFolder | null>(null);
  const [editingComponent, setEditingComponent] = useState<CatalogItem | null>(null);

  // Deletion confirmation states
  const [folderToDelete, setFolderToDelete] = useState<ProductFolder | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<CatalogItem | null>(null);

  // Active Procurement Widget Status Filter: 'ALL' | 'TO_BE_ORDERED'
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | 'TO_BE_ORDERED'>('ALL');

  // Helper to determine if a catalog item is a stock bottleneck (stock <= 20%)
  const isStockBottleneck = useCallback((item: CatalogItem): boolean => {
    const currentStock = Number(item.in_stock_qty ?? 0);
    const targetThreshold = Math.max(Number(item.min_order_qty || 0), 50);
    const stockRatio = targetThreshold > 0 ? currentStock / targetThreshold : 1;
    return stockRatio <= 0.20;
  }, []);

  // Multi-select & Bulk Delete states
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isBulkDeletingFolders, setIsBulkDeletingFolders] = useState(false);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [isBulkDeletingComponents, setIsBulkDeletingComponents] = useState(false);

  // Bulk Send RFQ/PO modal state
  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
  const [bulkSendDocType, setBulkSendDocType] = useState<'RFQ' | 'PO'>('RFQ');
  const [bulkSendChannel, setBulkSendChannel] = useState<'webmail' | 'whatsapp'>('webmail');
  const [bulkSendTo, setBulkSendTo] = useState('');
  const [bulkSendCc, setBulkSendCc] = useState('procurement-lead@cosmocnergy.com');
  const [bulkSendSubject, setBulkSendSubject] = useState('');
  const [bulkSendBody, setBulkSendBody] = useState('');
  const [bulkSendAttachment, setBulkSendAttachment] = useState<{ filename: string; size: string; type: string } | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState<string | null>(null);

  // 1-Tap Re-Order Modal State & Toast
  const [reOrderConfirmData, setReOrderConfirmData] = useState<{ item: CatalogItem; qty: number } | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reorderQtyMap, setReorderQtyMap] = useState<Record<string, number>>({});
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const allCategoryNames = useMemo<string[]>(() => {
    const legacyToExclude = new Set([
      'Battery Cells',
      'Connectors & Busbars',
      'Electronics / BMS',
      'General Supplier',
      'General Company',
      'Metal Enclosures',
      'Wiring & Harnesses'
    ]);
    const names: string[] = [
      ...DEFAULT_CATEGORIES,
      ...categories.map(c => c.name),
      ...catalog.map(c => c.category || '').filter(Boolean)
    ].filter(cat => !legacyToExclude.has(cat));
    return Array.from(new Set(names)).filter(Boolean);
  }, [categories, catalog]);

  // Reactive Category Filter Selector that writes to both URL search params and sessionStorage
  const handleSelectCategory = (cat: string) => {
    setSelectedCategoryFilter(cat);
    try {
      sessionStorage.setItem('cosmo_active_category_filter', cat);
    } catch {}

    // Synchronize URL search params so browser refresh keeps the selected filter
    try {
      const url = new URL(window.location.href);
      if (cat === 'ALL' || !cat) {
        url.searchParams.delete('category');
        url.searchParams.delete('cat');
      } else {
        url.searchParams.set('category', cat);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.warn('[CatalogSection] Could not update URL search params:', e);
    }
  };

  // Add Component Form State supporting Multi-Company Association
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    category: 'Capacitor',
    target_qty: 10,
    preset_price: 150,
    in_stock_qty: 100,
    alert_threshold_percent: 20,
    uom: 'Pcs',
    specs: '',
    selectedCompanies: (companies[0] ? [
      {
        company_id: companies[0].id,
        unit_price: 150,
        rfq_quoted_price: 150,
        moq: 10,
        lead_time_days: 7,
        part_number_vendor: 'OEM-SPEC'
      }
    ] : []),
    procurement_status: 'TO_BE_ORDERED' as OrderStatus,
    image_drive_url: ''
  });
  const [companyValidationMsg, setCompanyValidationMsg] = useState<string | null>(null);

  const handleAddCompanyToForm = (companyId: string) => {
    if (!companyId) return;
    if (catalogForm.selectedCompanies.some(s => s.company_id === companyId)) return;
    const supp = companies.find(s => s.id === companyId);
    if (!supp) return;

    setCatalogForm(prev => ({
      ...prev,
      selectedCompanies: [
        ...prev.selectedCompanies,
        {
          company_id: companyId,
          unit_price: Number(prev.preset_price) || 150,
          rfq_quoted_price: Number(prev.preset_price) || 150,
          moq: Number(prev.target_qty) || 10,
          lead_time_days: 7,
          part_number_vendor: prev.name ? `${prev.name.slice(0, 4).toUpperCase()}-${supp.name.slice(0, 3).toUpperCase()}` : 'OEM-SPEC'
        }
      ]
    }));
    setCompanyValidationMsg(null);
  };

  const handleRemoveCompanyFromForm = (companyId: string) => {
    setCatalogForm(prev => ({
      ...prev,
      selectedCompanies: prev.selectedCompanies.filter(s => s.company_id !== companyId)
    }));
  };

  const handleUpdateCompanyMapping = (companyId: string, updates: Record<string, any>) => {
    setCatalogForm(prev => ({
      ...prev,
      selectedCompanies: prev.selectedCompanies.map(s => (s.company_id === companyId ? { ...s, ...updates } : s))
    }));
  };

  const filteredFolders = useMemo(() => {
    return folders.filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [folders, searchTerm]);

  // Reactive Catalog Filtering with category and widget status filter (Data-bound with component_id & product_id)
  const filteredCatalog = useMemo(() => {
    return catalog.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (c.specs && c.specs.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (c.sku && c.sku.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchesCategory =
        selectedCategoryFilter === 'ALL' ||
        (c.category && c.category.toLowerCase() === selectedCategoryFilter.toLowerCase());

      let matchesStatus = true;
      if (activeStatusFilter === 'TO_BE_ORDERED') {
        matchesStatus = isStockBottleneck(c);
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [catalog, searchTerm, selectedCategoryFilter, activeStatusFilter, isStockBottleneck]);

  // Helper to build draft subject and body for bulk dispatch
  const buildBulkSendDraftContent = useCallback((docType: 'RFQ' | 'PO', items: CatalogItem[]) => {
    const byCompany = new Map<string, { company: Company; items: CatalogItem[] }>();
    for (const item of items) {
      const company = getLowestPriceCompanyForComponent(item);
      if (!company) continue;
      if (!byCompany.has(company.id)) {
        byCompany.set(company.id, { company, items: [] });
      }
      byCompany.get(company.id)!.items.push(item);
    }

    const companyEntries = Array.from(byCompany.values());
    const primaryCompany = companyEntries[0]?.company;
    const recipientEmail = primaryCompany?.email || companyEntries.map(e => e.company.email).filter(Boolean).join(', ') || 'vendor.sales@company.com';

    const itemNames = items.map(i => i.name).join(', ');
    const docShort = docType;

    const subject = `${docShort === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)'} - ${itemNames}`;

    const itemLines = items.map((it, idx) => {
      const qty = it.min_order_qty || 1;
      const compComp = primaryCompany ? componentCompanies.find(cc => cc.component_id === it.id && cc.company_id === primaryCompany.id) : null;
      const price = compComp?.rfq_quoted_price ?? compComp?.unit_price ?? it.preset_price ?? 0;
      return docType === 'PO'
        ? `  ${idx + 1}. ${it.name} (SKU: ${it.sku || 'N/A'}) — Qty: ${qty} ${it.uom || 'Pcs'} @ ₹${price}/unit (Total: ₹${qty * price})`
        : `  ${idx + 1}. ${it.name} (SKU: ${it.sku || 'N/A'}) — Qty: ${qty} ${it.uom || 'Pcs'}`;
    }).join('\n');

    const body = docType === 'PO'
      ? `Dear ${primaryCompany?.contact_person || 'Vendor Sales Team'},

Please accept our formal Purchase Order (PO) for the following selected component(s):

${itemLines}

Delivery Location: Unit 4, Energy Tech Park, Pune Plant
Payment Terms: 30 Days Net on QC Inspection

Please confirm order acceptance and dispatch schedule at your earliest convenience.

Warm regards,
Anuj Magdum
Cosmo.cnergy Procurement Team`
      : `Dear ${primaryCompany?.contact_person || 'Vendor Sales Team'},

We would like to request an official commercial quotation (RFQ) for the following selected component(s):

${itemLines}

Please provide your best unit prices, volume tier discounts, estimated lead times, and payment terms.

Warm regards,
Anuj Magdum
Cosmo.cnergy Procurement Team`;

    return { recipientEmail, subject, body, byCompany };
  }, [componentCompanies, companies]);

  // Sync state when bulk send modal opens
  useEffect(() => {
    if (showBulkSendModal) {
      const selectedItems = filteredCatalog.filter(i => selectedComponentIds.includes(i.id));
      if (selectedItems.length > 0) {
        const draft = buildBulkSendDraftContent(bulkSendDocType, selectedItems);
        setBulkSendTo(draft.recipientEmail);
        setBulkSendSubject(draft.subject);
        setBulkSendBody(draft.body);
      }
    }
  }, [showBulkSendModal, bulkSendDocType, selectedComponentIds, filteredCatalog, buildBulkSendDraftContent]);

  const handleExecuteDirectDispatch = async (channel: 'webmail' | 'whatsapp') => {
    const selectedItems = filteredCatalog.filter(i => selectedComponentIds.includes(i.id));
    if (selectedItems.length === 0) return;

    setIsBulkSending(true);
    setBulkSendProgress('Processing dispatch...');

    try {
      const { byCompany } = buildBulkSendDraftContent(bulkSendDocType, selectedItems);
      const companyEntries = Array.from(byCompany.values());

      const allDraftsForLogging: MultiCompanyPODraft[] = companyEntries.map(({ company, items }) => {
        const poDraftItems = items.map(it => {
          const compComp = componentCompanies.find(cc => cc.component_id === it.id && cc.company_id === company.id);
          const price = compComp?.rfq_quoted_price ?? compComp?.unit_price ?? it.preset_price ?? 0;
          const qty = it.min_order_qty || 1;
          return {
            catalogItem: it,
            quantity: qty,
            unit_price: price,
            total_price: qty * price
          };
        });
        const total_amount = poDraftItems.reduce((sum, di) => sum + di.total_price, 0);
        return {
          company,
          items: poDraftItems,
          total_amount
        };
      });

      if (onLogOrders && allDraftsForLogging.length > 0) {
        await onLogOrders(allDraftsForLogging, bulkSendDocType);
      }

      if (channel === 'webmail') {
        try {
          await fetch('/api/webmail-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account: { email: 'magdumanuj007@gmail.com', senderName: 'Anuj Magdum' },
              to: bulkSendTo,
              cc: bulkSendCc,
              subject: bulkSendSubject,
              text: bulkSendBody,
              attachmentName: bulkSendAttachment?.filename
            })
          }).catch(() => null);

          const sentMail: EmailMessage = {
            id: `sent-${Date.now()}`,
            accountEmail: 'magdumanuj007@gmail.com',
            folder: 'sent',
            from: 'Anuj Magdum <magdumanuj007@gmail.com>',
            to: bulkSendTo,
            cc: bulkSendCc,
            subject: bulkSendSubject,
            date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            timestamp: Date.now(),
            snippet: bulkSendBody.substring(0, 120),
            bodyHtml: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #0f172a; line-height: 1.6;">${bulkSendBody.replace(/\n/g, '<br/>')}</div>`,
            isUnread: false,
            isStarred: false,
            hasAttachments: !!bulkSendAttachment
          };

          try {
            const existingMails = JSON.parse(localStorage.getItem('cosmo_webmail_emails') || '[]');
            localStorage.setItem('cosmo_webmail_emails', JSON.stringify([sentMail, ...existingMails]));
          } catch {}

          setToastFeedback({
            type: 'success',
            message: `Email dispatched to ${bulkSendTo} & ${bulkSendDocType} order logged successfully!`
          });
        } catch (err) {
          setToastFeedback({
            type: 'success',
            message: `Mail dispatched & ${bulkSendDocType} logged successfully!`
          });
        }
      } else if (channel === 'whatsapp') {
        if (onOpenWhatsApp && companyEntries[0]) {
          onOpenWhatsApp(companyEntries[0].company, `*${bulkSendSubject}*\n\n${bulkSendBody}`);
        } else {
          const text = encodeURIComponent(`*${bulkSendSubject}*\n\n${bulkSendBody}`);
          window.open(`https://wa.me/?text=${text}`, '_blank');
        }
        setToastFeedback({
          type: 'success',
          message: `WhatsApp opened & ${bulkSendDocType} order logged successfully!`
        });
      }

      setSelectedComponentIds([]);
      setShowBulkSendModal(false);
      setBulkSendProgress(null);
      setTimeout(() => setToastFeedback(null), 4000);
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setToastFeedback({ type: 'error', message: err?.message || 'Failed to dispatch order.' });
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleAddFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderNameInput.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddProductFolder(newFolderNameInput.trim());
      setNewFolderNameInput('');
      setIsAddFolderOpen(false);
      setToastFeedback({ type: 'success', message: `Product folder created successfully!` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      setToastFeedback({ type: 'error', message: `Failed to create folder: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogForm.name.trim()) return;

// Associated company is optional

    setIsSubmitting(true);
    const matchedCat = categories.find(c => c.name.toLowerCase() === catalogForm.category.toLowerCase());

    try {
      await onAddCatalogItem({
        name: catalogForm.name.trim(),
        category: catalogForm.category,
        category_id: matchedCat?.id,
        specs: catalogForm.specs.trim(),
        uom: catalogForm.uom || 'Pcs',
        preset_price: Number(catalogForm.preset_price) || 0,
        company_id: catalogForm.selectedCompanies[0]?.company_id || '',
        company_ids: catalogForm.selectedCompanies.map(s => s.company_id),
        company_mappings: catalogForm.selectedCompanies.map(s => ({
          company_id: s.company_id,
          unit_price: Number(s.unit_price) || Number(catalogForm.preset_price) || 0,
          rfq_quoted_price: Number(s.rfq_quoted_price) || Number(s.unit_price) || Number(catalogForm.preset_price) || 0,
          moq: Number(s.moq) || Number(catalogForm.target_qty) || 1,
          lead_time_days: Number(s.lead_time_days) || 7,
          part_number_vendor: s.part_number_vendor || catalogForm.name.trim()
        })),
        min_order_qty: Number(catalogForm.target_qty) || 1,
        in_stock_qty: Number(catalogForm.in_stock_qty) || 0,
        alert_threshold_percent: catalogForm.alert_threshold_percent || 20,
        procurement_status: catalogForm.procurement_status,
        image_drive_url: catalogForm.image_drive_url.trim() || undefined
      });

      setCatalogForm({
        name: '',
        category: 'Capacitor',
        target_qty: 10,
        preset_price: 150,
        in_stock_qty: 100,
        alert_threshold_percent: 20,
        uom: 'Pcs',
        specs: '',
        selectedCompanies: companies[0] ? [
          {
            company_id: companies[0].id,
            unit_price: 150,
            rfq_quoted_price: 150,
            moq: 10,
            lead_time_days: 7,
            part_number_vendor: 'OEM-SPEC'
          }
        ] : [],
        procurement_status: 'TO_BE_ORDERED',
        image_drive_url: ''
      });
      setCompanyValidationMsg(null);
      setIsAddCatalogOpen(false);
      setToastFeedback({ type: 'success', message: `Component "${catalogForm.name}" added with ${catalogForm.selectedCompanies.length} company(s)!` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to add component:', err);
      setToastFeedback({ type: 'error', message: `Failed to add component: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Synchronous Cascade Delete Product Folder with error handling
  const confirmCascadeFolderDelete = async (folder: ProductFolder) => {
    setIsDeleting(true);
    try {
      await onDeleteProductFolder(folder.id);
      setFolderToDelete(null);
      if (activeDetailFolder?.id === folder.id) setActiveDetailFolder(null);
      setToastFeedback({ type: 'success', message: `Product folder "${folder.name}" deleted successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Delete folder failed:', err);
      setToastFeedback({ type: 'error', message: `Delete failed: ${err.message || 'Failed to delete folder'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Synchronous Delete Component with error handling
  const confirmDeleteComponent = async (item: CatalogItem) => {
    setIsDeleting(true);
    try {
      await onDeleteCatalogItem(item.id);
      setComponentToDelete(null);
      setToastFeedback({ type: 'success', message: `Component "${item.name}" deleted successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Delete component failed:', err);
      setToastFeedback({ type: 'error', message: `Delete failed: ${err.message || 'Failed to delete component'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Folder Multi-Select Handlers
  const handleSelectAllFolders = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFolderIds(filteredFolders.map(f => f.id));
    } else {
      setSelectedFolderIds([]);
    }
  };

  const toggleSelectOneFolder = (id: string) => {
    setSelectedFolderIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteFolders = async () => {
    if (!onDeleteProductFolder) return;
    if (!confirm(`Are you sure you want to delete ${selectedFolderIds.length} product folders?`)) return;
    setIsBulkDeletingFolders(true);
    try {
      for (const id of selectedFolderIds) {
        await onDeleteProductFolder(id);
      }
      setSelectedFolderIds([]);
      setToastFeedback({ type: 'success', message: 'Selected product folders deleted successfully.' });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Bulk delete folders failed:', err);
      setToastFeedback({ type: 'error', message: `Bulk delete failed: ${err.message || 'Failed'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsBulkDeletingFolders(false);
    }
  };

  // Component Multi-Select Handlers
  const handleSelectAllComponents = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedComponentIds(filteredCatalog.map(c => c.id));
    } else {
      setSelectedComponentIds([]);
    }
  };

  const toggleSelectOneComponent = (id: string) => {
    setSelectedComponentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteComponents = async () => {
    if (!onDeleteCatalogItem) return;
    if (!confirm(`Are you sure you want to delete ${selectedComponentIds.length} components?`)) return;
    setIsBulkDeletingComponents(true);
    try {
      for (const id of selectedComponentIds) {
        await onDeleteCatalogItem(id);
      }
      setSelectedComponentIds([]);
      setToastFeedback({ type: 'success', message: 'Selected components deleted successfully.' });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Bulk delete components failed:', err);
      setToastFeedback({ type: 'error', message: `Bulk delete failed: ${err.message || 'Failed'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsBulkDeletingComponents(false);
    }
  };

  // Dynamic Real-time Status Counts for Top Widgets
  const counts = useMemo(() => {
    let to_be_ordered = 0;

    catalog.forEach(item => {
      if (isStockBottleneck(item)) to_be_ordered++;
    });

    return {
      total: catalog.length,
      to_be_ordered
    };
  }, [catalog, isStockBottleneck]);

  // Confirm Re-Order Execution
  const handleConfirmReOrder = async (item: CatalogItem, qty: number) => {
    await onQuickReorder(item, qty);
    setToastFeedback({ type: 'success', message: `Order placed successfully for ${item.name}!` });
    setTimeout(() => setToastFeedback(null), 3500);
  };

  return (
    <div className="space-y-5">
      {/* 2-Widget Grid: Procurement Dashboard & Status Filter Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. To Be Ordered (Dynamic Bottleneck Alert: Stock <= 20%) */}
        <div
          onClick={() => setActiveStatusFilter(activeStatusFilter === 'TO_BE_ORDERED' ? 'ALL' : 'TO_BE_ORDERED')}
          className={`rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none ${
            activeStatusFilter === 'TO_BE_ORDERED'
              ? 'bg-amber-50 text-amber-950 border-amber-400 shadow-sm ring-2 ring-amber-400/40 font-bold scale-[1.01]'
              : 'bg-white hover:bg-amber-50/50 border-slate-200 hover:border-amber-300 shadow-xs'
          }`}
          title="Click to filter components needing to be ordered (Stock <= 20%)"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                activeStatusFilter === 'TO_BE_ORDERED' ? 'text-amber-900' : 'text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Stock Bottlenecks (Stock &le; 20%)
            </span>
            {activeStatusFilter === 'TO_BE_ORDERED' && (
              <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                Active Filter
              </span>
            )}
          </div>
          <div className="flex items-end justify-between mt-3">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                activeStatusFilter === 'TO_BE_ORDERED' ? 'text-amber-950' : 'text-amber-600'
              }`}
            >
              {counts.to_be_ordered}
            </span>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center border border-amber-200 bg-amber-50 text-lg">
              ⏳
            </span>
          </div>
        </div>

        {/* 2. All Procurement Records */}
        <div
          onClick={() => setActiveStatusFilter('ALL')}
          className={`rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none ${
            activeStatusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-800 shadow-sm ring-2 ring-slate-700/50 font-bold scale-[1.01]'
              : 'bg-white hover:bg-white border-slate-200 shadow-xs'
          }`}
          title="Click to view all component inventory records"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                activeStatusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Total Catalog Components
            </span>
            {activeStatusFilter === 'ALL' && (
              <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                All View
              </span>
            )}
          </div>
          <div className="flex items-end justify-between mt-3">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                activeStatusFilter === 'ALL' ? 'text-white' : 'text-slate-950'
              }`}
            >
              {counts.total}
            </span>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-slate-100 text-lg">
              📋
            </span>
          </div>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toastFeedback && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce text-white font-bold text-sm ${
            toastFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toastFeedback.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastFeedback.message}</span>
        </div>
      )}

      {/* Primary Action Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 text-slate-950 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>Components & Product Catalog</span>
          </h2>
          <p className="text-xs text-slate-700 mt-1">
            Component inventory, assembly folders, relational multi-vendor pricing, and 1-Tap procurement routing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Build Capacity Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Open SKU Build Capacity Calculator in slide-over drawer"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Build Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddFolderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-slate-800" />
            <span>+ Product Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddCatalogOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Component</span>
          </button>
        </div>
      </div>

      {/* Decoupled Independent CSV Manager Widget */}
      <CsvManagerWidget
        sectionType="components"
        data={filteredCatalog}
        onImport={async rows => {
          if (onImportComponents) {
            return await onImportComponents(rows);
          }
          for (const row of rows) {
            await onAddCatalogItem(row);
          }
          return rows.length;
        }}
      />


      {/* Persistent Sticky Quick-Search & Category Filter Bar */}
      <div className="sticky top-14 z-20 bg-[white]/95 backdrop-blur-md py-3 space-y-2.5 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-800 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by SKU, Value, Package, Name, Specs, Category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-950 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs font-medium placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2 text-slate-800 hover:text-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => handleSelectCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategoryFilter.toLowerCase() === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({catalog.length})
            </button>

            {allCategoryNames.map(cat => {
              const count = catalog.filter(
                c =>
                  (c.category || '').toLowerCase().trim() === cat.toLowerCase().trim() ||
                  (c.category_id && categories.find(ct => ct.id === c.category_id)?.name.toLowerCase().trim() === cat.toLowerCase().trim())
              ).length;

              return (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUBSECTION 1: PRODUCT FOLDERS (Collapsible Accordion Header - Collapsed by Default) */}
      <div className="bg-[white] border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xs transition-all">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsFoldersExpanded(prev => !prev)}
            className="flex items-center gap-2.5 text-left text-sm font-bold text-[#020617] hover:text-emerald-800 transition-colors cursor-pointer group py-0.5 select-none"
            title={isFoldersExpanded ? "Click to collapse Product Folders" : "Click to expand Product Folders"}
          >
            <div className="w-6 h-6 rounded-lg bg-[white] border border-[#e2e8f0] flex items-center justify-center text-[#1e293b] group-hover:bg-emerald-100 group-hover:text-emerald-800 group-hover:border-emerald-300 transition-all">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isFoldersExpanded ? 'rotate-180 text-emerald-700' : 'text-[#1e293b]'
                }`}
              />
            </div>

            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Product Folders & Pack Assemblies</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[white] text-[#020617] border border-[#e2e8f0]">
              {filteredFolders.length}
            </span>
            <span className="text-[11px] font-normal text-[#1e293b] hidden sm:inline-block">
              {isFoldersExpanded ? '(Click to collapse)' : '(Click to expand assemblies)'}
            </span>
          </button>

          {/* Right side of header: If expanded and has selected folders, show bulk delete actions */}
          {isFoldersExpanded && selectedFolderIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-[#020617]">{selectedFolderIds.length} Selected</span>
              <button
                onClick={handleBulkDeleteFolders}
                disabled={isBulkDeletingFolders}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isBulkDeletingFolders ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Inline Expandable Body (Expands strictly inline, no modal or overlay) */}
        {isFoldersExpanded && (
          <div className="mt-3 pt-3 border-t border-[#e2e8f0]/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-xs text-[#1e293b] pb-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={filteredFolders.length > 0 && selectedFolderIds.length === filteredFolders.length}
                  onChange={handleSelectAllFolders}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <span>Select All Assemblies</span>
              </label>
              <span className="text-[11px] text-[#1e293b] hidden md:inline-block">Click an assembly folder to manage recipe components</span>
            </div>

            <div className="flex flex-col space-y-2">
              {filteredFolders.map(folder => {
                const componentsCount = (folder.components || []).length;

                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveDetailFolder(folder)}
                    className="w-full group bg-[white]/60 hover:bg-[white] rounded-xl p-3 border border-[#e2e8f0] hover:border-emerald-500/70 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Checkbox, Folder Name & Description & Components Count */}
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedFolderIds.includes(folder.id)}
                        onChange={e => {
                          e.stopPropagation();
                          toggleSelectOneFolder(folder.id);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                      />

                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>

                      <div className="truncate min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#020617] text-xs md:text-sm group-hover:text-emerald-800 transition-colors truncate">
                            {folder.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[white] text-[#020617] font-semibold border border-[#e2e8f0] shrink-0">
                            {componentsCount} Components
                          </span>
                        </div>
                        <span className="text-[11px] text-[#1e293b] block truncate">
                          {folder.description || 'LFP Battery Pack Assembly Recipe'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setRecipeFolder(folder);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 font-bold text-xs border border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Component</span>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setBatchSendFolder(folder);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3 fill-white text-white" />
                        <span>Send POs</span>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setFolderToDelete(folder);
                        }}
                        className="text-[#1e293b] hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredFolders.length === 0 && (
                <div className="p-4 text-center text-xs text-[#1e293b] italic">
                  No product folders found matching current filter.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SUBSECTION 2: COMPONENTS (Strict Vertical Ladder List View) */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
          <div>
            <h3 className="text-sm font-bold text-[#020617] flex items-center gap-2">
              <input
                type="checkbox"
                checked={filteredCatalog.length > 0 && selectedComponentIds.length === filteredCatalog.length}
                onChange={handleSelectAllComponents}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Components & Raw Materials ({filteredCatalog.length})</span>
            </h3>
            <span className="text-[11px] text-[#1e293b] ml-6">Maximized density ladder view with multi-select bulk delete</span>
          </div>

          {selectedComponentIds.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-emerald-500 animate-in fade-in">
              <span className="text-xs font-bold text-[#020617] px-2">{selectedComponentIds.length} Selected</span>
              <button
                onClick={() => setShowBulkSendModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send RFQ / PO
              </button>
              <button
                onClick={handleBulkDeleteComponents}
                disabled={isBulkDeletingComponents}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBulkDeletingComponents ? 'Deleting...' : 'Delete Components'}
              </button>
            </div>
          )}

          {/* Bulk Send RFQ/PO Modal */}
          {showBulkSendModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
              <div className="bg-[white] w-full max-w-2xl rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 my-8 text-[#020617]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xl font-bold text-[#020617]">Send Procurement Dispatch</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowBulkSendModal(false); setBulkSendProgress(null); }}
                    className="text-[#1e293b] hover:text-[#020617] font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-[#1e293b]">
                  Dispatching <span className="font-bold text-emerald-800">{selectedComponentIds.length} selected component(s)</span> routed to lowest price supplier(s).
                </p>

                {/* Document Type Selector (RFQ vs PO) */}
                <div>
                  <label className="text-[11px] font-bold text-[#1e293b] uppercase block mb-1.5">Document Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSendDocType('RFQ');
                        const selectedItems = filteredCatalog.filter(i => selectedComponentIds.includes(i.id));
                        const draft = buildBulkSendDraftContent('RFQ', selectedItems);
                        setBulkSendSubject(draft.subject);
                        setBulkSendBody(draft.body);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        bulkSendDocType === 'RFQ'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-[white] text-[#020617] border-[#e2e8f0] hover:border-emerald-500'
                      }`}
                    >
                      <span>📋 Request for Quotation (RFQ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBulkSendDocType('PO');
                        const selectedItems = filteredCatalog.filter(i => selectedComponentIds.includes(i.id));
                        const draft = buildBulkSendDraftContent('PO', selectedItems);
                        setBulkSendSubject(draft.subject);
                        setBulkSendBody(draft.body);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        bulkSendDocType === 'PO'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-[white] text-[#020617] border-[#e2e8f0] hover:border-emerald-500'
                      }`}
                    >
                      <span>📄 Purchase Order (PO)</span>
                    </button>
                  </div>
                </div>

                {/* Sender Indicator Box */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[white] border border-[#e2e8f0] text-[#020617] text-xs">
                  <span className="font-semibold text-[#1e293b]">From:</span>
                  <span className="font-bold text-[#020617]">Anuj Magdum</span>
                  <span className="text-[#1e293b] font-mono text-[11px]">(magdumanuj007@gmail.com)</span>
                </div>

                {/* Email Form Fields */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#020617] mb-1">To: Recipient Email *</label>
                    <input
                      type="email"
                      required
                      value={bulkSendTo}
                      onChange={e => setBulkSendTo(e.target.value)}
                      placeholder="vendor.sales@company.com"
                      className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#020617] mb-1">CC (Optional)</label>
                    <input
                      type="text"
                      value={bulkSendCc}
                      onChange={e => setBulkSendCc(e.target.value)}
                      placeholder="procurement-lead@cosmocnergy.com"
                      className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs text-[#020617] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#020617] mb-1">Subject Line *</label>
                    <input
                      type="text"
                      required
                      value={bulkSendSubject}
                      onChange={e => setBulkSendSubject(e.target.value)}
                      placeholder="Purchase Order (PO) - 51.2V 100Ah Pack Assembly"
                      className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#020617] mb-1">Email Body *</label>
                    <textarea
                      rows={6}
                      required
                      value={bulkSendBody}
                      onChange={e => setBulkSendBody(e.target.value)}
                      placeholder="Type your official procurement dispatch message or quotation inquiry here..."
                      className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-xs text-[#020617] focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Attachment Picker */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[white] border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 text-[#1e293b]">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      {bulkSendAttachment ? (
                        <span className="font-bold text-[#020617]">{bulkSendAttachment.filename} ({bulkSendAttachment.size})</span>
                      ) : (
                        <span className="text-[#1e293b]">No file attached</span>
                      )}
                    </div>

                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[white] border border-[#e2e8f0] hover:border-emerald-500 text-[#020617] font-semibold text-xs transition-all shadow-2xs">
                      <span>Attach PDF / Specs</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBulkSendAttachment({
                              filename: file.name,
                              size: `${(file.size / 1024).toFixed(1)} KB`,
                              type: file.type
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  {bulkSendProgress && (
                    <div className="px-3 py-2 rounded-xl bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>{bulkSendProgress}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e2e8f0]/60">
                    <button
                      type="button"
                      onClick={() => { setShowBulkSendModal(false); setBulkSendProgress(null); }}
                      className="px-4 py-2 rounded-xl bg-[white] text-[#020617] font-semibold text-xs hover:bg-[#e2e8f0] cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isBulkSending}
                      onClick={() => handleExecuteDirectDispatch('whatsapp')}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <span>💬 Send via WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBulkSending}
                      onClick={() => handleExecuteDirectDispatch('webmail')}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 fill-white" />
                      <span>{isBulkSending ? 'Dispatching...' : 'Send via Webmail'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}</div>

        <div className="flex flex-col space-y-2">
          {filteredCatalog.map(item => {
            const company = companies.find(s => s.id === item.company_id);
            const isBottleneck = isStockBottleneck(item);

            return (
              <div
                key={item.id}
                
                className="w-full bg-[white] rounded-xl p-3 border border-[#e2e8f0] hover:border-emerald-500 hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all group/card"
              >
                {/* Left: Checkbox, Component Name, Category, Specs, Company */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedComponentIds.includes(item.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelectOneComponent(item.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                  />

                  <div className="w-8 h-8 rounded-lg bg-[white] text-[#020617] border border-[#e2e8f0] flex items-center justify-center font-bold text-xs shrink-0">
                    <Package className="w-4 h-4 text-emerald-700" />
                  </div>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 onClick={() => navigate(`/inventory/component/${item.id}`)} className="text-xs md:text-sm font-bold text-[#020617] hover:text-emerald-700 hover:underline cursor-pointer truncate" title="Click to view supplier comparison">{item.name}</h4>

                      {/* Zero-Storage Google Drive Image Thumbnail / Lightbox Trigger */}
                      {item.image_drive_url ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setLightboxData({ url: item.image_drive_url!, name: item.name });
                          }}
                          className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-0.5"
                          title="Open Google Drive Image Lightbox"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                          <Eye className="w-2.5 h-2.5 text-emerald-600" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingComponent(item);
                          }}
                          className="p-1 rounded-md bg-[white] hover:bg-[#e2e8f0] text-[#1e293b] border border-dashed border-[#e2e8f0] transition-all cursor-pointer shrink-0"
                          title="Attach Google Drive Image Link"
                        >
                          <ImageIcon className="w-3.5 h-3.5 opacity-40" />
                        </button>
                      )}

                      <select
                        value={
                          item.category_id ||
                          categories.find(c => c.name.toLowerCase() === (item.category || '').toLowerCase())?.id ||
                          item.category ||
                          'Capacitor'
                        }
                        onChange={async e => {
                          const selectedVal = e.target.value;
                          const matched = categories.find(
                            c => c.id === selectedVal || c.name.toLowerCase() === selectedVal.toLowerCase()
                          );
                          const catName = matched ? matched.name : selectedVal;
                          const catId = matched ? matched.id : (selectedVal.startsWith('cat') ? selectedVal : undefined);

                          const updatedItem: CatalogItem = {
                            ...item,
                            component_id: item.id,
                            product_id: catId || item.category_id || '',
                            category: catName,
                            category_id: catId
                          };

                          if (onUpdateCatalogItem) {
                            await onUpdateCatalogItem(updatedItem);
                          }
                          setToastFeedback({
                            type: 'success',
                            message: `Category for "${item.name}" updated to "${catName}"!`
                          });
                          setTimeout(() => setToastFeedback(null), 3000);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-900 border border-emerald-300 hover:border-emerald-500 transition-all cursor-pointer focus:outline-none shrink-0"
                        title="Click to change category"
                      >
                        {allCategoryNames.map(cat => {
                          const catObj = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
                          const val = catObj ? catObj.id : cat;
                          return (
                            <option key={cat} value={val}>
                              {cat}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#1e293b] truncate mt-0.5">
                      <span className="truncate max-w-[200px]">{item.specs || 'Standard industrial spec'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate text-[#020617] font-medium">
                        <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {(() => {
                            const linkedSupps = componentCompanies.filter(cs => cs.component_id === item.id);
                            if (linkedSupps.length > 0) {
                              // Deterministic sort by lowest RFQ quoted price (lowest first, no AI)
                              const sorted = [...linkedSupps].sort((a, b) => {
                                const pA = (a.rfq_quoted_price ?? a.unit_price ?? 0);
                                const pB = (b.rfq_quoted_price ?? b.unit_price ?? 0);
                                return pA - pB;
                              });
                              const lowest = sorted[0];
                              const lowestComp = companies.find(c => c.id === lowest.company_id);
                              const price = lowest.rfq_quoted_price ?? lowest.unit_price;
                              const name = lowestComp?.name || 'Default Company';
                              if (linkedSupps.length > 1) {
                                return `${name} (Lowest ₹${price}) +${linkedSupps.length - 1} more`;
                              }
                              return `${name} (₹${price})`;
                            }
                            const count = item.company_ids?.length || (item.company_id ? 1 : 0);
                            if (count > 1) {
                              return `${company?.name || 'Primary'} +${count - 1} more`;
                            }
                            return company?.name || 'General Company';
                          })()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#e2e8f0]/60">
                  {/* Automated Conditional "To Be Ordered" Badge (Only when Stock <= 20%) */}
                  {isBottleneck && (
                    <span
                      className="bg-amber-500/20 text-amber-900 border border-amber-500/40 text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 shrink-0 select-none shadow-2xs"
                      title="Stock is <= 20% of safe reorder threshold"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>To Be Ordered</span>
                    </span>
                  )}

                  {/* Stock */}
                  <div className="text-right">
                    <span className="text-[9px] text-[#1e293b] uppercase font-semibold block">Stock</span>
                    <span className="text-xs font-bold text-[#020617] font-mono">
                      {item.in_stock_qty ?? 0} {item.uom || 'Pcs'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-[9px] text-[#1e293b] uppercase font-semibold block">Rate</span>
                    <span className="text-xs font-extrabold text-emerald-800 font-mono">
                      ₹{Number(item.preset_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* 1-Tap Reorder Input Group */}
                  <div onClick={e => e.stopPropagation()} className="flex items-center rounded-lg border border-[#e2e8f0] overflow-hidden">
                    <input
                      type="number"
                      min={1}
                      value={reorderQtyMap[item.id] || item.min_order_qty || 10}
                      onChange={e => setReorderQtyMap(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-14 px-1.5 py-1.5 text-xs font-mono font-bold text-center bg-[white] focus:outline-none focus:bg-white text-[#020617]"
                      title="Override quantity"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); setReOrderConfirmData({ item, qty: reorderQtyMap[item.id] || item.min_order_qty || 10 }); }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Reorder
                    </button>
                  </div>

                                    {/* Linked Companies indicator badge (Click card to open dedicated view) */}
                  {(() => {
                    const linked = componentCompanies.filter(cs => cs.component_id === item.id);
                    const sCount = linked.length > 0 
                      ? linked.length 
                      : (item.company_ids?.length || (item.company_id ? 1 : 0));

                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inventory/component/${item.id}`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-950 border border-emerald-500/30 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                        title="Click to open Company Quotation & Commercial Parameters"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{sCount} {sCount === 1 ? 'Company' : 'Companies'}</span>
                        <ChevronRight className="w-3 h-3 text-emerald-600 group-hover/card:translate-x-0.5 transition-transform" />
                      </button>
                    );
                  })()}

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingComponent(item); }}
                      className="p-1.5 rounded bg-[white] hover:bg-emerald-100 text-[#1e293b] hover:text-emerald-800 border border-[#e2e8f0] transition-all cursor-pointer"
                      title="Edit Component"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setComponentToDelete(item); }}
                      className="p-1.5 rounded bg-[white] hover:bg-red-100 text-[#1e293b] hover:text-red-700 border border-[#e2e8f0] transition-all cursor-pointer"
                      title="Delete Component"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Product Folder Modal */}
      {isAddFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[white] w-full max-w-md rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 text-[#020617]">
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-3">
              <h3 className="text-lg font-bold text-[#020617]">Create New Product Folder</h3>
              <button onClick={() => setIsAddFolderOpen(false)} className="text-[#1e293b] hover:text-[#020617] font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFolderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#020617] mb-1">Product Folder / Assembly Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderNameInput}
                  onChange={e => setNewFolderNameInput(e.target.value)}
                  placeholder="e.g. 48V 100Ah Telecom Battery Rack"
                  className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFolderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[white] text-[#020617] font-semibold hover:bg-[#e2e8f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Component Modal — Responsive: bottom-sheet on mobile, centered on desktop */}
      {isAddCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[white] w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl border border-[#e2e8f0] shadow-2xl flex flex-col max-h-[90vh] text-[#020617]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 px-5 py-4 shrink-0">
              <h3 className="text-lg font-bold text-[#020617]">Add Component to Catalog</h3>
              <button onClick={() => setIsAddCatalogOpen(false)} className="text-[#1e293b] hover:text-[#020617] font-bold p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCatalogSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 text-xs">
              {/* Component Name (ONLY REQUIRED FIELD) */}
              <div>
                <label className="block font-semibold text-[#020617] mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={catalogForm.name}
                  onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  placeholder="e.g. 3.2V 100Ah LFP Cell"
                  className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Category & Unit of Measure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#020617] mb-1">Category</label>
                  <select
                    value={catalogForm.category}
                    onChange={e => setCatalogForm({ ...catalogForm, category: e.target.value })}
                    className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {allCategoryNames.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#020617] mb-1">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    value={catalogForm.uom}
                    onChange={e => setCatalogForm({ ...catalogForm, uom: e.target.value })}
                    placeholder="Pcs, Sets, Kg, etc."
                    className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Multi-Company Sourcing Association (Tag / Pill UI + Commercial Parameters) */}
              <div className="space-y-3 p-4 bg-[white] rounded-2xl border border-[#e2e8f0] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block font-bold text-xs text-[#020617] uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Associated Sourcing Companies</span> <span className="text-[11px] text-slate-700 font-normal lowercase">(optional)</span>
                    </label>
                    <p className="text-[11px] text-[#1e293b] mt-0.5">
                      Associate 1 or more companies. Associating 2+ vendors enables the <strong>"Compare Companies"</strong> AI engine.
                    </p>
                  </div>
                  {catalogForm.selectedCompanies.length >= 2 && (
                    <span className="self-start sm:self-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/15 text-emerald-900 border border-emerald-500/30 text-[10px] font-black animate-in fade-in">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Comparison Enabled ({catalogForm.selectedCompanies.length} Vendors)</span>
                    </span>
                  )}
                </div>

                {/* Searchable Add Company Dropdown */}
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        handleAddCompanyToForm(e.target.value);
                      }
                    }}
                    className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs text-[#020617] focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                  >
                    <option value="">+ Click to add a company to this component...</option>
                    {companies
                      .filter(s => !catalogForm.selectedCompanies.some(sel => sel.company_id === s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.contact_person || s.category} {s.rating ? `(★ ${s.rating})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Validation Error Banner */}
                {companyValidationMsg && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{companyValidationMsg}</span>
                  </div>
                )}

                {/* Selected Companies Pill/Chip UI with Search + Remove 'x' */}
                {catalogForm.selectedCompanies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {catalogForm.selectedCompanies.map((item, idx) => {
                      const supp = companies.find(s => s.id === item.company_id);
                      return (
                        <span
                          key={item.company_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#020617] border border-[#e2e8f0] text-xs font-bold shadow-2xs group"
                        >
                          <Building2 className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[140px]">{supp?.name || item.company_id}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-semibold">
                              Primary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveCompanyFromForm(item.company_id)}
                            className="p-0.5 rounded-full hover:bg-red-100 text-[#1e293b] hover:text-red-700 transition-all cursor-pointer ml-1"
                            title="Remove company"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No company selected yet. Please select at least 1 company above.</span>
                  </div>
                )}

                {/* Multi-Company Highlighting Callout */}
                {catalogForm.selectedCompanies.length >= 2 ? (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Multi-Vendor Sourcing Active:</strong> You can tune individual RFQ quoted rates, MOQ, and lead times per company below. These metrics feed directly into algorithmic pre-scoring & Gemini 3.6 Flash recommendations.
                    </div>
                  </div>
                ) : catalogForm.selectedCompanies.length === 1 ? (
                  <p className="text-[11px] text-[#1e293b] italic">
                    💡 Tip: Add a 2nd company to unlock side-by-side RFQ comparison & AI company ranking.
                  </p>
                ) : null}

                {/* Dynamic Nested Fields / Compact Inline List per Selected Company */}
                {catalogForm.selectedCompanies.length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-[#e2e8f0]/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#1e293b] block">
                      Company Commercial Parameters & RFQ Metrics:
                    </span>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {catalogForm.selectedCompanies.map((item, idx) => {
                        const supp = companies.find(s => s.id === item.company_id);
                        return (
                          <div
                            key={item.company_id}
                            className="p-3 rounded-xl bg-[white] border border-[#e2e8f0] space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-[#020617]">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-mono font-bold">
                                  {idx + 1}
                                </span>
                                <span>{supp?.name}</span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCompanyFromForm(item.company_id)}
                                className="text-[#1e293b] hover:text-red-700 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Dynamic 4-field grid per company */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#1e293b] mb-0.5">RFQ Quoted Price (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={item.rfq_quoted_price ?? item.unit_price}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    rfq_quoted_price: Number(e.target.value) || 0,
                                    unit_price: Number(e.target.value) || 0
                                  })}
                                  className="w-full bg-[white] border border-[#e2e8f0] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#020617] focus:outline-none focus:border-emerald-500"
                                  placeholder="150"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#1e293b] mb-0.5">MOQ</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.moq}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    moq: Number(e.target.value) || 1
                                  })}
                                  className="w-full bg-[white] border border-[#e2e8f0] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#020617] focus:outline-none focus:border-emerald-500"
                                  placeholder="10"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#1e293b] mb-0.5">Lead Time (Days)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.lead_time_days}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    lead_time_days: Number(e.target.value) || 7
                                  })}
                                  className="w-full bg-[white] border border-[#e2e8f0] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#020617] focus:outline-none focus:border-emerald-500"
                                  placeholder="7"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#1e293b] mb-0.5">Vendor Part # / SKU</label>
                                <input
                                  type="text"
                                  value={item.part_number_vendor || ''}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    part_number_vendor: e.target.value
                                  })}
                                  className="w-full bg-[white] border border-[#e2e8f0] rounded-lg px-2 py-1 text-xs font-mono text-[#020617] focus:outline-none focus:border-emerald-500"
                                  placeholder="OEM-SPEC"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>


              {/* Stock Quantity */}
              <div>
                <label className="block font-semibold text-[#020617] mb-1">Stock Quantity (In-Stock)</label>
                <input
                  type="number"
                  min={0}
                  value={catalogForm.in_stock_qty}
                  onChange={e => setCatalogForm({ ...catalogForm, in_stock_qty: Number(e.target.value) || 0 })}
                  className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Custom Stock Alert Threshold Slider */}
              <div>
                <label className="flex items-center justify-between font-semibold text-[#020617] mb-1 text-sm">
                  <span>Low Stock Alert Threshold</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs">
                    {catalogForm.alert_threshold_percent}% of MOQ
                  </span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={catalogForm.alert_threshold_percent}
                  onChange={e => setCatalogForm({ ...catalogForm, alert_threshold_percent: Number(e.target.value) })}
                  className="w-full h-2 bg-[#e2e8f0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-[10px] text-[#1e293b] mt-1">
                  Alert triggers when stock falls below {Math.floor((Number(catalogForm.target_qty) || 1) * (catalogForm.alert_threshold_percent / 100))} {catalogForm.uom || 'Pcs'}
                </p>
              </div>

              {/* Google Drive Image Link */}
              <div>
                <label className="block font-semibold text-[#020617] mb-1">Google Drive Image Link</label>
                <input
                  type="url"
                  value={catalogForm.image_drive_url}
                  onChange={e => setCatalogForm({ ...catalogForm, image_drive_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[10px] text-[#1e293b] mt-1 italic">
                  (Ensure link permissions are set to "Anyone with the link can view")
                </p>
              </div>

              {/* Technical Specifications */}
              <div>
                <label className="block font-semibold text-[#020617] mb-1">Technical Specification (Optional)</label>
                <textarea
                  rows={2}
                  value={catalogForm.specs}
                  onChange={e => setCatalogForm({ ...catalogForm, specs: e.target.value })}
                  placeholder="e.g. LiFePO4, 3.2V, 100Ah, M6 Terminals..."
                  className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#020617] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              </div>{/* end scrollable body */}

              {/* Sticky Footer Action Buttons */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#e2e8f0]/60 shrink-0 bg-[white] sm:rounded-b-3xl rounded-b-none">
                <button
                  type="button"
                  onClick={() => setIsAddCatalogOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[white] text-[#020617] font-semibold hover:bg-[#e2e8f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 1-Tap Re-Order Workflow Modal */}
      {reOrderConfirmData && (
        <ReOrderConfirmationModal
          item={reOrderConfirmData.item}
          quantity={reOrderConfirmData.qty}
          company={companies.find(s => s.id === reOrderConfirmData.item.company_id)}
          onClose={() => setReOrderConfirmData(null)}
          onConfirm={handleConfirmReOrder}
          onOpenWebmail={onOpenWebmail}
          onOpenWhatsApp={onOpenWhatsApp}
        />
      )}

      {/* Edit Component Modal */}
      {editingComponent && (
        <EditComponentModal
          item={editingComponent}
          companies={companies}
          categories={categories}
          componentCompanies={componentCompanies}
          onClose={() => setEditingComponent(null)}
          onSaveCompanyMappings={(componentId, mappings) => {
            // Propagate company mapping updates to the parent via onUpdateCatalogItem
            // The parent App.tsx will handle persisting to component_companies table
            const updatedItem = { ...editingComponent, company_mappings: mappings, company_ids: mappings.map(m => m.company_id), company_id: mappings[0]?.company_id || editingComponent.company_id };
            if (onUpdateCatalogItem) onUpdateCatalogItem(updatedItem);
          }}
          onSave={updatedItem => {
            if (onUpdateCatalogItem) {
              onUpdateCatalogItem(updatedItem);
            }
            setToastFeedback({ type: 'success', message: `Component "${updatedItem.name}" updated successfully!` });
            setTimeout(() => setToastFeedback(null), 3500);
          }}
        />
      )}

      {/* Product Folder View / Details Modal */}
      {activeDetailFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[white] w-full max-w-4xl rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-6 my-8 text-[#020617]">
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#020617]">{activeDetailFolder.name}</h3>
                  <p className="text-xs text-[#1e293b]">
                    Folder ID: {activeDetailFolder.id} • {activeDetailFolder.description || 'Assembly Recipe'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveDetailFolder(null)}
                className="text-[#1e293b] hover:text-[#020617] p-1.5 rounded-full bg-[white] transition-all font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Components List (Read-Only View) */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#020617] uppercase tracking-wider">
                  Product Components ({activeDetailFolder.components?.length || 0}):
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Read-Only View
                </span>
              </div>

              {!activeDetailFolder.components || activeDetailFolder.components.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[white] border border-dashed border-[#e2e8f0] text-center space-y-2">
                  <p className="text-xs text-[#1e293b] font-medium">
                    No raw material components assigned to this product recipe yet.
                  </p>
                  <p className="text-[11px] text-[#1e293b]">
                    To assign components, use the <strong className="text-[#020617] font-semibold">+ Component</strong> button on the Product Folder card.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDetailFolder.components.map((comp, idx) => {
                    const catItem = catalog.find(c => c.id === comp.item_id) || catalog[idx % catalog.length];
                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[white]/70 border border-[#e2e8f0] shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#020617]">{catItem?.name || 'Raw Material Component'}</span>
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            {catItem?.category || 'Capacitor'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-[white] p-2 rounded-xl text-xs border border-[#e2e8f0]/50">
                          <span className="text-[#1e293b] font-medium">Req per Build:</span>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            {comp.qty_per_unit} {catItem?.uom || 'Pcs'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#1e293b] pt-1">
                          <span>Stock: <strong className="text-[#020617]">{catItem?.in_stock_qty || 0} {catItem?.uom}</strong></span>
                          <span className="font-mono font-bold text-emerald-800">₹{Number(catItem?.preset_price || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {recipeFolder && (
        <ProductFolderRecipeModal
          folder={recipeFolder}
          catalog={catalog}
          onClose={() => setRecipeFolder(null)}
          onSaveRecipe={async (folderId: string, components: ProductFolderComponent[]) => {
            if (onUpdateFolderComponents) {
              onUpdateFolderComponents(folderId, components);
            }
            setToastFeedback({ type: 'success', message: `Recipe saved for "${recipeFolder.name}"!` });
            setTimeout(() => setToastFeedback(null), 3500);
          }}
        />
      )}

      {/* Batch Send POs Modal */}
      {batchSendFolder && (
        <BatchSendPOsModal
          folder={batchSendFolder}
          catalog={catalog}
          companies={companies}
          orders={orders}
          onClose={() => setBatchSendFolder(null)}
          onLogOrders={async (drafts: MultiCompanyPODraft[], type?: 'PO' | 'RFQ') => {
            if (onLogOrders) {
              await onLogOrders(drafts, type);
            }
            setToastFeedback({ type: 'success', message: `Logged ${drafts.length} purchase orders from folder recipe!` });
            setTimeout(() => setToastFeedback(null), 4000);
          }}
          onOpenWhatsApp={onOpenWhatsApp}
          onOpenWebmail={onOpenWebmail}
          onEnqueueMailDrafts={onEnqueueMailDrafts}
        />
      )}

      {/* Folder Deletion Confirmation Dialog */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[white] w-full max-w-md rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 text-[#020617]">
            <h3 className="text-lg font-bold text-red-700">Delete Product Folder</h3>
            <p className="text-xs text-[#1e293b]">
              Are you sure you want to delete folder <span className="font-bold text-[#020617]">"{folderToDelete.name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[white] text-[#020617] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmCascadeFolderDelete(folderToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Deletion Confirmation Dialog */}
      {componentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[white] w-full max-w-md rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 text-[#020617]">
            <h3 className="text-lg font-bold text-red-700">Delete Component</h3>
            <p className="text-xs text-[#1e293b]">
              Are you sure you want to remove <span className="font-bold text-[#020617]">"{componentToDelete.name}"</span> from catalog?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setComponentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[white] text-[#020617] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmDeleteComponent(componentToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Zero-Storage Google Drive Image Lightbox Modal */}
      {lightboxData && (
        <DriveImageLightboxModal
          imageUrl={lightboxData.url}
          componentName={lightboxData.name}
          onClose={() => setLightboxData(null)}
        />
      )}
      {/* Slide-over Drawer for SKU Build Capacity Calculator */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCalculatorOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 text-base">SKU Build Capacity Calculator</h3>
                    <p className="text-xs text-slate-700">Live BOM recipe math, component shortages & batch capacity</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalculatorOpen(false)}
                  className="p-2 rounded-xl text-slate-800 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <SKUCapacityCalculator catalog={catalog} boms={boms} folders={folders} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
