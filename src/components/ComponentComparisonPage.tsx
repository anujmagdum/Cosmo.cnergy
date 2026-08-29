import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  Package,
  Layers,
  Clock,
  DollarSign,
  Info,
  ShieldCheck,
  ExternalLink,
  Plus
} from 'lucide-react';
import { CatalogItem, Company, ComponentCompany } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  catalog: CatalogItem[];
  companies: Company[];
  componentCompanies: ComponentCompany[];
  onUpdateComponentCompany?: (
    linkId: string,
    field: 'rfq_quoted_price' | 'moq' | 'lead_time_days' | 'unit_price',
    value: number
  ) => void;
}

type SortField = 'rfq_quoted_price' | 'moq' | 'lead_time_days';
type SortOrder = 'asc' | 'desc' | null;

interface EditableCellState {
  linkId: string;
  field: 'rfq_quoted_price' | 'moq' | 'lead_time_days';
}

export const ComponentComparisonPage: React.FC<Props> = ({
  catalog,
  companies,
  componentCompanies,
  onUpdateComponentCompany
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Active sorting states: Click 1 -> asc, Click 2 -> desc, Click 3 -> reset (null). Changing column resets previous.
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Inline editing state: which cell is currently active as an input
  const [editingCell, setEditingCell] = useState<EditableCellState | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');
  const [lastSavedCell, setLastSavedCell] = useState<string | null>(null);

  // Find component
  const component = useMemo(() => {
    return catalog.find(c => c.id === id) || null;
  }, [catalog, id]);

  // Gather all linked companies (from componentCompanies relation table + fallback to catalog item mappings)
  const [linkedCompanies, setLinkedCompanies] = useState<
    (ComponentCompany & { company: Company })[]
  >([]);

  useEffect(() => {
    if (!component) return;

    // 1. Direct links from componentCompanies
    const directLinks = componentCompanies
      .filter(cc => cc.component_id === component.id)
      .map(cc => {
        const comp = companies.find(c => c.id === cc.company_id);
        return {
          ...cc,
          company: comp || {
            id: cc.company_id,
            name: 'Associated Company',
            contact_person: 'Sales Team',
            email: 'sales@vendor.com',
            phone: ''
          }
        };
      });

    // 2. Synthesize links for any companies linked via catalog item directly if not in componentCompanies
    const existingIds = new Set(directLinks.map(l => l.company_id));

    if (component.company_id && !existingIds.has(component.company_id)) {
      const comp = companies.find(c => c.id === component.company_id);
      if (comp) {
        directLinks.push({
          id: `synth-${component.id}-${comp.id}`,
          component_id: component.id,
          company_id: comp.id,
          unit_price: component.preset_price || 0,
          rfq_quoted_price: component.preset_price || 0,
          moq: component.min_order_qty || 1,
          lead_time_days: 7,
          external_rating: comp.rating || 4.8,
          created_at: new Date().toISOString(),
          company: comp
        });
        existingIds.add(comp.id);
      }
    }

    if (Array.isArray(component.company_ids)) {
      for (const cId of component.company_ids) {
        if (!existingIds.has(cId)) {
          const comp = companies.find(c => c.id === cId);
          if (comp) {
            directLinks.push({
              id: `synth-${component.id}-${comp.id}`,
              component_id: component.id,
              company_id: comp.id,
              unit_price: component.preset_price || 0,
              rfq_quoted_price: component.preset_price || 0,
              moq: component.min_order_qty || 1,
              lead_time_days: 7,
              external_rating: comp.rating || 4.7,
              created_at: new Date().toISOString(),
              company: comp
            });
            existingIds.add(comp.id);
          }
        }
      }
    }

    setLinkedCompanies(directLinks);
  }, [component, componentCompanies, companies]);

  // Interactive Sorting Logic
  const handleSortToggle = (field: SortField) => {
    if (sortField !== field) {
      // Click on a new column: resets previous sort column and activates Ascending
      setSortField(field);
      setSortOrder('asc');
    } else {
      // Toggle current column: asc -> desc -> reset (null)
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Sorted list of companies
  const sortedCompanies = useMemo(() => {
    if (!sortField || !sortOrder) {
      return linkedCompanies;
    }

    return [...linkedCompanies].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'rfq_quoted_price') {
        valA = Number(a.rfq_quoted_price ?? a.unit_price) || 0;
        valB = Number(b.rfq_quoted_price ?? b.unit_price) || 0;
      } else if (sortField === 'moq') {
        valA = Number(a.moq) || 0;
        valB = Number(b.moq) || 0;
      } else if (sortField === 'lead_time_days') {
        valA = Number(a.lead_time_days) || 0;
        valB = Number(b.lead_time_days) || 0;
      }

      if (sortOrder === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });
  }, [linkedCompanies, sortField, sortOrder]);

  // Inline Editing Handlers
  const startEditing = (
    linkId: string,
    field: 'rfq_quoted_price' | 'moq' | 'lead_time_days',
    currentVal: number
  ) => {
    setEditingCell({ linkId, field });
    setCellInputValue(String(currentVal ?? ''));
  };

  const commitEditing = async (
    linkId: string,
    field: 'rfq_quoted_price' | 'moq' | 'lead_time_days'
  ) => {
    if (!editingCell || editingCell.linkId !== linkId || editingCell.field !== field) {
      return;
    }

    const numValue = Math.max(0, parseFloat(cellInputValue) || 0);

    // 1. Optimistic local state update
    setLinkedCompanies(prev =>
      prev.map(item => {
        if (item.id === linkId) {
          return {
            ...item,
            [field]: numValue,
            ...(field === 'rfq_quoted_price' ? { unit_price: numValue } : {})
          };
        }
        return item;
      })
    );

    // 2. Global state & LocalStorage update callback
    if (onUpdateComponentCompany) {
      onUpdateComponentCompany(linkId, field, numValue);
    }

    // 3. Flash saved feedback
    const cellKey = `${linkId}-${field}`;
    setLastSavedCell(cellKey);
    setTimeout(() => setLastSavedCell(null), 2000);

    // 4. Close input mode
    setEditingCell(null);

    // 5. Fire PATCH request to backend Supabase
    if (!linkId.startsWith('synth-')) {
      try {
        const updatePayload: Record<string, any> = {
          [field]: numValue,
          updated_at: new Date().toISOString()
        };
        if (field === 'rfq_quoted_price') {
          updatePayload.unit_price = numValue;
        }

        await supabase
          .from('component_companies')
          .update(updatePayload)
          .eq('id', linkId);
      } catch (err) {
        console.warn('Backend patch warning:', err);
      }
    }
  };

  if (!component) {
    return (
      <div className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl p-12 text-center text-[#073642]">
        <Package className="w-12 h-12 mx-auto text-[#839496] mb-3" />
        <h3 className="text-xl font-bold text-[#073642]">Component Not Found</h3>
        <p className="text-xs text-[#586E75] mt-1 mb-6">
          The requested component ID does not exist or may have been deleted.
        </p>
        <button
          onClick={() => navigate('/inventory')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Inventory</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDF6E3] hover:bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] font-bold text-xs transition-all shadow-2xs cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-[#586E75] group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Inventory</span>
          </button>

          <span className="text-xs text-[#839496]">/</span>
          <span className="text-xs font-mono font-semibold text-[#586E75]">
            {component.sku || 'SKU-ITEM'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-600/10 text-emerald-900 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{linkedCompanies.length} Linked {linkedCompanies.length === 1 ? 'Company' : 'Companies'}</span>
          </span>
        </div>
      </div>

      {/* Component Header Summary Card */}
      <div className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
              <Package className="w-6 h-6 text-emerald-700" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-[#073642] tracking-tight">
                  {component.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {component.category || 'General'}
                </span>
              </div>

              <p className="text-xs text-[#586E75] mt-1 font-medium">
                {component.specs || 'Standard industrial spec specifications'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#D6D1B1]/60 pt-3 md:pt-0 md:pl-6 shrink-0 text-xs">
            <div>
              <span className="text-[10px] text-[#586E75] uppercase font-bold block">In-Stock</span>
              <span className="text-sm font-extrabold text-[#073642] font-mono">
                {component.in_stock_qty ?? 0} {component.uom || 'Pcs'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#586E75] uppercase font-bold block">Default Rate</span>
              <span className="text-sm font-extrabold text-emerald-800 font-mono">
                ₹{Number(component.preset_price || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Company Comparison Table Container */}
      <div className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar Header */}
        <div className="px-5 py-4 border-b border-[#D6D1B1]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EEE8D5]/60">
          <div>
            <h2 className="text-sm font-extrabold text-[#073642] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Company Quotation & Commercial Parameters</span>
            </h2>
            <p className="text-[11px] text-[#586E75] mt-0.5">
              Click column headers to sort. Click any metric cell to edit inline (press Enter or click away to save).
            </p>
          </div>

          {/* Active sort indicator badge */}
          {sortField && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                <span>
                  Sorted by{' '}
                  {sortField === 'rfq_quoted_price'
                    ? 'RFQ Price'
                    : sortField === 'moq'
                    ? 'MOQ'
                    : 'Lead Time'}{' '}
                  ({sortOrder === 'asc' ? 'Lowest First' : 'Highest First'})
                </span>
                <button
                  onClick={() => {
                    setSortField(null);
                    setSortOrder(null);
                  }}
                  className="hover:text-red-200 ml-1 font-black cursor-pointer"
                  title="Reset Sort"
                >
                  ✕
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D6D1B1] bg-[#EEE8D5] text-[#586E75] uppercase text-[10px] font-extrabold tracking-wider select-none">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-5 min-w-[200px]">Company Name</th>

                {/* Clickable Header 1: RFQ Price */}
                <th
                  onClick={() => handleSortToggle('rfq_quoted_price')}
                  className={`py-3.5 px-5 cursor-pointer transition-colors ${
                    sortField === 'rfq_quoted_price'
                      ? 'bg-emerald-600/15 text-emerald-950 font-black'
                      : 'hover:bg-[#E4DDC7] text-[#073642]'
                  }`}
                  title="Click to toggle: Ascending (Lowest price) -> Descending (Highest price) -> Reset"
                >
                  <div className="flex items-center gap-1.5">
                    <span>RFQ Price (₹)</span>
                    {sortField === 'rfq_quoted_price' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#839496] opacity-70" />
                    )}
                  </div>
                </th>

                {/* Clickable Header 2: MOQ */}
                <th
                  onClick={() => handleSortToggle('moq')}
                  className={`py-3.5 px-5 cursor-pointer transition-colors ${
                    sortField === 'moq'
                      ? 'bg-emerald-600/15 text-emerald-950 font-black'
                      : 'hover:bg-[#E4DDC7] text-[#073642]'
                  }`}
                  title="Click to toggle: Ascending (Lowest MOQ) -> Descending (Highest MOQ) -> Reset"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MOQ (Units)</span>
                    {sortField === 'moq' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#839496] opacity-70" />
                    )}
                  </div>
                </th>

                {/* Clickable Header 3: Lead Time */}
                <th
                  onClick={() => handleSortToggle('lead_time_days')}
                  className={`py-3.5 px-5 cursor-pointer transition-colors ${
                    sortField === 'lead_time_days'
                      ? 'bg-emerald-600/15 text-emerald-950 font-black'
                      : 'hover:bg-[#E4DDC7] text-[#073642]'
                  }`}
                  title="Click to toggle: Ascending (Shortest lead time) -> Descending (Longest lead time) -> Reset"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lead Time (Days)</span>
                    {sortField === 'lead_time_days' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#839496] opacity-70" />
                    )}
                  </div>
                </th>

                {/* Remark Header (Exempt from sorting) */}
                <th className="py-3.5 px-5 min-w-[220px]">
                  <span>Remark</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D6D1B1]/60">
              {sortedCompanies.map((link, idx) => {
                const isEditingPrice =
                  editingCell?.linkId === link.id && editingCell?.field === 'rfq_quoted_price';
                const isEditingMOQ =
                  editingCell?.linkId === link.id && editingCell?.field === 'moq';
                const isEditingLeadTime =
                  editingCell?.linkId === link.id && editingCell?.field === 'lead_time_days';

                const priceVal = Number(link.rfq_quoted_price ?? link.unit_price) || 0;
                const moqVal = Number(link.moq) || 1;
                const leadTimeVal = Number(link.lead_time_days) || 7;

                return (
                  <tr
                    key={link.id}
                    className="hover:bg-[#EEE8D5]/50 transition-colors group"
                  >
                    {/* Numbering: Sequential index 1, 2, 3... */}
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#586E75]">
                      <span className="w-6 h-6 rounded-full bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] inline-flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Company Name & Rating */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-sm text-[#073642]">
                          {link.company.name}
                        </div>
                        {idx === 0 && !sortField && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#586E75] flex items-center gap-2 mt-0.5">
                        <span>{link.company.contact_person || 'Sales Contact'}</span>
                        {link.company.rating && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">★ {link.company.rating}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Column 1: RFQ Price (Inline Editable) */}
                    <td className="py-4 px-5">
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            autoFocus
                            value={cellInputValue}
                            onChange={e => setCellInputValue(e.target.value)}
                            onBlur={() => commitEditing(link.id, 'rfq_quoted_price')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitEditing(link.id, 'rfq_quoted_price');
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-28 bg-white border-2 border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none shadow-sm"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(link.id, 'rfq_quoted_price', priceVal)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono font-extrabold cursor-pointer transition-all ${
                            lastSavedCell === `${link.id}-rfq_quoted_price`
                              ? 'bg-emerald-200 border-emerald-500 text-emerald-950 scale-105'
                              : 'bg-[#EEE8D5]/70 hover:bg-white border-[#D6D1B1] hover:border-emerald-500 text-emerald-900 shadow-2xs'
                          }`}
                          title="Click to edit RFQ Price inline"
                        >
                          <span>₹{priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          {lastSavedCell === `${link.id}-rfq_quoted_price` && (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 2: MOQ (Inline Editable) */}
                    <td className="py-4 px-5">
                      {isEditingMOQ ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            autoFocus
                            value={cellInputValue}
                            onChange={e => setCellInputValue(e.target.value)}
                            onBlur={() => commitEditing(link.id, 'moq')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitEditing(link.id, 'moq');
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-24 bg-white border-2 border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none shadow-sm"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(link.id, 'moq', moqVal)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono font-bold cursor-pointer transition-all ${
                            lastSavedCell === `${link.id}-moq`
                              ? 'bg-emerald-200 border-emerald-500 text-emerald-950 scale-105'
                              : 'bg-[#EEE8D5]/70 hover:bg-white border-[#D6D1B1] hover:border-emerald-500 text-[#073642] shadow-2xs'
                          }`}
                          title="Click to edit MOQ inline"
                        >
                          <span>{moqVal}</span>
                          <span className="text-[10px] text-[#586E75]">{component.uom || 'Pcs'}</span>
                          {lastSavedCell === `${link.id}-moq` && (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 3: Lead Time (Inline Editable) */}
                    <td className="py-4 px-5">
                      {isEditingLeadTime ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            autoFocus
                            value={cellInputValue}
                            onChange={e => setCellInputValue(e.target.value)}
                            onBlur={() => commitEditing(link.id, 'lead_time_days')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitEditing(link.id, 'lead_time_days');
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-24 bg-white border-2 border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#073642] focus:outline-none shadow-sm"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(link.id, 'lead_time_days', leadTimeVal)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono font-bold cursor-pointer transition-all ${
                            lastSavedCell === `${link.id}-lead_time_days`
                              ? 'bg-emerald-200 border-emerald-500 text-emerald-950 scale-105'
                              : 'bg-[#EEE8D5]/70 hover:bg-white border-[#D6D1B1] hover:border-emerald-500 text-[#073642] shadow-2xs'
                          }`}
                          title="Click to edit Lead Time inline"
                        >
                          <Clock className="w-3 h-3 text-[#586E75]" />
                          <span>{leadTimeVal} Days</span>
                          {lastSavedCell === `${link.id}-lead_time_days` && (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 4: Remark Display (Visual Badge or Text Block) */}
                    <td className="py-4 px-5">
                      {link.company.remark ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 border border-amber-500/30">
                          {link.company.remark}
                        </span>
                      ) : (
                        <span className="text-[#839496] italic text-xs">
                          Standard commercial terms
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedCompanies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-[#586E75]">
                    <Building2 className="w-10 h-10 mx-auto text-[#839496] mb-2 opacity-50" />
                    <p className="text-sm font-bold text-[#073642]">No Companies Linked Yet</p>
                    <p className="text-xs text-[#586E75] mt-1">
                      Edit this component in Inventory to associate sourcing companies and compare quotations.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 border-t border-[#D6D1B1]/60 bg-[#EEE8D5]/40 text-[11px] text-[#586E75] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-700" />
            <span>Changes made via inline inputs are auto-saved directly to the database.</span>
          </div>
          <span className="font-mono text-[10px]">
            {sortedCompanies.length} records displayed
          </span>
        </div>
      </div>
    </div>
  );
};
