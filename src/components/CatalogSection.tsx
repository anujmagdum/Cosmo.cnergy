import React, { useState, useMemo, useEffect } from 'react';
import {
  CatalogItem,
  Supplier,
  ProcurementOrder,
  OrderStatus,
  ProductFolder,
  ProductBOM,
  ProductFolderComponent,
  MultiSupplierPODraft,
  QueuedMailDraft,
  STATUS_MAP,
  Category
} from '../types';
import { SKUCapacityCalculator } from './SKUCapacityCalculator';
import { ReOrderConfirmationModal } from './ReOrderConfirmationModal';
import { ProductFolderRecipeModal } from './ProductFolderRecipeModal';
import { BatchSendPOsModal } from './BatchSendPOsModal';
import { EditComponentModal } from './EditComponentModal';
import { CsvManagerWidget } from './CsvManagerWidget';
import {
  Package,
  Search,
  Plus,
  Folder,
  FolderPlus,
  Trash2,
  Building2,
  X,
  Check,
  Layers,
  PlusCircle,
  Send,
  Edit2,
  AlertCircle
} from 'lucide-react';

interface Props {
  catalog: CatalogItem[];
  suppliers: Supplier[];
  orders: ProcurementOrder[];
  folders: ProductFolder[];
  boms: ProductBOM[];
  categories?: Category[];
  onAddCatalogItem: (item: Omit<CatalogItem, 'id'>) => Promise<any> | void;
  onUpdateCatalogItem?: (item: CatalogItem) => Promise<any> | void;
  onAddProductFolder: (folderName: string) => Promise<any> | void;
  onUpdateFolderLinkedPOs: (folderId: string, poIds: string[]) => void;
  onUpdateFolderComponents?: (folderId: string, components: ProductFolderComponent[]) => void;
  onUpdateSupplierContact?: (supplierId: string, email: string, phone: string) => Promise<void> | void;
  onLogOrders?: (drafts: MultiSupplierPODraft[]) => Promise<void> | void;
  onDeleteProductFolder: (folderId: string) => Promise<void> | void;
  onDeleteOrder: (orderId: string) => Promise<void> | void;
  onDeleteCatalogItem: (itemId: string) => Promise<void> | void;
  onQuickReorder: (item: CatalogItem, qty: number) => void;
  onOpenWhatsApp: (supplier: Supplier, context?: string) => void;
  onOpenWebmail: (supplier: Supplier, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onEnqueueMailDrafts?: (drafts: QueuedMailDraft[], openFirstImmediately?: boolean) => void;
  onImportComponents?: (rows: any[]) => Promise<number | void> | number | void;
}

const DEFAULT_CATEGORIES = [
  'Battery Cells',
  'Electronics / BMS',
  'Connectors & Busbars',
  'Metal Enclosures',
  'Wiring & Harnesses',
  'General Supplier'
];

export const CatalogSection: React.FC<Props> = ({
  catalog,
  suppliers,
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
  onImportComponents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // 1-Tap Re-Order Modal State & Toast
  const [reOrderConfirmData, setReOrderConfirmData] = useState<{ item: CatalogItem; qty: number } | null>(null);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Add Component Form State
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    category: 'Battery Cells',
    target_qty: 10,
    preset_price: 150,
    in_stock_qty: 100,
    uom: 'Pcs',
    specs: '',
    supplier_id: suppliers[0]?.id || '',
    procurement_status: 'TO_BE_ORDERED' as OrderStatus
  });

  const filteredFolders = useMemo(() => {
    return folders.filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [folders, searchTerm]);

  // Reactive Catalog Filtering with robust category normalization
  const filteredCatalog = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const activeCat = selectedCategoryFilter.toLowerCase().trim();

    return catalog.filter(c => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.category || '').toLowerCase().includes(term) ||
        (c.specs || '').toLowerCase().includes(term);

      let matchesCategory = activeCat === 'all';
      if (!matchesCategory) {
        const itemCat = (c.category || '').toLowerCase().trim();
        const relationalCatName = c.category_id
          ? (categories.find(cat => cat.id === c.category_id)?.name || '').toLowerCase().trim()
          : '';
        matchesCategory = itemCat === activeCat || relationalCatName === activeCat;
      }

      return matchesSearch && matchesCategory;
    });
  }, [catalog, searchTerm, selectedCategoryFilter, categories]);

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
        supplier_id: catalogForm.supplier_id || suppliers[0]?.id || '',
        min_order_qty: Number(catalogForm.target_qty) || 1,
        in_stock_qty: Number(catalogForm.in_stock_qty) || 0,
        procurement_status: catalogForm.procurement_status
      });

      setCatalogForm({
        name: '',
        category: 'Battery Cells',
        target_qty: 10,
        preset_price: 150,
        in_stock_qty: 100,
        uom: 'Pcs',
        specs: '',
        supplier_id: suppliers[0]?.id || '',
        procurement_status: 'TO_BE_ORDERED'
      });
      setIsAddCatalogOpen(false);
      setToastFeedback({ type: 'success', message: `Component "${catalogForm.name}" added successfully!` });
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

  // Confirm Re-Order Execution
  const handleConfirmReOrder = async (item: CatalogItem, qty: number) => {
    await onQuickReorder(item, qty);
    setToastFeedback({ type: 'success', message: `Order placed successfully for ${item.name}!` });
    setTimeout(() => setToastFeedback(null), 3500);
  };

  return (
    <div className="space-y-5">
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

      {/* Filter, Search & Category Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
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

      {/* SKU Capacity Calculator Widget */}
      <SKUCapacityCalculator catalog={catalog} boms={boms} folders={folders} />

      {/* SUBSECTION 1: PRODUCT FOLDERS (Strict Vertical Ladder List View) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#073642] flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Product Folders & Pack Assemblies ({filteredFolders.length})</span>
          </h3>
          <span className="text-[11px] text-[#586E75]">Dense ladder list</span>
        </div>

        <div className="flex flex-col space-y-2">
          {filteredFolders.map(folder => {
            const componentsCount = (folder.components || []).length;

            return (
              <div
                key={folder.id}
                onClick={() => setActiveDetailFolder(folder)}
                className="w-full group bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/70 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Folder Name & Description & Components Count */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>

                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#073642] text-xs md:text-sm group-hover:text-emerald-800 transition-colors truncate">
                        {folder.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#EEE8D5] text-[#073642] font-semibold border border-[#D6D1B1] shrink-0">
                        {componentsCount} Components
                      </span>
                    </div>
                    <span className="text-[11px] text-[#586E75] block truncate">
                      {folder.description || 'LFP Battery Pack Assembly Recipe'}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
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
        </div>
      </div>

      {/* SUBSECTION 2: COMPONENTS (Strict Vertical Ladder List View) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#073642] flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Components & Raw Materials ({filteredCatalog.length})</span>
          </h3>
          <span className="text-[11px] text-[#586E75]">Maximized density ladder view</span>
        </div>

        <div className="flex flex-col space-y-2">
          {filteredCatalog.map(item => {
            const supplier = suppliers.find(s => s.id === item.supplier_id);
            const statusConfig = STATUS_MAP[item.procurement_status || 'TO_BE_ORDERED'] || STATUS_MAP['TO_BE_ORDERED'];

            return (
              <div
                key={item.id}
                className="w-full bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all"
              >
                {/* Left: Component Name, Category, Specs, Supplier */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] flex items-center justify-center font-bold text-xs shrink-0">
                    <Package className="w-4 h-4 text-emerald-700" />
                  </div>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs md:text-sm font-bold text-[#073642] truncate">{item.name}</h4>
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
                        <span className="truncate">{supplier?.name || 'General Supplier'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 shrink-0 ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                    <span>{statusConfig.label}</span>
                  </span>

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

                  {/* 1-Tap Reorder */}
                  <button
                    onClick={() => setReOrderConfirmData({ item, qty: item.min_order_qty || 10 })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    1-Tap Reorder
                  </button>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingComponent(item)}
                      className="p-1.5 rounded bg-[#EEE8D5] hover:bg-emerald-100 text-[#586E75] hover:text-emerald-800 border border-[#D6D1B1] transition-all cursor-pointer"
                      title="Edit Component"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setComponentToDelete(item)}
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

      {/* Add Component Modal */}
      {isAddCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <h3 className="text-lg font-bold text-[#073642]">Add Component to Catalog</h3>
              <button onClick={() => setIsAddCatalogOpen(false)} className="text-[#586E75] hover:text-[#073642] font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCatalogSubmit} className="space-y-3 text-xs">
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

              {/* Supplier (Optional) */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Supplier Company (Optional)</label>
                <select
                  value={catalogForm.supplier_id}
                  onChange={e => setCatalogForm({ ...catalogForm, supplier_id: e.target.value })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- Select Supplier (Optional) --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Stock Quantity (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Price (₹ INR, Optional)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={catalogForm.preset_price}
                    onChange={e => setCatalogForm({ ...catalogForm, preset_price: Number(e.target.value) || 0 })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Stock Quantity (In-Stock, Optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={catalogForm.in_stock_qty}
                    onChange={e => setCatalogForm({ ...catalogForm, in_stock_qty: Number(e.target.value) || 0 })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
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
          supplier={suppliers.find(s => s.id === reOrderConfirmData.item.supplier_id)}
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
          suppliers={suppliers}
          categories={categories}
          onClose={() => setEditingComponent(null)}
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

            {/* Product Components List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider">
                  Product Components ({activeDetailFolder.components?.length || 0}):
                </h4>
                {activeDetailFolder.components && activeDetailFolder.components.length > 0 && (
                  <button
                    onClick={() => setRecipeFolder(activeDetailFolder)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit Recipe (+ Add Component)</span>
                  </button>
                )}
              </div>

              {!activeDetailFolder.components || activeDetailFolder.components.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#EEE8D5] border border-dashed border-[#D6D1B1] text-center space-y-3">
                  <p className="text-xs text-[#586E75] font-medium">
                    No raw material components assigned to this product recipe yet.
                  </p>
                  <button
                    onClick={() => setRecipeFolder(activeDetailFolder)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    Configure Product Recipe (+ Add Components)
                  </button>
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
          suppliers={suppliers}
          orders={orders}
          onClose={() => setBatchSendFolder(null)}
          onLogOrders={async (drafts: MultiSupplierPODraft[]) => {
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
          suppliers={suppliers}
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
    </div>
  );
};
