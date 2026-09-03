import React, { useState, useMemo } from 'react';
import { Company, CatalogItem, Category } from '../types';
import { CsvManagerWidget } from './CsvManagerWidget';
import { FindCompanyTab } from './FindCompanyTab';
import { Plus, Phone, Building2, MapPin, Search, Edit2, CheckCircle2, Shield, Mail, Trash2, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  companies: Company[];
  catalog: CatalogItem[];
  categories?: Category[];
  onAddCompany: (company: Omit<Company, 'id'>) => Promise<any> | void;
  onUpdateCompany?: (company: Company) => Promise<any> | void;
  onDeleteCompany?: (companyId: string) => Promise<void> | void;
  onImportCompanies?: (rows: any[]) => Promise<number | void> | number | void;
  onOpenWebmail?: (to: string, subject: string, body?: string) => void;
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

export const CompanyDashboard: React.FC<Props> = ({
  companies,
  catalog,
  categories = [],
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onImportCompanies,
  onOpenWebmail,
  onOpenComparisonDrawer
}) => {
  const [activeCompanyTab, setActiveCompanyTab] = useState<'all_companies' | 'find_new'>('all_companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
    category: 'Capacitor',    // primary / legacy
    categories: ['Capacitor'] // multi-category
  });

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
      ...companies.map(s => s.category || '').filter(Boolean)
    ].filter((cat): cat is string => Boolean(cat) && !legacyToExclude.has(cat));
    return ['ALL', ...Array.from(new Set(names))];
  }, [categories, companies]);

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const activeCat = selectedCategory.toLowerCase().trim();

    return companies.filter(s => {
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.contact_person.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term)) ||
        (s.categories && s.categories.some(c => c.toLowerCase().includes(term)));

      let matchesCategory = activeCat === 'all';
      if (!matchesCategory) {
        // Check multi-category array first
        if (s.categories && s.categories.length > 0) {
          matchesCategory = s.categories.some(c => c.toLowerCase().trim() === activeCat);
        }
        // Fallback to single category field
        if (!matchesCategory) {
          const suppCat = (s.category || '').toLowerCase().trim();
          const relationalCatName = s.category_id
            ? (categories.find(cat => cat.id === s.category_id)?.name || '').toLowerCase().trim()
            : '';
          matchesCategory = suppCat === activeCat || relationalCatName === activeCat;
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [companies, searchTerm, selectedCategory, categories]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const primaryCat = formData.categories[0] || formData.category;
    const matchedCat = categories.find(c => c.name.toLowerCase() === primaryCat.toLowerCase());

    try {
      await onAddCompany({
        ...formData,
        category: primaryCat,
        categories: formData.categories,
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
        category: 'Capacitor',
        categories: ['Capacitor']
      });
      setIsAddModalOpen(false);
      setToastFeedback({ type: 'success', message: `Company "${formData.name}" added successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to add company:', err);
      setToastFeedback({ type: 'error', message: `Failed to add company: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    const primaryCat = (editingCompany.categories && editingCompany.categories.length > 0)
      ? editingCompany.categories[0]
      : (editingCompany.category || '');
    const matchedCat = categories.find(c => c.name.toLowerCase() === primaryCat.toLowerCase());

    try {
      if (onUpdateCompany) {
        await onUpdateCompany({
          ...editingCompany,
          category: primaryCat || editingCompany.category,
          categories: editingCompany.categories || (editingCompany.category ? [editingCompany.category] : []),
          category_id: matchedCat?.id || editingCompany.category_id
        });
      }
      setEditingCompany(null);
      setToastFeedback({ type: 'success', message: `Company "${editingCompany.name}" updated successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to update company:', err);
      setToastFeedback({ type: 'error', message: `Failed to update company: ${err.message || err}` });
      setTimeout(() => setToastFeedback(null), 4500);
    }
  };

  // Synchronous Delete Company Handler
  const confirmDeleteCompany = async (company: Company) => {
    if (!onDeleteCompany) return;
    setIsDeleting(true);
    try {
      await onDeleteCompany(company.id);
      setCompanyToDelete(null);
      setToastFeedback({ type: 'success', message: `Company "${company.name}" deleted successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Delete company failed:', err);
      setToastFeedback({ type: 'error', message: `Delete failed: ${err.message || 'Failed to delete company'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCompanyIds(filteredCompanies.map(s => s.id));
    } else {
      setSelectedCompanyIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!onDeleteCompany) return;
    if (!confirm(`Are you sure you want to delete ${selectedCompanyIds.length} companies?`)) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedCompanyIds) {
        await onDeleteCompany(id);
      }
      setSelectedCompanyIds([]);
      setToastFeedback({ type: 'success', message: 'Bulk delete successful.' });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Bulk delete failed:', err);
      setToastFeedback({ type: 'error', message: `Bulk delete failed: ${err.message || 'Failed'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsBulkDeleting(false);
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

      {/* Sub-Tab Switcher Bar (All Companies vs Find New Companies) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => setActiveCompanyTab('all_companies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCompanyTab === 'all_companies'
              ? 'bg-[#0B192C] text-white shadow-md'
              : 'text-[#073642] hover:bg-[#EEE8D5]'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>All Companies ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveCompanyTab('find_new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeCompanyTab === 'find_new'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-[#073642] hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <Search className="w-4 h-4 text-cyan-400" />
          <span>Find New Companies (AI & Maps)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-slate-950">
            NEW
          </span>
        </button>
      </div>

      {/* CONDITIONAL SUB-TAB CONTENT */}
      {activeCompanyTab === 'find_new' ? (
        <FindCompanyTab
          companies={companies}
          categories={categories}
          onAddCompany={onAddCompany}
          onOpenWebmail={onOpenWebmail}
        />
      ) : (
        <>
          {/* Primary Action Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl bg-[#0B192C] text-white shadow-md">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Building2 className="w-7 h-7 text-emerald-400" />
                <span>Company Directory</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Ultra-dense ladder directory, vendor contacts, commercial records, and verified company partners.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Company</span>
              </button>
            </div>
          </div>

          {/* Decoupled Independent CSV Manager Widget */}
          <CsvManagerWidget
            sectionType="companies"
            data={filteredCompanies}
            onImport={async rows => {
              if (onImportCompanies) {
                return await onImportCompanies(rows);
              }
              for (const row of rows) {
                await onAddCompany(row);
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
            placeholder="Search companies, contacts, locations..."
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

      {/* Companies Ladder List (Strict Vertical Ladder Layout) */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
          <div>
            <h3 className="text-sm font-bold text-[#073642] flex items-center gap-2">
              <input
                type="checkbox"
                checked={filteredCompanies.length > 0 && selectedCompanyIds.length === filteredCompanies.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Verified Vendors ({filteredCompanies.length})</span>
            </h3>
            <span className="text-[11px] text-[#586E75] ml-6">Maximized density ladder view with bulk selection</span>
          </div>

          {selectedCompanyIds.length > 0 && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-emerald-500 animate-in fade-in">
              <span className="text-xs font-bold text-[#073642] px-2">{selectedCompanyIds.length} Selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          {filteredCompanies.map(company => {
            const companyItems = catalog.filter(c => c.company_id === company.id);

            return (
              <div
                key={company.id}
                className="w-full bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all"
              >
                {/* Left: Checkbox, Company Name, Category, Contact Person, Email, Phone */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedCompanyIds.includes(company.id)}
                    onChange={() => toggleSelectOne(company.id)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                  />
                  
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs md:text-sm font-bold text-[#073642] truncate">{company.name}</h4>
                      {/* Multi-category pills — show up to 2 then "+N more" */}
                      {(company.categories && company.categories.length > 0
                        ? company.categories
                        : [company.category || 'General Company']
                      ).slice(0, 2).map((cat, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">{cat}</span>
                      ))}
                      {company.categories && company.categories.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EEE8D5] text-[#073642] border border-[#D6D1B1] shrink-0">
                          +{company.categories.length - 2} more
                        </span>
                      )}
                      {company.gstin && (
                        <span className="hidden md:inline-block text-[9px] font-mono font-bold bg-[#EEE8D5] text-[#073642] px-1.5 py-0.5 rounded border border-[#D6D1B1] shrink-0">
                          GST: {company.gstin}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#586E75] truncate mt-0.5">
                      <span className="font-semibold text-[#073642]">{company.contact_person}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{company.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Payment Terms, Supplied Components count, Edit & Delete Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
                  {company.payment_terms && (
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Terms</span>
                      <span className="text-xs font-semibold text-[#073642]">{company.payment_terms}</span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Parts</span>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      {companyItems.length} items
                    </span>
                  </div>



                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingCompany({ ...company })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                      title="Edit Company"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompanyToDelete(company)}
                      className="p-1.5 rounded-lg bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 border border-[#D6D1B1] transition-all cursor-pointer"
                      title="Delete Company"
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
    </>
  )}

      {/* Delete Company Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <h3 className="text-lg font-bold text-red-700">Delete Company</h3>
            <p className="text-xs text-[#586E75]">
              Are you sure you want to delete company <span className="font-bold text-[#073642]">"{companyToDelete.name}"</span>? This will remove vendor profile from the directory.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmDeleteCompany(companyToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <h3 className="text-xl font-bold text-[#073642]">Add New Company</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#586E75] hover:text-[#073642] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#073642] mb-1">Company Company Name *</label>
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
              </div>

              {/* Multi-Category Selector */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1.5">
                  Categories <span className="text-[10px] text-[#586E75] font-normal ml-1">(Select all that apply)</span>
                </label>
                <div className="p-3 bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl space-y-2 max-h-36 overflow-y-auto">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-2.5 cursor-pointer hover:text-emerald-800 group">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat)}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...formData.categories, cat]
                            : formData.categories.filter(c => c !== cat);
                          setFormData({ ...formData, categories: next, category: next[0] || cat });
                        }}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-medium text-[#073642] group-hover:text-emerald-800">{cat}</span>
                    </label>
                  ))}
                </div>
                {/* Selected pills */}
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.categories.map((cat, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                        {cat}
                        {i === 0 && <span className="text-[9px] opacity-70">(primary)</span>}
                      </span>
                    ))}
                  </div>
                )}
                {formData.categories.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">Please select at least one category.</p>
                )}
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
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#FDF6E3] w-full max-w-lg rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
            <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-[#073642]">Edit Company Attributes</h3>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
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
                  value={editingCompany.name}
                  onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.contact_person}
                    onChange={e => setEditingCompany({ ...editingCompany, contact_person: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Multi-Category Selector (Edit) */}
              <div>
                <label className="block font-semibold text-[#073642] mb-1.5">
                  Categories <span className="text-[10px] text-[#586E75] font-normal ml-1">(Select all that apply)</span>
                </label>
                <div className="p-3 bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl space-y-2 max-h-36 overflow-y-auto">
                  {DEFAULT_CATEGORIES.map(cat => {
                    const currentCats = editingCompany.categories || (editingCompany.category ? [editingCompany.category] : ['General Company']);
                    return (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={currentCats.includes(cat)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...currentCats, cat]
                              : currentCats.filter(c => c !== cat);
                            setEditingCompany({ ...editingCompany, categories: next, category: next[0] || cat });
                          }}
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <span className="text-xs font-medium text-[#073642] group-hover:text-emerald-800">{cat}</span>
                      </label>
                    );
                  })}
                </div>
                {/* Selected pills */}
                {(() => {
                  const currentCats = editingCompany.categories || (editingCompany.category ? [editingCompany.category] : []);
                  return currentCats.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentCats.map((cat, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                          {cat}{i === 0 && <span className="text-[9px] opacity-70">(primary)</span>}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-[11px] text-amber-700 mt-1">Please select at least one category.</p>;
                })()}
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editingCompany.email}
                    onChange={e => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.phone}
                    onChange={e => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={editingCompany.gstin || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, gstin: e.target.value })}
                    placeholder="27AABCC1234F1Z5"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Payment Terms (Optional)</label>
                  <input
                    type="text"
                    value={editingCompany.payment_terms || ''}
                    onChange={e => setEditingCompany({ ...editingCompany, payment_terms: e.target.value })}
                    placeholder="Net 30 Days"
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Office / Plant Address (Optional)</label>
                <textarea
                  rows={2}
                  value={editingCompany.address || ''}
                  onChange={e => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  placeholder="Street, Industrial Area, City..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#073642] mb-1">Buying Portal URL (Optional)</label>
                <input
                  type="url"
                  value={editingCompany.buying_url || ''}
                  onChange={e => setEditingCompany({ ...editingCompany, buying_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-sm text-[#073642]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold hover:bg-[#E4DDC7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Update Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
