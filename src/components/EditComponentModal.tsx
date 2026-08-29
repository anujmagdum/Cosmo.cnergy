import React, { useState } from 'react';
import { CatalogItem, Supplier, OrderStatus, Category, ComponentSupplier, SupplierMappingInput } from '../types';
import { Edit2, X, Building2, AlertCircle, Sparkles } from 'lucide-react';

interface FormSupplierMapping {
  supplier_id: string;
  rfq_quoted_price: number;
  moq: number;
  lead_time_days: number;
  part_number_vendor: string;
}

interface Props {
  item: CatalogItem;
  suppliers: Supplier[];
  categories?: Category[];
  componentSuppliers?: ComponentSupplier[];
  onClose: () => void;
  onSave: (updatedItem: CatalogItem) => void;
  onSaveSupplierMappings?: (componentId: string, mappings: SupplierMappingInput[]) => void;
}

const DEFAULT_CATEGORIES = [
  'Battery Cells',
  'Electronics / BMS',
  'Connectors & Busbars',
  'Metal Enclosures',
  'Wiring & Harnesses',
  'General Supplier'
];

export const EditComponentModal: React.FC<Props> = ({
  item,
  suppliers,
  categories = [],
  componentSuppliers = [],
  onClose,
  onSave,
  onSaveSupplierMappings
}) => {
  const allCategoryNames = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...categories.map(c => c.name),
      ...(item.category ? [item.category] : [])
    ])
  );

  const initialSupplierMappings: FormSupplierMapping[] = (() => {
    const linked = componentSuppliers.filter(cs => cs.component_id === item.id);
    if (linked.length > 0) {
      return linked.map(cs => ({
        supplier_id: cs.supplier_id,
        rfq_quoted_price: cs.rfq_quoted_price ?? cs.unit_price ?? 0,
        moq: cs.moq ?? 1,
        lead_time_days: cs.lead_time_days ?? 7,
        part_number_vendor: cs.part_number_vendor ?? 'OEM-SPEC'
      }));
    }
    if (item.supplier_mappings && item.supplier_mappings.length > 0) {
      return item.supplier_mappings.map(m => ({
        supplier_id: m.supplier_id,
        rfq_quoted_price: m.rfq_quoted_price ?? m.unit_price ?? 0,
        moq: m.moq ?? 1,
        lead_time_days: m.lead_time_days ?? 7,
        part_number_vendor: m.part_number_vendor ?? 'OEM-SPEC'
      }));
    }
    if (item.supplier_id) {
      return [{
        supplier_id: item.supplier_id,
        rfq_quoted_price: item.preset_price ?? 0,
        moq: item.min_order_qty ?? 1,
        lead_time_days: 7,
        part_number_vendor: 'OEM-SPEC'
      }];
    }
    return [];
  })();

  const [formData, setFormData] = useState({
    name: item.name || '',
    category: item.category || 'Battery Cells',
    preset_price: item.preset_price !== undefined ? item.preset_price : 0,
    in_stock_qty: item.in_stock_qty !== undefined ? item.in_stock_qty : 100,
    min_order_qty: item.min_order_qty || 1,
    uom: item.uom || 'Pcs',
    specs: item.specs || '',
    procurement_status: (item.procurement_status || 'TO_BE_ORDERED') as OrderStatus,
    image_drive_url: item.image_drive_url || ''
  });

  const [selectedSuppliers, setSelectedSuppliers] = useState<FormSupplierMapping[]>(initialSupplierMappings);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const handleAddSupplier = (supplierId: string) => {
    if (!supplierId) return;
    if (selectedSuppliers.some(s => s.supplier_id === supplierId)) return;
    const supp = suppliers.find(s => s.id === supplierId);
    if (!supp) return;
    setSelectedSuppliers(prev => [...prev, {
      supplier_id: supplierId,
      rfq_quoted_price: Number(formData.preset_price) || 0,
      moq: Number(formData.min_order_qty) || 1,
      lead_time_days: 7,
      part_number_vendor: [item.name.slice(0, 4).toUpperCase(), supp.name.slice(0, 3).toUpperCase()].join('-')
    }]);
    setSupplierError(null);
  };

  const handleRemoveSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => prev.filter(s => s.supplier_id !== supplierId));
  };

  const handleUpdateMapping = (supplierId: string, updates: Partial<FormSupplierMapping>) => {
    setSelectedSuppliers(prev =>
      prev.map(s => s.supplier_id === supplierId ? { ...s, ...updates } : s)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (selectedSuppliers.length === 0) {
      setSupplierError('Please associate at least 1 supplier for this component.');
      return;
    }
    const matchedCat = categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
    const updated: CatalogItem = {
      ...item,
      name: formData.name.trim(),
      category: formData.category,
      category_id: matchedCat?.id || item.category_id,
      preset_price: Number(formData.preset_price) || 0,
      in_stock_qty: Number(formData.in_stock_qty) || 0,
      min_order_qty: Number(formData.min_order_qty) || 1,
      uom: formData.uom || 'Pcs',
      specs: formData.specs.trim(),
      supplier_id: selectedSuppliers[0]?.supplier_id || item.supplier_id,
      supplier_ids: selectedSuppliers.map(s => s.supplier_id),
      supplier_mappings: selectedSuppliers.map(s => ({
        supplier_id: s.supplier_id,
        unit_price: s.rfq_quoted_price,
        rfq_quoted_price: s.rfq_quoted_price,
        moq: s.moq,
        lead_time_days: s.lead_time_days,
        part_number_vendor: s.part_number_vendor
      })),
      procurement_status: formData.procurement_status,
      image_drive_url: formData.image_drive_url.trim() || undefined
    };
    if (onSaveSupplierMappings) {
      onSaveSupplierMappings(item.id, selectedSuppliers.map(s => ({
        supplier_id: s.supplier_id,
        unit_price: s.rfq_quoted_price,
        rfq_quoted_price: s.rfq_quoted_price,
        moq: s.moq,
        lead_time_days: s.lead_time_days,
        part_number_vendor: s.part_number_vendor
      })));
    }
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#FDF6E3] w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl border border-[#D6D1B1] shadow-2xl flex flex-col max-h-[90vh] text-[#073642]">
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#073642]">Edit Component Details</h3>
              <p className="text-xs text-[#586E75]">Category: {formData.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3.5 text-xs">

            <div>
              <label className="block font-semibold text-[#073642] mb-1">Component Name *</label>
              <input type="text" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. 3.2V 100Ah LFP Cell"
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-bold">
                  {allCategoryNames.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Unit of Measure (UOM)</label>
                <input type="text" value={formData.uom}
                  onChange={e => setFormData({ ...formData, uom: e.target.value })}
                  placeholder="Pcs, Sets, Kg, etc."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium" />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-[#FDF6E3] rounded-2xl border border-[#D6D1B1] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <label className="block font-bold text-xs text-[#073642] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Associated Sourcing Suppliers *</span>
                  </label>
                  <p className="text-[11px] text-[#586E75] mt-0.5">Manage vendor associations. 2+ vendors enables <strong>Compare Suppliers</strong> AI engine.</p>
                </div>
                {selectedSuppliers.length >= 2 && (
                  <span className="self-start sm:self-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600/15 text-emerald-900 border border-emerald-500/30 text-[10px] font-black">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Comparison Enabled ({selectedSuppliers.length} Vendors)</span>
                  </span>
                )}
              </div>

              <select value="" onChange={e => { if (e.target.value) handleAddSupplier(e.target.value); }}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium cursor-pointer">
                <option value="">+ Click to add a supplier to this component...</option>
                {suppliers.filter(s => !selectedSuppliers.some(sel => sel.supplier_id === s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.contact_person || s.category} {s.rating ? ['(★', s.rating, ')'].join(' ') : ''}</option>
                ))}
              </select>

              {supplierError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{supplierError}</span>
                </div>
              )}

              {selectedSuppliers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedSuppliers.map((s, idx) => {
                    const supp = suppliers.find(sup => sup.id === s.supplier_id);
                    return (
                      <span key={s.supplier_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#073642] border border-[#D6D1B1] text-xs font-bold shadow-xs">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[130px]">{supp?.name || s.supplier_id}</span>
                        {idx === 0 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-semibold">Primary</span>}
                        <button type="button" onClick={() => handleRemoveSupplier(s.supplier_id)} className="p-0.5 rounded-full hover:bg-red-100 text-[#586E75] hover:text-red-700 transition-all cursor-pointer ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No supplier selected yet. Please select at least 1 supplier above.</span>
                </div>
              )}

              {selectedSuppliers.length > 0 && (
                <div className="space-y-2 mt-2 pt-2 border-t border-[#D6D1B1]/60">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#586E75] block">Supplier Commercial Parameters:</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSuppliers.map((s, idx) => {
                      const supp = suppliers.find(sup => sup.id === s.supplier_id);
                      return (
                        <div key={s.supplier_id} className="p-3 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#073642]">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-mono">{idx + 1}</span>
                            <span>{supp?.name}</span>
                            {idx === 0 && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300">Primary</span>}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">RFQ Price (Rs.)</label>
                              <input type="number" min={0} step="0.01" value={s.rfq_quoted_price}
                                onChange={e => handleUpdateMapping(s.supplier_id, { rfq_quoted_price: Number(e.target.value) || 0 })}
                                className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">MOQ</label>
                              <input type="number" min={1} value={s.moq}
                                onChange={e => handleUpdateMapping(s.supplier_id, { moq: Number(e.target.value) || 1 })}
                                className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">Lead Days</label>
                              <input type="number" min={1} value={s.lead_time_days}
                                onChange={e => handleUpdateMapping(s.supplier_id, { lead_time_days: Number(e.target.value) || 1 })}
                                className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#586E75] mb-0.5">Vendor SKU</label>
                              <input type="text" value={s.part_number_vendor}
                                onChange={e => handleUpdateMapping(s.supplier_id, { part_number_vendor: e.target.value })}
                                className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2 py-1 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500" placeholder="OEM-SPEC" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Price (Rs. INR, Optional)</label>
                <input type="number" min={0} step="0.01" value={formData.preset_price}
                  onChange={e => setFormData({ ...formData, preset_price: Number(e.target.value) || 0 })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Stock Quantity (In-Stock)</label>
                <input type="number" min={0} value={formData.in_stock_qty}
                  onChange={e => setFormData({ ...formData, in_stock_qty: Number(e.target.value) || 0 })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#073642] mb-1">Procurement Status</label>
              <select value={formData.procurement_status} onChange={e => setFormData({ ...formData, procurement_status: e.target.value as OrderStatus })}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-bold">
                <option value="TO_BE_ORDERED">To be ordered (Amber)</option>
                <option value="RFQ_SENT">RFQ sent (Blue)</option>
                <option value="ORDERED">Ordered / PO issued (Purple)</option>
                <option value="DELIVERED">Delivered (Emerald Green)</option>
                <option value="ON_HOLD">On Hold (Rose Red)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#073642] mb-1">Google Drive Image Link</label>
              <input type="url" value={formData.image_drive_url}
                onChange={e => setFormData({ ...formData, image_drive_url: e.target.value })}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono text-xs" />
              <p className="text-[11px] text-[#586E75] mt-1 italic">(Ensure link permissions are set to "Anyone with the link can view")</p>
            </div>

            <div>
              <label className="block font-semibold text-[#073642] mb-1">Technical Specification (Optional)</label>
              <textarea rows={2} value={formData.specs} onChange={e => setFormData({ ...formData, specs: e.target.value })}
                placeholder="Technical specs, grade, pinout, voltage..."
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500" />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#D6D1B1]/60 shrink-0 bg-[#FDF6E3] sm:rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Update Component</button>
          </div>
        </form>
      </div>
    </div>
  );
};
