import React, { useState, useEffect } from 'react';
import { Supplier, Category } from '../types';
import {
  SourcedSupplier,
  searchSuppliersAcrossWeb,
  enrichSupplierContactAI,
  formatWhatsAppNumber
} from '../services/supplierSearchService';
import {
  Search,
  MapPin,
  Sparkles,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  BookmarkPlus,
  BookmarkCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Globe,
  Star,
  Plus
} from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  categories?: Category[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<any> | void;
  onOpenWebmail?: (to: string, subject: string, body?: string) => void;
}

export const FindSupplierTab: React.FC<Props> = ({
  suppliers: existingSuppliers,
  categories = [],
  onAddSupplier,
  onOpenWebmail
}) => {
  const [city, setCity] = useState('Pune');
  const [productQuery, setProductQuery] = useState('3.2V 100Ah LFP Cell');
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | 'maps' | 'indiamart' | 'google' | 'other'>('all');
  const [viewMode, setViewMode] = useState<'search' | 'shortlist'>('search');

  const [sourcedSuppliers, setSourcedSuppliers] = useState<SourcedSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const quickCategories = [
    'Battery Cells',
    'BMS Modules',
    'Inverters',
    'LFP Batteries',
    'Metal Enclosures',
    'Connectors & Busbars',
    'Fasteners & Hardware',
    'Wiring & Cables'
  ];

  // Initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async (overrideProduct?: string) => {
    const queryToUse = overrideProduct || productQuery;
    if (!queryToUse.trim() || isLoading) return;

    setIsLoading(true);
    setNotification(null);

    try {
      const results = await searchSuppliersAcrossWeb(city, queryToUse);

      // Check if any results match existing suppliers in database
      const updated = results.map(r => {
        const alreadyInDb = existingSuppliers.some(
          s => s.name.toLowerCase().trim() === r.name.toLowerCase().trim()
        );
        const previouslyShortlisted = sourcedSuppliers.find(
          s => s.name.toLowerCase().trim() === r.name.toLowerCase().trim()
        );
        return {
          ...r,
          isAddedToDb: alreadyInDb || (previouslyShortlisted?.isAddedToDb ?? false),
          isShortlisted: previouslyShortlisted?.isShortlisted ?? false
        };
      });

      setSourcedSuppliers(updated);
      showNotification('success', `⚡ Found ${results.length} industrial suppliers for "${queryToUse}" in ${city}`);
    } catch (err: any) {
      showNotification('error', `Search error: ${err.message || 'Failed to search suppliers'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrichContact = async (supplierId: string) => {
    setSourcedSuppliers(prev => prev.map(s => (s.id === supplierId ? { ...s, isEnriching: true } : s)));

    const target = sourcedSuppliers.find(s => s.id === supplierId);
    if (!target) return;

    try {
      const enrichedData = await enrichSupplierContactAI(target, city);
      setSourcedSuppliers(prev =>
        prev.map(s => {
          if (s.id === supplierId) {
            return {
              ...s,
              ...enrichedData,
              isEnriching: false
            };
          }
          return s;
        })
      );
      showNotification('info', `✨ Updated verified contact details for ${target.name}`);
    } catch (err) {
      setSourcedSuppliers(prev => prev.map(s => (s.id === supplierId ? { ...s, isEnriching: false } : s)));
      showNotification('error', 'Failed to enrich contact info with AI');
    }
  };

  const toggleShortlist = (supplierId: string) => {
    setSourcedSuppliers(prev =>
      prev.map(s => (s.id === supplierId ? { ...s, isShortlisted: !s.isShortlisted } : s))
    );
  };

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Convert shortlisted / selected suppliers into CosmoCnergy Supplier format and insert
  const handleAddSelectedToDatabase = async (singleSupplierId?: string) => {
    const targets = singleSupplierId
      ? sourcedSuppliers.filter(s => s.id === singleSupplierId)
      : sourcedSuppliers.filter(s => s.isShortlisted && !s.isAddedToDb);

    if (targets.length === 0) {
      showNotification('info', 'No new shortlisted suppliers selected to import.');
      return;
    }

    let addedCount = 0;

    for (const sup of targets) {
      const alreadyExists = existingSuppliers.some(
        p => p.name.toLowerCase().trim() === sup.name.toLowerCase().trim()
      );

      if (!alreadyExists) {
        const { cleanPhone } = formatWhatsAppNumber(sup.phoneNumber);
        const matchedCat = categories.find(
          c => c.name.toLowerCase() === (sup.category || 'Battery Cells').toLowerCase()
        );

        await onAddSupplier({
          name: sup.name,
          contact_person: sup.contactPerson || 'Sales Department',
          email: sup.email || `contact@${sup.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: cleanPhone || sup.phoneNumber || '+91 98220 00000',
          whatsapp: cleanPhone || sup.phoneNumber || '',
          buying_url: sup.website || '',
          address: sup.address || `${city}, Industrial Area, India`,
          gstin: sup.gstNumber || '',
          payment_terms: 'Net 30 Days',
          category: sup.category || 'Battery Cells',
          category_id: matchedCat?.id
        });
        addedCount++;
      }
    }

    // Mark as added in state
    const targetIds = targets.map(t => t.id);
    setSourcedSuppliers(prev =>
      prev.map(s => (targetIds.includes(s.id) ? { ...s, isAddedToDb: true, isShortlisted: true } : s))
    );

    showNotification('success', `⚡ Successfully added ${addedCount || targets.length} supplier profile(s) to company database!`);
  };

  const shortlistedList = sourcedSuppliers.filter(s => s.isShortlisted);
  const filteredSuppliers = sourcedSuppliers.filter(s => {
    if (activeSourceFilter === 'all') return true;
    if (activeSourceFilter === 'maps') return s.source === 'maps';
    if (activeSourceFilter === 'indiamart') return s.source === 'indiamart';
    if (activeSourceFilter === 'google') return s.source === 'google';
    if (activeSourceFilter === 'other') return s.source === 'tradeindia' || s.source === 'other';
    return true;
  });

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${productQuery} suppliers in ${city}`
  )}&t=&z=12&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="space-y-4">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notification.type === 'info'
              ? 'bg-[#0B192C] text-cyan-300 border border-cyan-500/40'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white font-black text-sm cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* SEARCH HEADER & FILTERS */}
      <div className="bg-[#FDF6E3] p-5 rounded-3xl border border-[#D6D1B1] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#073642] flex items-center gap-2">
                <span>Find New Suppliers (AI & Maps Orchestrator)</span>
              </h2>
              <p className="text-xs text-[#586E75]">
                Discover industrial vendors on Google Maps, IndiaMart & Web, enrich contact details, and 1-tap import.
              </p>
            </div>
          </div>

          {/* VIEW SWITCHER & SHORTLIST BADGE */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'search'
                  ? 'bg-[#0B192C] text-white shadow-md'
                  : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7]'
              }`}
            >
              🌐 Sourcing Feed ({sourcedSuppliers.length})
            </button>
            <button
              onClick={() => setViewMode('shortlist')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'shortlist'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-100/80 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
              }`}
            >
              <span>📋 Shortlist</span>
              <span className="bg-[#0B192C] text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">
                {shortlistedList.length}
              </span>
            </button>
          </div>
        </div>

        {/* INPUT FORM & CATEGORIES */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* City Input */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-[#073642] uppercase tracking-wider mb-1">
              City / Region *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-[#586E75]" />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Pune, Mumbai, Delhi"
                className="w-full pl-9 pr-3 py-2 bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl text-xs font-bold text-[#073642] focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Product Query Box */}
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-[#073642] uppercase tracking-wider mb-1">
              Component / Material Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#586E75]" />
              <input
                type="text"
                value={productQuery}
                onChange={e => setProductQuery(e.target.value)}
                placeholder="e.g. 3.2V 100Ah LFP Cell, 16S BMS, Copper Busbars, Solar Inverter"
                className="w-full pl-9 pr-3 py-2 bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl text-xs font-bold text-[#073642] focus:outline-none focus:border-emerald-600"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-3 flex items-end">
            <button
              onClick={() => handleSearch()}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Searching Web & Maps...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  <span>⚡ Sourcing Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QUICK CATEGORY PILLS */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-hide">
          <span className="text-[11px] font-bold text-[#586E75] shrink-0">Quick Filters:</span>
          {quickCategories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => {
                setProductQuery(cat);
                handleSearch(cat);
              }}
              disabled={isLoading}
              className="text-[11px] font-bold bg-[#EEE8D5] hover:bg-emerald-600 hover:text-white text-[#073642] border border-[#D6D1B1] px-3 py-1 rounded-xl transition-all whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* TOP STICKY BAR FOR SHORTLISTED ACTIONS */}
      {shortlistedList.length > 0 && (
        <div className="bg-[#0B192C] text-white p-3.5 rounded-2xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-lg">
              {shortlistedList.length} Shortlisted
            </span>
            <span className="text-xs text-slate-300">
              Ready to import company details into CosmoCnergy inventory database
            </span>
          </div>

          <button
            onClick={() => handleAddSelectedToDatabase()}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02]"
          >
            <span>⚡ Add All Shortlisted ({shortlistedList.length}) to Database</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN VIEW CONTENT AREA */}
      {viewMode === 'search' ? (
        /* SPLIT SCREEN WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
          {/* LEFT 40% — LIVE GOOGLE MAPS PLUGIN */}
          <div className="lg:col-span-5 bg-[#FDF6E3] rounded-3xl border border-[#D6D1B1] shadow-xs flex flex-col overflow-hidden">
            <div className="bg-[#0B192C] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">Google Maps Live Plugin ({city})</h3>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono">Interactive Location Map</span>
            </div>

            <div className="flex-1 w-full min-h-[380px] bg-slate-100 relative">
              <iframe
                title="Google Maps Sourcing Search"
                src={mapEmbedUrl}
                className="w-full h-full border-none min-h-[380px]"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>

          {/* RIGHT 60% — SOURCED CANDIDATE CARDS */}
          <div className="lg:col-span-7 flex flex-col bg-[#FDF6E3] rounded-3xl border border-[#D6D1B1] shadow-xs overflow-hidden">
            {/* SOURCE TABS HEADER */}
            <div className="bg-[#EEE8D5] border-b border-[#D6D1B1] px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveSourceFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSourceFilter === 'all'
                      ? 'bg-[#0B192C] text-white'
                      : 'text-[#073642] hover:bg-[#E4DDC7]'
                  }`}
                >
                  All ({sourcedSuppliers.length})
                </button>
                <button
                  onClick={() => setActiveSourceFilter('maps')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSourceFilter === 'maps'
                      ? 'bg-[#0B192C] text-white'
                      : 'text-[#073642] hover:bg-[#E4DDC7]'
                  }`}
                >
                  📍 Google Maps
                </button>
                <button
                  onClick={() => setActiveSourceFilter('indiamart')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSourceFilter === 'indiamart'
                      ? 'bg-[#0B192C] text-white'
                      : 'text-[#073642] hover:bg-[#E4DDC7]'
                  }`}
                >
                  🏭 IndiaMart
                </button>
                <button
                  onClick={() => setActiveSourceFilter('google')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSourceFilter === 'google'
                      ? 'bg-[#0B192C] text-white'
                      : 'text-[#073642] hover:bg-[#E4DDC7]'
                  }`}
                >
                  🌐 Web Search
                </button>
                <button
                  onClick={() => setActiveSourceFilter('other')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSourceFilter === 'other'
                      ? 'bg-[#0B192C] text-white'
                      : 'text-[#073642] hover:bg-[#E4DDC7]'
                  }`}
                >
                  📦 Directories
                </button>
              </div>
            </div>

            {/* CARDS SCROLLABLE FEED */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[580px] scrollbar-thin">
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-[#073642]">
                    Gemini Sourcing Suppliers across Google Maps, IndiaMart & Directories...
                  </p>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="py-20 text-center text-[#586E75] space-y-2">
                  <Search className="w-8 h-8 text-[#93A1A1] mx-auto" />
                  <p className="text-xs font-semibold text-[#073642]">
                    No suppliers found for this filter. Try adjusting your component query.
                  </p>
                </div>
              ) : (
                filteredSuppliers.map(sup => {
                  const { cleanPhone, waUrl } = formatWhatsAppNumber(sup.phoneNumber);
                  return (
                    <div
                      key={sup.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        sup.isAddedToDb
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : sup.isShortlisted
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                          : 'bg-[#EEE8D5] border-[#D6D1B1] hover:border-emerald-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#073642]">{sup.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#D6D1B1] text-[#073642]">
                              {sup.sourceLabel}
                            </span>
                            {sup.rating && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                {sup.rating}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#586E75] mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#586E75] shrink-0" />
                            <span>{sup.address}</span>
                          </p>
                        </div>

                        {/* SHORTLIST TOGGLE BUTTON */}
                        <button
                          onClick={() => toggleShortlist(sup.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            sup.isShortlisted
                              ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'bg-white border border-[#D6D1B1] text-[#073642] hover:bg-slate-50'
                          }`}
                        >
                          {sup.isShortlisted ? '✓ Shortlisted' : '+ Shortlist'}
                        </button>
                      </div>

                      {/* CONTACT DETAILS & ENRICHMENT */}
                      <div className="mt-3 pt-3 border-t border-[#D6D1B1]/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Phone / WhatsApp */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#586E75] font-semibold">📱 Phone:</span>
                          {sup.phoneNumber ? (
                            <span className="font-bold text-[#073642] flex items-center gap-1.5">
                              {cleanPhone || sup.phoneNumber}
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:underline font-bold text-[11px] bg-emerald-100/70 px-1.5 py-0.5 rounded"
                                  title="Open WhatsApp chat"
                                >
                                  💬 WhatsApp
                                </a>
                              )}
                            </span>
                          ) : (
                            <span className="text-rose-600 italic text-[11px]">Missing Phone</span>
                          )}
                        </div>

                        {/* Email Address */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#586E75] font-semibold">📧 Email:</span>
                          {sup.email ? (
                            <span className="font-bold text-[#073642] truncate max-w-[200px]">
                              {sup.email}
                            </span>
                          ) : (
                            <span className="text-rose-600 italic text-[11px]">Missing Email</span>
                          )}
                        </div>
                      </div>

                      {/* FOOTER ACTIONS */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#D6D1B1]/60">
                        {/* AI ENRICHMENT BUTTON IF PHONE/EMAIL MISSING */}
                        {(!sup.phoneNumber || !sup.email) && (
                          <button
                            onClick={() => handleEnrichContact(sup.id)}
                            disabled={sup.isEnriching}
                            className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            {sup.isEnriching ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-cyan-800" />
                                <span>AI Enriching...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-cyan-700" />
                                <span>🔍 Find Info (AI)</span>
                              </>
                            )}
                          </button>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                          {sup.isAddedToDb ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Saved in Database</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddSelectedToDatabase(sup.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <span>⚡ 1-Tap Add to Database</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* SHORTLISTED TRAY VIEW */
        <div className="bg-[#FDF6E3] rounded-3xl border border-[#D6D1B1] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D1B1] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#073642]">
                Shortlisted Supplier Candidates ({shortlistedList.length})
              </h3>
              <p className="text-xs text-[#586E75]">
                Review selected suppliers before 1-tap onboarding or dispatching RFQs
              </p>
            </div>

            {shortlistedList.length > 0 && (
              <button
                onClick={() => handleAddSelectedToDatabase()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>⚡ Add All Shortlisted ({shortlistedList.length}) to Database</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {shortlistedList.length === 0 ? (
            <div className="py-20 text-center text-[#586E75] space-y-2">
              <BookmarkPlus className="w-8 h-8 text-[#93A1A1] mx-auto" />
              <p className="text-xs font-semibold text-[#073642]">
                No suppliers shortlisted yet. Switch back to Sourcing Feed and click "+ Shortlist".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortlistedList.map(sup => {
                const { cleanPhone, waUrl } = formatWhatsAppNumber(sup.phoneNumber);
                return (
                  <div
                    key={sup.id}
                    className="p-4 rounded-2xl border border-[#D6D1B1] bg-[#EEE8D5] space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#073642]">{sup.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#073642] border border-[#D6D1B1]">
                          {sup.sourceLabel}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleShortlist(sup.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="text-xs text-[#586E75] space-y-1">
                      <p>
                        📍 <strong className="text-[#073642]">Address:</strong> {sup.address}
                      </p>
                      <p>
                        📱 <strong className="text-[#073642]">Phone:</strong>{' '}
                        {cleanPhone || sup.phoneNumber || 'Not found'}
                      </p>
                      <p>
                        📧 <strong className="text-[#073642]">Email:</strong> {sup.email || 'Not found'}
                      </p>
                      <p>
                        👤 <strong className="text-[#073642]">Contact:</strong> {sup.contactPerson}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#D6D1B1] gap-2 flex-wrap">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs hover:bg-emerald-200 transition-colors"
                        >
                          💬 WhatsApp
                        </a>
                      )}

                      {onOpenWebmail && sup.email && (
                        <button
                          onClick={() =>
                            onOpenWebmail(
                              sup.email,
                              `RFQ Inquiry for ${productQuery}`,
                              `Dear ${sup.contactPerson || 'Sales Team'},\n\nWe are looking to procure ${productQuery} in ${city}.\n\nPlease provide quotation and lead time.\n\nBest regards,\nCosmoCnergy Procurement Team`
                            )
                          }
                          className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg font-bold text-xs hover:bg-sky-200 transition-colors cursor-pointer"
                        >
                          📧 Webmail RFQ
                        </button>
                      )}

                      {sup.isAddedToDb ? (
                        <span className="text-xs font-bold text-emerald-700 ml-auto">
                          ✓ Saved in Database
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddSelectedToDatabase(sup.id)}
                          className="px-3 py-1 bg-emerald-600 text-white font-extrabold text-xs rounded-lg hover:bg-emerald-500 ml-auto cursor-pointer"
                        >
                          ⚡ 1-Tap Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FindSupplierTab;
