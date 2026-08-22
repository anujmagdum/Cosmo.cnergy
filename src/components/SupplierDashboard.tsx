import React, { useState, useMemo } from 'react';
import { Supplier, CatalogItem, Category } from '../types';
import { CsvManagerWidget } from './CsvManagerWidget';
import { Plus, Phone, Building2, MapPin, Search, Edit2, CheckCircle2, Shield, Mail, Trash2, AlertCircle } from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  catalog: CatalogItem[];
  categories?: Category[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<any> | void;
  onUpdateSupplier?: (supplier: Supplier) => Promise<any> | void;
  onDeleteSupplier?: (supplierId: string) => Promise<void> | void;
  onImportSuppliers?: (rows: any[]) => Promise<number | void> | number | void;
}

const DEFAULT_CATEGORIES = [
  'Battery Cells',
  'Electronics / BMS',
  'Connectors & Busbars',
  'Metal Enclosures',
  'Wiring & Harnesses',
  'General Supplier'
];

export const SupplierDashboard: React.FC<Props> = ({
  suppliers,
  catalog,
  categories = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onImportSuppliers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    whatsapp: '',
    buying_url: '',
    address: '',
    gstin: '',
    payment_terms: 'Net 30 Days',
    category: 'Battery Cells'
  });

  const allCategoryNames = useMemo(() => {
    return Array.from(
      new Set([
        'ALL',
        ...DEFAULT_CATEGORIES,
        ...categories.map(c => c.name),
        ...suppliers.map(s => s.category).filter(Boolean)
      ])
    );
  }, [categories, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const activeCat = selectedCategory.toLowerCase().trim();

    return suppliers.filter(s => {
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.contact_person.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term));

      let matchesCategory = activeCat === 'all';
      if (!matchesCategory) {
        const suppCat = (s.category || '').toLowerCase().trim();
        const relationalCatName = s.category_id
          ? (categories.find(cat => cat.id === s.category_id)?.name || '').toLowerCase().trim()
          : '';
        matchesCategory = suppCat === activeCat || relationalCatName === activeCat;
      }

      return matchesSearch && matchesCategory;
    });
  }, [suppliers, searchTerm, selectedCategory, categories]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const matchedCat = categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());

    try {
      await onAddSupplier({
        ...formData,
        category_id: matchedCat?.id
      });

      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        whatsapp: '',
        buying_url: '',
        address: '',
        gstin: '',
        payment_terms: 'Net 30 Days',
        category: 'Battery Cells'
      });
      setIsAddModalOpen(false);
      setToastFeedback({ type: 'success', message: `Supplier "${formData.name}" added successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to add supplier:', err);
      setToastFeedback({ type: 'error', message: `Failed to add supplier: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    const matchedCat = categories.find(c => c.name.toLowerCase() === (editingSupplier.category || '').toLowerCase());

    try {
      if (onUpdateSupplier) {
        await onUpdateSupplier({
          ...editingSupplier,
          category_id: matchedCat?.id || editingSupplier.category_id
        });
      }
      setEditingSupplier(null);
      setToastFeedback({ type: 'success', message: `Supplier "${editingSupplier.name}" updated successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to update supplier:', err);
      setToastFeedback({ type: 'error', message: `Failed to update supplier: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    }
  };

  // Synchronous Delete Supplier Handler
  const confirmDeleteSupplier = async (supplier: Supplier) => {
    if (!onDeleteSupplier) return;
    setIsDeleting(true);
    try {
      await onDeleteSupplier(supplier.id);
      setSupplierToDelete(null);
      setToastFeedback({ type: 'success', message: `Supplier "${supplier.name}" deleted successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Delete supplier failed:', err);
      setToastFeedback({ type: 'error', message: `Delete failed: ${err.message || 'Failed to delete supplier'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
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
          {toastFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastFeedback.message}</span>
        </div>
      )}

      {/* Primary Action Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl bg-[#0B192C] text-white shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-400" />
            <span>Supplier Directory</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Ultra-dense ladder directory, vendor contacts, commercial records, and verified supplier partners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Decoupled Independent CSV Manager Widget */}
      <CsvManagerWidget
        sectionType="suppliers"
        data={filteredSuppliers}
        onImport={async rows => {
          if (onImportSuppliers) {
            return await onImportSuppliers(rows);
          }
          for (const row of rows) {
            await onAddSupplier(row);
          }
          return rows.length;
        }}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#586E75] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search suppliers, contacts, locations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl pl-10 pr-4 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 transition-all shadow-sm font-medium placeholder-[#586E75]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {allCategoryNames.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#EEE8D5] border border-[#D6D1B1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Ladder List (Strict Vertical Ladder Layout) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#073642] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Verified Vendors ({filteredSuppliers.length})</span>
          </h3>
          <span className="text-[11px] text-[#586E75]">Maximized density ladder view</span>
        </div>

        <div className="flex flex-col space-y-2">
          {filteredSuppliers.map(supplier => {
            const supplierItems = catalog.filter(c => c.supplier_id === supplier.id);

            return (
              <div
                key={supplier.id}
                className="w-full bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all"
              >
                {/* Left: Company Name, Category, Contact Person, Email, Phone */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs md:text-sm font-bold text-[#073642] truncate">{supplier.name}</h4>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        {supplier.category || 'General Supplier'}
                      </span>
                      {supplier.gstin && (
                        <span className="hidden md:inline-block text-[9px] font-mono font-bold bg-[#EEE8D5] text-[#073642] px-1.5 py-0.2 rounded border border-[#D6D1B1] shrink-0">
                          GST: {supplier.gstin}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#586E75] truncate mt-0.5">
                      <span className="font-semibold text-[#073642]">{supplier.contact_person}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{supplier.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Payment Terms, Supplied Components count, Edit & Delete Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
                  {supplier.payment_terms && (
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Terms</span>
                      <span className="text-xs font-semibold text-[#073642]">{supplier.payment_terms}</span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Parts</span>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      {supplierItems.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingSupplier({ ...supplier })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSupplierToDelete(supplier)}
                      className="p-1.5 rounded-lg bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 border border-[#D6D1B1] transition-all cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <h3 className="text-lg font-bold text-red-700">Delete Supplier</h3>
            <p className="text-xs text-[#586E75]">
              Are you sure you want to delete supplier <span className="font-bold text-[#073642]">"{supplierToDelete.name}"</span>? This will remove vendor profile from the directory.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmDeleteSupplier(supplierToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <h3 className="text-xl font-bold text-[#073642]">Add New Supplier</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#586E75] hover:text-[#073642] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Components Ltd."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_person}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@company.com"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="27AABCC1234F1Z5"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Payment Terms (Optional)</label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="Net 30 Days"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Office / Plant Address (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 45, Electronics City, Industrial Zone..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-[#073642]">Edit Supplier Attributes</h3>
              </div>
              <button
                onClick={() => setEditingSupplier(null)}
                className="text-[#586E75] hover:text-[#073642] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.contact_person}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Category</label>
                  <select
                    value={editingSupplier.category || 'General Supplier'}
                    onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editingSupplier.email}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={editingSupplier.gstin || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, gstin: e.target.value })}
                    placeholder="27AABCC1234F1Z5"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Payment Terms (Optional)</label>
                  <input
                    type="text"
                    value={editingSupplier.payment_terms || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value })}
                    placeholder="Net 30 Days"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Office / Plant Address (Optional)</label>
                <textarea
                  rows={2}
                  value={editingSupplier.address || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  placeholder="Street, Industrial Area, City..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Buying Portal URL (Optional)</label>
                <input
                  type="url"
                  value={editingSupplier.buying_url || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, buying_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Update Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
