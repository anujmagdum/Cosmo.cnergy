import React, { useState } from 'react';
import { CatalogItem, Supplier, OrderStatus, Category } from '../types';
import { Edit2, X, Package, Check } from 'lucide-react';

interface Props {
  item: CatalogItem;
  suppliers: Supplier[];
  categories?: Category[];
  onClose: () => void;
  onSave: (updatedItem: CatalogItem) => void;
}

const DEFAULT_CATEGORIES = [
  'Battery Cells',
  'Electronics / BMS',
  'Connectors & Busbars',
  'Metal Enclosures',
  'Wiring & Harnesses',
  'General Supplier'
];

export const EditComponentModal: React.FC<Props> = ({ item, suppliers, categories = [], onClose, onSave }) => {
  const allCategoryNames = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...categories.map(c => c.name),
      ...(item.category ? [item.category] : [])
    ])
  );

  const [formData, setFormData] = useState({
    name: item.name || '',
    category: item.category || 'Battery Cells',
    preset_price: item.preset_price !== undefined ? item.preset_price : 0,
    in_stock_qty: item.in_stock_qty !== undefined ? item.in_stock_qty : 100,
    min_order_qty: item.min_order_qty || 1,
    uom: item.uom || 'Pcs',
    specs: item.specs || '',
    supplier_id: item.supplier_id || (suppliers[0]?.id || ''),
    procurement_status: (item.procurement_status || 'TO_BE_ORDERED') as OrderStatus
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

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
      supplier_id: formData.supplier_id,
      procurement_status: formData.procurement_status
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center font-bold">
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Component Name (ONLY REQUIRED FIELD) */}
          <div>
            <label className="block font-semibold text-[#073642] mb-1">Component Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 3.2V 100Ah LFP Cell"
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Category & Unit of Measure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#073642] mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
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
                value={formData.uom}
                onChange={e => setFormData({ ...formData, uom: e.target.value })}
                placeholder="Pcs, Sets, Kg, etc."
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Supplier Company */}
          <div>
            <label className="block font-semibold text-[#073642] mb-1">Supplier Company</label>
            <select
              value={formData.supplier_id}
              onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
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
                value={formData.preset_price}
                onChange={e => setFormData({ ...formData, preset_price: Number(e.target.value) || 0 })}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#073642] mb-1">Stock Quantity (In-Stock, Optional)</label>
              <input
                type="number"
                min={0}
                value={formData.in_stock_qty}
                onChange={e => setFormData({ ...formData, in_stock_qty: Number(e.target.value) || 0 })}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Procurement Status */}
          <div>
            <label className="block font-semibold text-[#073642] mb-1">Procurement Status</label>
            <select
              value={formData.procurement_status}
              onChange={e => setFormData({ ...formData, procurement_status: e.target.value as OrderStatus })}
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-bold"
            >
              <option value="TO_BE_ORDERED">🟡 To be ordered (Amber)</option>
              <option value="RFQ_SENT">🔵 RFQ sent (Blue)</option>
              <option value="ORDERED">🟣 Ordered / PO issued (Purple)</option>
              <option value="DELIVERED">🟢 Delivered (Emerald Green)</option>
              <option value="ON_HOLD">🔴 On Hold (Rose Red)</option>
            </select>
          </div>

          {/* Technical Specs */}
          <div>
            <label className="block font-semibold text-[#073642] mb-1">Technical Specification (Optional)</label>
            <textarea
              rows={2}
              value={formData.specs}
              onChange={e => setFormData({ ...formData, specs: e.target.value })}
              placeholder="Technical specs, grade, pinout, voltage..."
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Update Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
