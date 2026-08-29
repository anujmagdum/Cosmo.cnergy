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
  ComponentCompany
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
  PlusCircle,
  Send,
  Edit2,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Award,
  Tag
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
  onLogOrders?: (drafts: MultiCompanyPODraft[]) => Promise<void> | void;
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
  'Battery Cells',
  'Electronics / BMS',
  'Connectors & Busbars',
  'Metal Enclosures',
  'Wiring & Harnesses',
  'General Company'
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

  // 1-Tap Re-Order Modal State & Toast
  const [reOrderConfirmData, setReOrderConfirmData] = useState<{ item: CatalogItem; qty: number } | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reorderQtyMap, setReorderQtyMap] = useState<Record<string, number>>({});

  const allCategoryNames = useMemo<string[]>(() => {
    const names: string[] = [
      ...DEFAULT_CATEGORIES,
      ...categories.map(c => c.name),
      ...catalog.map(c => c.category || '').filter(Boolean)
    ];
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
    category: 'Battery Cells',
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

    // Requirement: Ensure form validation requires at least 1 company
    if (catalogForm.selectedCompanies.length === 0) {
      setCompanyValidationMsg('Please associate at least 1 company for this component.');
      return;
    }

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
        category: 'Battery Cells',
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
          className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none ${
            activeStatusFilter === 'TO_BE_ORDERED'
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-lg ring-2 ring-amber-500/40 font-bold scale-[1.01]'
              : 'bg-[#FDF6E3] hover:bg-amber-50/80 border-[#D6D1B1] hover:border-amber-400 shadow-xs'
          }`}
          title="Click to filter components needing to be ordered (Stock <= 20%)"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] sm:text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${
                activeStatusFilter === 'TO_BE_ORDERED' ? 'text-slate-950' : 'text-[#586E75]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              To Be Ordered (Stock &le; 20%)
            </span>
            {activeStatusFilter === 'TO_BE_ORDERED' && (
              <span className="text-[10px] font-black uppercase bg-slate-950 text-amber-400 px-2 py-0.5 rounded">
                Active Filter
              </span>
            )}
          </div>
          <div className="flex items-end justify-between mt-3">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                activeStatusFilter === 'TO_BE_ORDERED' ? 'text-slate-950' : 'text-amber-600'
              }`}
            >
              {counts.to_be_ordered}
            </span>
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center border text-lg ${
                activeStatusFilter === 'TO_BE_ORDERED'
                  ? 'bg-slate-950/20 border-slate-950/30'
                  : 'bg-amber-200/50 border-amber-300'
              }`}
            >
              ⏳
            </span>
          </div>
        </div>

        {/* 2. All Procurement Records */}
        <div
          onClick={() => setActiveStatusFilter('ALL')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between select-none ${
            activeStatusFilter === 'ALL'
              ? 'bg-[#0B192C] text-white border-slate-700 shadow-lg ring-2 ring-slate-600/40 font-bold scale-[1.01]'
              : 'bg-[#FDF6E3] hover:bg-[#EEE8D5] border-[#D6D1B1] shadow-xs'
          }`}
          title="Click to view all component procurement records"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] sm:text-xs font-black uppercase tracking-wide ${
                activeStatusFilter === 'ALL' ? 'text-slate-300' : 'text-[#586E75]'
              }`}
            >
              All Procurement Records
            </span>
            {activeStatusFilter === 'ALL' && (
              <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded">
                All View
              </span>
            )}
          </div>
          <div className="flex items-end justify-between mt-3">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                activeStatusFilter === 'ALL' ? 'text-white' : 'text-[#073642]'
              }`}
            >
              {counts.total}
            </span>
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center border text-lg ${
                activeStatusFilter === 'ALL'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-200/50 border-slate-300'
              }`}
            >
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl bg-[#0B192C] text-white shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Layers className="w-7 h-7 text-emerald-400" />
            <span>Components & Product Catalog</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Ultra-dense ladder inventory, assembly folders, relational BOM recipes, and 1-Tap procurement routing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddFolderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Product Folder</span>
          </button>

          <button
            onClick={() => setIsAddCatalogOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
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

      {/* SKU Capacity Calculator Widget */}
      <SKUCapacityCalculator catalog={catalog} boms={boms} folders={folders} />

      {/* Filter, Search & Category Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between py-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#586E75] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search components, folders, specs, categories..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl pl-10 pr-4 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 transition-all shadow-sm font-medium placeholder-[#586E75]"
          />
        </div>

        {/* Category Pills with Immediate Click-to-Filter Reactivity */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => handleSelectCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategoryFilter.toLowerCase() === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#EEE8D5] border border-[#D6D1B1]'
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
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#EEE8D5] border border-[#D6D1B1]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBSECTION 1: PRODUCT FOLDERS (Collapsible Accordion Header - Collapsed by Default) */}
      <div className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl p-3.5 shadow-2xs transition-all">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsFoldersExpanded(prev => !prev)}
            className="flex items-center gap-2.5 text-left text-sm font-bold text-[#073642] hover:text-emerald-800 transition-colors cursor-pointer group py-0.5 select-none"
            title={isFoldersExpanded ? "Click to collapse Product Folders" : "Click to expand Product Folders"}
          >
            <div className="w-6 h-6 rounded-lg bg-[#EEE8D5] border border-[#D6D1B1] flex items-center justify-center text-[#586E75] group-hover:bg-emerald-100 group-hover:text-emerald-800 group-hover:border-emerald-300 transition-all">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isFoldersExpanded ? 'rotate-180 text-emerald-700' : 'text-[#586E75]'
                }`}
              />
            </div>

            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Product Folders & Pack Assemblies</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1]">
              {filteredFolders.length}
            </span>
            <span className="text-[11px] font-normal text-[#586E75] hidden sm:inline-block">
              {isFoldersExpanded ? '(Click to collapse)' : '(Click to expand assemblies)'}
            </span>
          </button>

          {/* Right side of header: If expanded and has selected folders, show bulk delete actions */}
          {isFoldersExpanded && selectedFolderIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-[#073642]">{selectedFolderIds.length} Selected</span>
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
          <div className="mt-3 pt-3 border-t border-[#D6D1B1]/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-xs text-[#586E75] pb-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={filteredFolders.length > 0 && selectedFolderIds.length === filteredFolders.length}
                  onChange={handleSelectAllFolders}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <span>Select All Assemblies</span>
              </label>
              <span className="text-[11px] text-[#586E75] hidden md:inline-block">Click an assembly folder to manage recipe components</span>
            </div>

            <div className="flex flex-col space-y-2">
              {filteredFolders.map(folder => {
                const componentsCount = (folder.components || []).length;

                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveDetailFolder(folder)}
                    className="w-full group bg-[#EEE8D5]/60 hover:bg-[#EEE8D5] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/70 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                          <h4 className="font-bold text-[#073642] text-xs md:text-sm group-hover:text-emerald-800 transition-colors truncate">
                            {folder.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#FDF6E3] text-[#073642] font-semibold border border-[#D6D1B1] shrink-0">
                            {componentsCount} Components
                          </span>
                        </div>
                        <span className="text-[11px] text-[#586E75] block truncate">
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
                        className="text-[#586E75] hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredFolders.length === 0 && (
                <div className="p-4 text-center text-xs text-[#586E75] italic">
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
            <h3 className="text-sm font-bold text-[#073642] flex items-center gap-2">
              <input
                type="checkbox"
                checked={filteredCatalog.length > 0 && selectedComponentIds.length === filteredCatalog.length}
                onChange={handleSelectAllComponents}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Components & Raw Materials ({filteredCatalog.length})</span>
            </h3>
            <span className="text-[11px] text-[#586E75] ml-6">Maximized density ladder view with multi-select bulk delete</span>
          </div>

          {selectedComponentIds.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-emerald-500 animate-in fade-in">
              <span className="text-xs font-bold text-[#073642] px-2">{selectedComponentIds.length} Selected</span>
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
        </div>

        <div className="flex flex-col space-y-2">
          {filteredCatalog.map(item => {
            const company = companies.find(s => s.id === item.company_id);
            const isBottleneck = isStockBottleneck(item);

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button, input, select, textarea, [data-stop-nav]')) {
                    return;
                  }
                  navigate(`/inventory/component/${item.id}`);
                }}
                className="w-full bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500 hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all group/card"
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

                  <div className="w-8 h-8 rounded-lg bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] flex items-center justify-center font-bold text-xs shrink-0">
                    <Package className="w-4 h-4 text-emerald-700" />
                  </div>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs md:text-sm font-bold text-[#073642] truncate">{item.name}</h4>

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
                          className="p-1 rounded-md bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#586E75] border border-dashed border-[#D6D1B1] transition-all cursor-pointer shrink-0"
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
                          'Battery Cells'
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

                    <div className="flex items-center gap-2 text-[11px] text-[#586E75] truncate mt-0.5">
                      <span className="truncate max-w-[200px]">{item.specs || 'Standard industrial spec'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate text-[#073642] font-medium">
                        <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {(() => {
                            const linkedSupps = componentCompanies.filter(cs => cs.component_id === item.id);
                            const count = linkedSupps.length > 0
                              ? linkedSupps.length
                              : (item.company_ids?.length || (item.company_id ? 1 : 0));
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
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
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
                    <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Stock</span>
                    <span className="text-xs font-bold text-[#073642] font-mono">
                      {item.in_stock_qty ?? 0} {item.uom || 'Pcs'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Rate</span>
                    <span className="text-xs font-extrabold text-emerald-800 font-mono">
                      ₹{Number(item.preset_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* 1-Tap Reorder Input Group */}
                  <div onClick={e => e.stopPropagation()} className="flex items-center rounded-lg border border-[#D6D1B1] overflow-hidden">
                    <input
                      type="number"
                      min={1}
                      value={reorderQtyMap[item.id] || item.min_order_qty || 10}
                      onChange={e => setReorderQtyMap(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-14 px-1.5 py-1.5 text-xs font-mono font-bold text-center bg-[#FDF6E3] focus:outline-none focus:bg-white text-[#073642]"
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
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-950 border border-emerald-500/30 text-[10px] font-bold shrink-0 group-hover/card:bg-emerald-600/20 transition-colors"
                        title="Click to view dedicated company comparison page"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{sCount} {sCount === 1 ? 'Company' : 'Companies'}</span>
                        <ChevronRight className="w-3 h-3 text-emerald-600 group-hover/card:translate-x-0.5 transition-transform" />
                      </div>
                    );
                  })()}

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingComponent(item); }}
                      className="p-1.5 rounded bg-[#EEE8D5] hover:bg-emerald-100 text-[#586E75] hover:text-emerald-800 border border-[#D6D1B1] transition-all cursor-pointer"
                      title="Edit Component"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setComponentToDelete(item); }}
                      className="p-1.5 rounded bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 border border-[#D6D1B1] transition-all cursor-pointer"
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
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <h3 className="text-lg font-bold text-[#073642]">Create New Product Folder</h3>
              <button onClick={() => setIsAddFolderOpen(false)} className="text-[#586E75] hover:text-[#073642] font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFolderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Product Folder / Assembly Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderNameInput}
                  onChange={e => setNewFolderNameInput(e.target.value)}
                  placeholder="e.g. 48V 100Ah Telecom Battery Rack"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFolderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
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
          <div className="bg-[#FDF6E3] w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl border border-[#D6D1B1] shadow-2xl flex flex-col max-h-[90vh] text-[#073642]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 px-5 py-4 shrink-0">
              <h3 className="text-lg font-bold text-[#073642]">Add Component to Catalog</h3>
              <button onClick={() => setIsAddCatalogOpen(false)} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCatalogSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 text-xs">
              {/* Component Name (ONLY REQUIRED FIELD) */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={catalogForm.name}
                  onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  placeholder="e.g. 3.2V 100Ah LFP Cell"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Category & Unit of Measure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Category</label>
                  <select
                    value={catalogForm.category}
                    onChange={e => setCatalogForm({ ...catalogForm, category: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {allCategoryNames.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    value={catalogForm.uom}
                    onChange={e => setCatalogForm({ ...catalogForm, uom: e.target.value })}
                    placeholder="Pcs, Sets, Kg, etc."
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Multi-Company Sourcing Association (Tag / Pill UI + Commercial Parameters) */}
              <div className="space-y-3 p-4 bg-[#FDF6E3] rounded-2xl border border-[#D6D1B1] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block font-bold text-xs text-[#073642] uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Associated Sourcing Companies *</span>
                    </label>
                    <p className="text-[11px] text-[#586E75] mt-0.5">
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
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#073642] border border-[#D6D1B1] text-xs font-bold shadow-2xs group"
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
                            className="p-0.5 rounded-full hover:bg-red-100 text-[#586E75] hover:text-red-700 transition-all cursor-pointer ml-1"
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
                  <p className="text-[11px] text-[#586E75] italic">
                    💡 Tip: Add a 2nd company to unlock side-by-side RFQ comparison & AI company ranking.
                  </p>
                ) : null}

                {/* Dynamic Nested Fields / Compact Inline List per Selected Company */}
                {catalogForm.selectedCompanies.length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-[#D6D1B1]/60">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#586E75] block">
                      Company Commercial Parameters & RFQ Metrics:
                    </span>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {catalogForm.selectedCompanies.map((item, idx) => {
                        const supp = companies.find(s => s.id === item.company_id);
                        return (
                          <div
                            key={item.company_id}
                            className="p-3 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-[#073642]">
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
                                className="text-[#586E75] hover:text-red-700 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Dynamic 4-field grid per company */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">RFQ Quoted Price (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={item.rfq_quoted_price ?? item.unit_price}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    rfq_quoted_price: Number(e.target.value) || 0,
                                    unit_price: Number(e.target.value) || 0
                                  })}
                                  className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none focus:border-emerald-500"
                                  placeholder="150"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">MOQ</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.moq}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    moq: Number(e.target.value) || 1
                                  })}
                                  className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none focus:border-emerald-500"
                                  placeholder="10"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">Lead Time (Days)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.lead_time_days}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    lead_time_days: Number(e.target.value) || 7
                                  })}
                                  className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none focus:border-emerald-500"
                                  placeholder="7"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">Vendor Part # / SKU</label>
                                <input
                                  type="text"
                                  value={item.part_number_vendor || ''}
                                  onChange={e => handleUpdateCompanyMapping(item.company_id, {
                                    part_number_vendor: e.target.value
                                  })}
                                  className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500"
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
                <label className="block font-semibold text-[#073642] mb-1">Stock Quantity (In-Stock)</label>
                <input
                  type="number"
                  min={0}
                  value={catalogForm.in_stock_qty}
                  onChange={e => setCatalogForm({ ...catalogForm, in_stock_qty: Number(e.target.value) || 0 })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Custom Stock Alert Threshold Slider */}
              <div>
                <label className="flex items-center justify-between font-semibold text-[#073642] mb-1 text-sm">
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
                  className="w-full h-2 bg-[#D6D1B1] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-[10px] text-[#586E75] mt-1">
                  Alert triggers when stock falls below {Math.floor((Number(catalogForm.target_qty) || 1) * (catalogForm.alert_threshold_percent / 100))} {catalogForm.uom || 'Pcs'}
                </p>
              </div>

              {/* Google Drive Image Link */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Google Drive Image Link</label>
                <input
                  type="url"
                  value={catalogForm.image_drive_url}
                  onChange={e => setCatalogForm({ ...catalogForm, image_drive_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[10px] text-[#586E75] mt-1 italic">
                  (Ensure link permissions are set to "Anyone with the link can view")
                </p>
              </div>

              {/* Technical Specifications */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Technical Specification (Optional)</label>
                <textarea
                  rows={2}
                  value={catalogForm.specs}
                  onChange={e => setCatalogForm({ ...catalogForm, specs: e.target.value })}
                  placeholder="e.g. LiFePO4, 3.2V, 100Ah, M6 Terminals..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              </div>{/* end scrollable body */}

              {/* Sticky Footer Action Buttons */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#D6D1B1]/60 shrink-0 bg-[#FDF6E3] sm:rounded-b-3xl rounded-b-none">
                <button
                  type="button"
                  onClick={() => setIsAddCatalogOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
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
          <div className="bg-[#FDF6E3] w-full max-w-4xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-6 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#073642]">{activeDetailFolder.name}</h3>
                  <p className="text-xs text-[#586E75]">
                    Folder ID: {activeDetailFolder.id} • {activeDetailFolder.description || 'Assembly Recipe'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveDetailFolder(null)}
                className="text-[#586E75] hover:text-[#073642] p-1.5 rounded-full bg-[#EEE8D5] transition-all font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Components List (Read-Only View) */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider">
                  Product Components ({activeDetailFolder.components?.length || 0}):
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Read-Only View
                </span>
              </div>

              {!activeDetailFolder.components || activeDetailFolder.components.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#EEE8D5] border border-dashed border-[#D6D1B1] text-center space-y-2">
                  <p className="text-xs text-[#586E75] font-medium">
                    No raw material components assigned to this product recipe yet.
                  </p>
                  <p className="text-[11px] text-[#586E75]">
                    To assign components, use the <strong className="text-[#073642] font-semibold">+ Component</strong> button on the Product Folder card.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDetailFolder.components.map((comp, idx) => {
                    const catItem = catalog.find(c => c.id === comp.item_id) || catalog[idx % catalog.length];
                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#EEE8D5]/70 border border-[#D6D1B1] shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#073642]">{catItem?.name || 'Raw Material Component'}</span>
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            {catItem?.category || 'Battery Cells'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-[#FDF6E3] p-2 rounded-xl text-xs border border-[#D6D1B1]/50">
                          <span className="text-[#586E75] font-medium">Req per Build:</span>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            {comp.qty_per_unit} {catItem?.uom || 'Pcs'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#586E75] pt-1">
                          <span>Stock: <strong className="text-[#073642]">{catItem?.in_stock_qty || 0} {catItem?.uom}</strong></span>
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
          onLogOrders={async (drafts: MultiCompanyPODraft[]) => {
            if (onLogOrders) {
              await onLogOrders(drafts);
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
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <h3 className="text-lg font-bold text-red-700">Delete Product Folder</h3>
            <p className="text-xs text-[#586E75]">
              Are you sure you want to delete folder <span className="font-bold text-[#073642]">"{folderToDelete.name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold"
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
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <h3 className="text-lg font-bold text-red-700">Delete Component</h3>
            <p className="text-xs text-[#586E75]">
              Are you sure you want to remove <span className="font-bold text-[#073642]">"{componentToDelete.name}"</span> from catalog?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setComponentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold"
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

      {/* Edit Component Modal */}
      {editingComponent && (
        <EditComponentModal
          item={editingComponent}
          companies={companies}
          categories={categories}
          onClose={() => setEditingComponent(null)}
          onSave={async (updatedItem) => {
            if (onUpdateCatalogItem) {
              await onUpdateCatalogItem(updatedItem);
            }
            setToastFeedback({ type: 'success', message: `Component "${updatedItem.name}" updated successfully!` });
            setTimeout(() => setToastFeedback(null), 3500);
          }}
        />
      )}

      {/* Zero-Storage Google Drive Image Lightbox Modal */}
      {lightboxData && (
        <DriveImageLightboxModal
          imageUrl={lightboxData.url}
          componentName={lightboxData.name}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};
