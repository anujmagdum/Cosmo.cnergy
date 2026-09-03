import React, { useState, useEffect, useMemo } from 'react';
import { CatalogItem, ProductFolder, Company, ProductBOM, SearchResultItem, SearchResultCompany, determineOrderType, formatProcurementSubject, NavigationTab } from '../types';
import { executeUniversalSearch, SearchResultSet } from '../services/searchService';
import { Search, X, Package, Folder, Truck, ExternalLink, Mail, MessageSquare, ChevronDown, ChevronUp, Sparkles, Building2, Send, CheckCircle2, ArrowRight } from 'lucide-react';

import { ProcurementOrder } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  folders: ProductFolder[];
  companies: Company[];
  boms: ProductBOM[];
  orders?: ProcurementOrder[];
  onNavigateTab: (tab: NavigationTab) => void;
  onDraftPO?: (company: Company, item: CatalogItem, qty?: number) => void;
  onOpenWhatsApp?: (company: Company, context?: string) => void;
  onOpenWebmail?: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onOpenFolder?: (folder: ProductFolder) => void;
}

export const GlobalSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  catalog,
  folders,
  companies,
  boms,
  orders = [],
  onNavigateTab,
  onDraftPO,
  onOpenWhatsApp,
  onOpenWebmail,
  onOpenFolder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedComponentIds, setExpandedComponentIds] = useState<Record<string, boolean>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'COMPONENTS' | 'FOLDERS' | 'SUPPLIERS' | 'ORDERS'>('ALL');

  // Keystroke debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Execute universal search
  const results: SearchResultSet = useMemo(() => {
    return executeUniversalSearch(debouncedQuery, catalog, folders, companies, boms, orders);
  }, [debouncedQuery, catalog, folders, companies, boms, orders]);

  // Auto-expand components when there are 3 or fewer results
  useEffect(() => {
    if (results.components.length > 0 && results.components.length <= 3) {
      const map: Record<string, boolean> = {};
      results.components.forEach(c => {
        map[c.id] = true;
      });
      setExpandedComponentIds(map);
    }
  }, [results.components]);

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleComponentExpand = (id: string) => {
    setExpandedComponentIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleQuickDraftPO = (companyData: SearchResultCompany, itemResult: SearchResultItem) => {
    const matchedCompany = companies.find(s => s.id === companyData.companyId) || {
      id: companyData.companyId,
      name: companyData.companyName,
      email: companyData.email || 'sales@vendor.com',
      phone: companyData.phone || '+91 98765 43210',
      whatsapp: companyData.whatsapp || '919876543210',
      contact_person: companyData.contactPerson || 'Sales Dept'
    };

    const targetCatalogItem = catalog.find(c => c.id === itemResult.id) || {
      id: itemResult.id,
      sku: itemResult.metadata?.sku || 'SKU-GENERIC',
      name: itemResult.title,
      specs: itemResult.metadata?.specs || 'Standard',
      uom: itemResult.metadata?.uom || 'Pcs',
      preset_price: companyData.unitPrice || itemResult.metadata?.presetPrice || 100,
      company_id: companyData.companyId
    };

    if (onDraftPO) {
      onDraftPO(matchedCompany, targetCatalogItem, 20);
    } else if (onOpenWebmail) {
      const orderType = determineOrderType('CATALOG_BOM');
      const subject = formatProcurementSubject(orderType, targetCatalogItem.name);
      const body = `Dear ${matchedCompany.contact_person || matchedCompany.name},\n\nPlease accept our Purchase Order (PO) inquiry for:\n\n• Item: ${targetCatalogItem.name} (${targetCatalogItem.specs})\n• Required Quantity: 20 ${targetCatalogItem.uom}\n• Quoted Unit Price: ₹${companyData.unitPrice || targetCatalogItem.preset_price}\n\nPlease confirm dispatch timeline.\n\nBest regards,\nProcurement Team\nCosmo Cnergy`;
      onOpenWebmail(matchedCompany, subject, body, 20 * (companyData.unitPrice || Number(targetCatalogItem.preset_price) || 100), 'CATALOG_BOM', 'ORDERED');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto pt-3 sm:pt-14">
      <div className="bg-[#FDF6E3] w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-[#D6D1B1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#073642] flex flex-col max-h-[94vh]">
        {/* Top Search Input Bar */}
        <div className="p-5 border-b border-[#D6D1B1]/60 bg-[#0B192C] text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Master Data Search: components, SKUs, MPN, companies, folders, orders & invoices..."
              className="w-full bg-[#12243d] border border-slate-700 text-white placeholder-slate-400 rounded-2xl px-4 py-2.5 text-sm md:text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Filter Pills Bar */}
        <div className="px-6 py-3 bg-[#EEE8D5] border-b border-[#D6D1B1] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#E4DDC7] border border-[#D6D1B1]'
              }`}
            >
              All Results ({results.totalCount})
            </button>

            <button
              onClick={() => setActiveCategoryFilter('COMPONENTS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeCategoryFilter === 'COMPONENTS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#E4DDC7] border border-[#D6D1B1]'
              }`}
            >
              Components ({results.components.length})
            </button>

            <button
              onClick={() => setActiveCategoryFilter('FOLDERS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeCategoryFilter === 'FOLDERS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#E4DDC7] border border-[#D6D1B1]'
              }`}
            >
              Product Folders ({results.folders.length})
            </button>

            <button
              onClick={() => setActiveCategoryFilter('SUPPLIERS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeCategoryFilter === 'SUPPLIERS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#E4DDC7] border border-[#D6D1B1]'
              }`}
            >
              Companies ({results.companies.length})
            </button>
          </div>

          <span className="text-[11px] text-[#586E75] font-semibold hidden sm:inline">
            300ms Real-time Cross-Entity Search
          </span>
        </div>

        {/* Results Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {!debouncedQuery ? (
            <div className="py-12 text-center space-y-3 text-[#586E75]">
              <Sparkles className="w-10 h-10 text-emerald-600 mx-auto opacity-80" />
              <p className="text-sm font-semibold text-[#073642]">
                Type any component name, part number, SKU, product folder, or company name.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
                <span className="text-[#586E75]">Try searching:</span>
                {['3.2V LFP', 'Smart BMS', 'Copper Busbar', '51.2V', 'CellTech'].map(sample => (
                  <button
                    key={sample}
                    onClick={() => setSearchTerm(sample)}
                    className="px-2.5 py-1 rounded-lg bg-[#EEE8D5] hover:bg-emerald-100 text-[#073642] hover:text-emerald-800 border border-[#D6D1B1] font-mono text-xs font-bold transition-all"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          ) : results.totalCount === 0 ? (
            <div className="py-12 text-center space-y-2 text-[#586E75]">
              <Package className="w-10 h-10 text-[#93A1A1] mx-auto" />
              <h4 className="font-bold text-[#073642]">No results found for "{debouncedQuery}"</h4>
              <p className="text-xs text-[#586E75]">
                Check for typos or try searching a broader term like "Cell", "BMS", or "Pack".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SUBSECTION 1: COMPONENTS & RELATIONAL SUPPLIERS */}
              {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'COMPONENTS') &&
                results.components.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#586E75] uppercase tracking-wider">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>Components & Raw Materials ({results.components.length})</span>
                    </div>

                    <div className="space-y-3">
                      {results.components.map(item => {
                        const isExpanded = expandedComponentIds[item.id];
                        const companiesList = item.metadata?.companies || [];

                        return (
                          <div
                            key={item.id}
                            className="bg-[#EEE8D5] rounded-2xl border border-[#D6D1B1] shadow-sm overflow-hidden hover:border-emerald-500 transition-all"
                          >
                            {/* Component Summary Card */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EEE8D5]">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-[#073642] text-sm">{item.title}</h4>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    {item.metadata?.sku}
                                  </span>
                                </div>
                                <p className="text-xs text-[#586E75]">{item.metadata?.specs}</p>
                                <div className="flex items-center gap-3 text-xs text-[#586E75] pt-1">
                                  <span>
                                    Preset Price: <strong className="text-emerald-800 font-mono">₹{item.metadata?.presetPrice?.toLocaleString('en-IN')}</strong> / {item.metadata?.uom}
                                  </span>
                                  <span>•</span>
                                  <span>Stock: <strong className="text-[#073642] font-mono">{item.metadata?.inStockQty || 0}</strong> {item.metadata?.uom}</span>
                                </div>
                              </div>

                              {/* Multi-Vendor Indicator & Expand Button */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleComponentExpand(item.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF6E3] hover:bg-emerald-50 text-emerald-800 border border-[#D6D1B1] text-xs font-bold transition-all"
                                >
                                  <span>{companiesList.length} Associated Company(s)</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  onClick={() => {
                                    onNavigateTab('inventory');
                                    onClose();
                                  }}
                                  className="p-2 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] text-xs transition-all border border-[#D6D1B1]"
                                  title="View in Inventory"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* RELATIONAL EXPANSION: Associated Companies List */}
                            {isExpanded && (
                              <div className="p-4 bg-[#FDF6E3] border-t border-[#D6D1B1] space-y-2.5">
                                <span className="text-[11px] font-bold text-[#586E75] uppercase tracking-wider block">
                                  Supplying Vendors for {item.title}:
                                </span>

                                <div className="grid grid-cols-1 gap-2">
                                  {companiesList.map(supp => (
                                    <div
                                      key={supp.companyId}
                                      className="p-3 bg-[#EEE8D5] rounded-xl border border-[#D6D1B1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-xs transition-all"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="font-bold text-xs text-[#073642]">{supp.companyName}</span>
                                          {supp.isPrimary && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                              Primary Vendor
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-[#586E75]">
                                          Rate: <strong className="text-emerald-800 font-mono">₹{supp.unitPrice?.toLocaleString('en-IN')}</strong> • Lead Time: {supp.leadTime} • Contact: {supp.contactPerson || supp.email}
                                        </div>
                                      </div>

                                      {/* Quick Actions */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleQuickDraftPO(supp, item)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                                        >
                                          <Mail className="w-3 h-3" />
                                          <span>Draft PO</span>
                                        </button>

                                        {supp.whatsapp && (
                                          <button
                                            onClick={() => {
                                              const cleanPhone = supp.whatsapp?.replace(/[^0-9]/g, '');
                                              const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(`Hi ${supp.companyName}, request for quote for ${item.title} (${item.metadata?.sku}).`)}`;
                                              window.open(waUrl, '_blank');
                                            }}
                                            className="p-1.5 rounded-lg bg-[#FDF6E3] hover:bg-[#E4DDC7] text-emerald-800 border border-[#D6D1B1] text-xs transition-all"
                                            title="WhatsApp Company"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* SUBSECTION 2: PRODUCT FOLDERS */}
              {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'FOLDERS') &&
                results.folders.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#586E75] uppercase tracking-wider">
                      <Folder className="w-4 h-4 text-emerald-600" />
                      <span>Product Folders & BOMs ({results.folders.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.folders.map(folder => (
                        <div
                          key={folder.id}
                          className="p-4 bg-[#EEE8D5] rounded-2xl border border-[#D6D1B1] hover:border-emerald-500 shadow-sm space-y-2.5 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-[#073642] text-sm">{folder.title}</h4>
                              <p className="text-xs text-[#586E75]">{folder.subtitle}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF6E3] text-[#073642] border border-[#D6D1B1]">
                              {folder.metadata?.folderComponentsCount || 0} Components
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#D6D1B1]/60 text-xs">
                            <span className="text-[#586E75]">
                              Linked POs: <strong>{folder.metadata?.linkedPosCount || 0}</strong>
                            </span>

                            <button
                              onClick={() => {
                                onNavigateTab('inventory');
                                onClose();
                              }}
                              className="flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900"
                            >
                              <span>Open Folder</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                            {/* SUBSECTION 4: ORDERS & INVOICES */}
              {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'ORDERS') &&
                (results.orders || []).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#586E75] uppercase tracking-wider">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Procurement Orders & Invoices ({results.orders.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.orders.map(orderItem => (
                        <div
                          key={orderItem.id}
                          className="p-4 bg-[#EEE8D5] rounded-2xl border border-[#D6D1B1] hover:border-emerald-500 shadow-sm space-y-2 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-[#073642] text-sm font-mono">{orderItem.title}</h4>
                              <p className="text-xs text-[#586E75]">{orderItem.subtitle}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {orderItem.metadata?.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#D6D1B1]/60 text-xs">
                            <span className="text-emerald-800 font-bold font-mono">
                              ₹{Number(orderItem.metadata?.totalAmount || 0).toLocaleString('en-IN')}
                            </span>

                            <button
                              onClick={() => {
                                onNavigateTab('procurement');
                                onClose();
                              }}
                              className="flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900 cursor-pointer"
                            >
                              <span>View in Procurement</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* SUBSECTION 3: SUPPLIERS & VENDORS */}
              {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'SUPPLIERS') &&
                results.companies.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#586E75] uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Companies & Partners ({results.companies.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.companies.map(supp => (
                        <div
                          key={supp.id}
                          className="p-4 bg-[#EEE8D5] rounded-2xl border border-[#D6D1B1] hover:border-emerald-500 shadow-sm space-y-2 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-[#073642] text-sm">{supp.title}</h4>
                              <p className="text-xs text-[#586E75]">{supp.subtitle}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ★ {supp.metadata?.rating || 4.8}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#D6D1B1]/60 text-xs">
                            <span className="text-[#586E75] truncate max-w-[150px]">
                              {supp.metadata?.phone || supp.metadata?.email}
                            </span>

                            <button
                              onClick={() => {
                                onNavigateTab('companies');
                                onClose();
                              }}
                              className="flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900"
                            >
                              <span>View Company</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#EEE8D5] border-t border-[#D6D1B1] flex items-center justify-between text-xs text-[#586E75]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FDF6E3] text-[#073642] font-mono font-bold text-[10px] border border-[#D6D1B1]">
              Ctrl+K
            </span>
            <span>Universal cross-entity search with company expansion</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] font-semibold transition-all border border-[#D6D1B1]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
