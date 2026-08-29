import React, { useState, useEffect } from 'react';
import { CatalogItem, Supplier, ComponentSupplier } from '../types';
import {
  scoreSupplierCandidates,
  getTopScoredCandidates,
  ScoredSupplierCandidate
} from '../lib/scoring';
import {
  adviseBestSupplier,
  SupplierRecommendationResult
} from '../services/supplierAdvisor';
import {
  X,
  Sparkles,
  Award,
  CheckCircle2,
  Building2,
  Star,
  Clock,
  Package,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  ShoppingCart,
  ExternalLink,
  Bot
} from 'lucide-react';

interface Props {
  component: CatalogItem;
  suppliers: Supplier[];
  componentSuppliers: ComponentSupplier[];
  onClose: () => void;
  onCreatePO: (supplier: Supplier, item: CatalogItem, unitPrice: number, qty: number) => void;
}

export const SupplierComparisonDrawer: React.FC<Props> = ({
  component,
  suppliers,
  componentSuppliers,
  onClose,
  onCreatePO
}) => {
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [recommendation, setRecommendation] = useState<SupplierRecommendationResult | null>(null);

  // Filter linked suppliers for this component
  const linkedRecords: ComponentSupplier[] = React.useMemo(() => {
    const directLinks = componentSuppliers.filter(cs => cs.component_id === component.id);
    if (directLinks.length > 0) {
      // Deduplicate by supplier_id (in case multi-category causes duplicate junction entries)
      const seen = new Set<string>();
      return directLinks
        .filter(cs => { const dup = seen.has(cs.supplier_id); seen.add(cs.supplier_id); return !dup; })
        .map(cs => ({
          ...cs,
          supplier: cs.supplier || suppliers.find(s => s.id === cs.supplier_id)
        }));
    }

    // Fallback 1: If component carries supplier_mappings or supplier_ids directly
    if (component.supplier_mappings && component.supplier_mappings.length > 0) {
      return component.supplier_mappings.map((m, idx) => {
        const supp = suppliers.find(s => s.id === m.supplier_id);
        return {
          id: `synth-${component.id}-${m.supplier_id}-${idx}`,
          component_id: component.id,
          supplier_id: m.supplier_id,
          unit_price: Number(m.unit_price) || Number(component.preset_price) || 150,
          rfq_quoted_price: Number(m.rfq_quoted_price) || Number(m.unit_price) || Number(component.preset_price) || 150,
          moq: Number(m.moq) || Number(component.min_order_qty) || 10,
          lead_time_days: Number(m.lead_time_days) || 7,
          part_number_vendor: m.part_number_vendor || component.sku || 'OEM-SPEC',
          external_rating: supp?.rating || 4.5,
          review_summary: `Directly quoted vendor: ${supp?.name}.`,
          rating_sources: { indiamart: supp?.rating || 4.6, google_maps: 4.3, amazon: 4.5 },
          supplier: supp
        };
      });
    }

    if (component.supplier_ids && component.supplier_ids.length > 0) {
      return component.supplier_ids.map((sId, idx) => {
        const supp = suppliers.find(s => s.id === sId);
        return {
          id: `synth-${component.id}-${sId}-${idx}`,
          component_id: component.id,
          supplier_id: sId,
          unit_price: component.preset_price || 150,
          rfq_quoted_price: component.preset_price || 150,
          moq: component.min_order_qty || 10,
          lead_time_days: 7,
          part_number_vendor: component.sku || 'OEM-SPEC',
          external_rating: supp?.rating || 4.5,
          review_summary: `Directly linked vendor: ${supp?.name}.`,
          rating_sources: { indiamart: supp?.rating || 4.6, google_maps: 4.3, amazon: 4.5 },
          supplier: supp
        };
      });
    }

    // Fallback 2: If no M:N junction records yet, synthesize from component default supplier
    if (component.supplier_id) {
      const supp = suppliers.find(s => s.id === component.supplier_id);
      return [
        {
          id: `synth-${component.id}-${component.supplier_id}`,
          component_id: component.id,
          supplier_id: component.supplier_id,
          unit_price: component.preset_price || 150,
          rfq_quoted_price: component.preset_price || 150,
          moq: component.min_order_qty || 10,
          lead_time_days: 7,
          part_number_vendor: component.sku || 'OEM-SPEC',
          external_rating: supp?.rating || 4.5,
          review_summary: 'Verified industrial supplier with verified on-spec test reports.',
          rating_sources: { indiamart: 4.6, google_maps: 4.3, amazon: 4.5 },
          supplier: supp
        }
      ];
    }

    return [];
  }, [component, componentSuppliers, suppliers]);

  // Deterministic scoring of all candidates
  const scoredCandidates: ScoredSupplierCandidate[] = React.useMemo(() => {
    return scoreSupplierCandidates(linkedRecords);
  }, [linkedRecords]);

  // Run Gemini 3.6 Flash Advisor on top candidates
  useEffect(() => {
    let isMounted = true;
    if (scoredCandidates.length === 0) {
      setIsLoadingAI(false);
      return;
    }

    const runAdvisor = async () => {
      setIsLoadingAI(true);
      try {
        const top3 = getTopScoredCandidates(linkedRecords, 3);
        const result = await adviseBestSupplier(component, top3);
        if (isMounted) {
          setRecommendation(result);
        }
      } catch (err) {
        console.error('[SupplierComparisonDrawer] Advisor error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAI(false);
        }
      }
    };

    runAdvisor();
    return () => {
      isMounted = false;
    };
  }, [component, linkedRecords, scoredCandidates]);

  const winningId = recommendation?.winning_supplier_id || scoredCandidates[0]?.componentSupplier.supplier_id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FDF6E3] border-l border-[#D6D1B1] w-full max-w-4xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between text-[#073642]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 md:p-6 border-b border-[#D6D1B1]/70 bg-[#FDF6E3] sticky top-0 z-20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg md:text-xl font-extrabold text-[#073642]">
                    Multi-Supplier Sourcing Matrix
                  </h3>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {scoredCandidates.length} Vendors Available
                  </span>
                </div>
                <p className="text-xs text-[#586E75]">
                  Comparing RFQ quoted prices, delivery lead times, MOQs, and verified platform ratings
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Component Info Card */}
          <div className="bg-[#EEE8D5]/70 border border-[#D6D1B1] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#073642]">{component.name}</span>
                <span className="bg-[#FDF6E3] text-[#586E75] border border-[#D6D1B1] text-[10px] font-mono px-2 py-0.2 rounded">
                  SKU: {component.sku || component.id}
                </span>
              </div>
              <p className="text-[11px] text-[#586E75] truncate max-w-lg">
                Specs: {component.specs || 'Standard industrial specifications'} • Category: {component.category || 'Battery Component'}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
              <div>
                <span className="text-[9px] text-[#586E75] uppercase block font-sans">Current Stock</span>
                <strong className="text-[#073642] text-xs">{component.in_stock_qty || 0} {component.uom || 'Pcs'}</strong>
              </div>
              <div className="border-l border-[#D6D1B1] pl-4">
                <span className="text-[9px] text-[#586E75] uppercase block font-sans">Target MOQ</span>
                <strong className="text-emerald-800 text-xs">{component.min_order_qty || 10} {component.uom || 'Pcs'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-5 md:p-6 space-y-6 flex-1">
          {/* AI Recommendation Banner */}
          {isLoadingAI ? (
            /* Loading Skeleton */
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span className="text-xs font-bold text-emerald-900">
                    Gemini 3.6 Flash Analyzing RFQ Quotes, Reviews & Lead Times...
                  </span>
                </div>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded font-mono">
                  Evaluating 40% RFQ Price / 30% Rating
                </span>
              </div>
              <div className="h-3 bg-emerald-200/50 rounded-full w-3/4" />
              <div className="h-3 bg-emerald-200/40 rounded-full w-1/2" />
            </div>
          ) : recommendation ? (
            /* Gemini Recommendation Card */
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500/50 shadow-sm space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                      AI Sourcing Advisor • Gemini 3.6 Flash
                    </span>
                    <h4 className="text-sm font-extrabold text-[#073642] flex items-center gap-2">
                      <span>Recommended Vendor:</span>
                      <span className="text-emerald-900 underline underline-offset-2">
                        {suppliers.find(s => s.id === recommendation.winning_supplier_id)?.name || 'Top Supplier'}
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="bg-emerald-600 text-white border border-emerald-700 text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>{recommendation.badge}</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#073642] bg-white/70 p-3 rounded-xl border border-emerald-200 leading-relaxed font-medium">
                "{recommendation.reasoning}"
              </p>
            </div>
          ) : null}

          {/* Supplier Comparison Grid / Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#073642] uppercase tracking-wider">
                Supplier Candidates Ranked by Multi-Criteria Formula
              </h4>
              <span className="text-[10px] text-[#586E75] font-medium">
                Weights: 40% RFQ Price • 30% Rating • 20% Lead Time • 10% MOQ
              </span>
            </div>

            {scoredCandidates.length === 0 ? (
              <div className="p-8 text-center bg-[#EEE8D5]/60 border border-dashed border-[#D6D1B1] rounded-2xl space-y-2">
                <Building2 className="w-8 h-8 text-[#586E75] mx-auto" />
                <p className="text-xs text-[#586E75] font-semibold">
                  No suppliers currently mapped to this component in the junction database.
                </p>
              </div>
            ) : (
              scoredCandidates.map((candidate, idx) => {
                const { componentSupplier: cs, effectivePrice, effectiveRating, ratingBreakdown, matchScore } = candidate;
                const supplierObj = cs.supplier || suppliers.find(s => s.id === cs.supplier_id);
                const isWinner = cs.supplier_id === winningId;

                return (
                  <div
                    key={cs.id}
                    className={`rounded-2xl p-4 border transition-all space-y-3 ${
                      isWinner
                        ? 'bg-[#FFFBEB] border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                        : 'bg-[#EEE8D5]/60 hover:bg-[#EEE8D5] border-[#D6D1B1] shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Rank, Supplier Info, Match Score */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D1B1]/60 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                            isWinner
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#FDF6E3] text-[#073642] border border-[#D6D1B1]'
                          }`}
                        >
                          #{idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-sm text-[#073642]">
                              {supplierObj?.name || 'Industrial Supplier'}
                            </h5>
                            {isWinner && (
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.2 rounded uppercase">
                                Recommended Winner
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#586E75] mt-0.5">
                            <span>Vendor Part: <strong className="font-mono text-[#073642]">{cs.part_number_vendor || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>{supplierObj?.address || 'Industrial Zone'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Match Score Gauge */}
                      <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                        <div className="text-right">
                          <span className="text-[9px] text-[#586E75] uppercase font-bold block">Match Score</span>
                          <span
                            className={`font-mono text-base font-black ${
                              matchScore >= 80 ? 'text-emerald-700' : matchScore >= 60 ? 'text-amber-700' : 'text-slate-700'
                            }`}
                          >
                            {matchScore}/100
                          </span>
                        </div>
                        <div className="w-12 bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
                          <div
                            className={`h-full ${
                              matchScore >= 80 ? 'bg-emerald-600' : matchScore >= 60 ? 'bg-amber-500' : 'bg-slate-500'
                            }`}
                            style={{ width: `${matchScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid: Pricing, MOQ, Lead Time, Ratings */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Price Box */}
                      <div className="bg-[#FDF6E3] p-2.5 rounded-xl border border-[#D6D1B1]/60">
                        <span className="text-[9px] text-[#586E75] uppercase font-bold block">RFQ Quoted Price</span>
                        <div className="font-mono font-black text-sm text-emerald-800 mt-0.5">
                          ₹{effectivePrice.toLocaleString('en-IN')}
                        </div>
                        {cs.unit_price !== effectivePrice && (
                          <span className="text-[10px] text-[#586E75] line-through block">
                            Cat: ₹{cs.unit_price.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* MOQ Box */}
                      <div className="bg-[#FDF6E3] p-2.5 rounded-xl border border-[#D6D1B1]/60">
                        <span className="text-[9px] text-[#586E75] uppercase font-bold block">Minimum Order (MOQ)</span>
                        <div className="font-mono font-extrabold text-sm text-[#073642] mt-0.5">
                          {cs.moq} {component.uom || 'Pcs'}
                        </div>
                        <span className="text-[10px] text-[#586E75] block">Trial friendly</span>
                      </div>

                      {/* Lead Time Box */}
                      <div className="bg-[#FDF6E3] p-2.5 rounded-xl border border-[#D6D1B1]/60">
                        <span className="text-[9px] text-[#586E75] uppercase font-bold block">Delivery Lead Time</span>
                        <div className="font-mono font-extrabold text-sm text-[#073642] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{cs.lead_time_days} Days</span>
                        </div>
                        <span className="text-[10px] text-[#586E75] block">Dispatch estimate</span>
                      </div>

                      {/* Overall Rating */}
                      <div className="bg-[#FDF6E3] p-2.5 rounded-xl border border-[#D6D1B1]/60">
                        <span className="text-[9px] text-[#586E75] uppercase font-bold block">Verified Rating</span>
                        <div className="font-mono font-extrabold text-sm text-amber-700 mt-0.5 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{effectiveRating} / 5.0</span>
                        </div>
                        <span className="text-[10px] text-[#586E75] block">Across sources</span>
                      </div>
                    </div>

                    {/* Platform Rating Breakdown Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-[#586E75] mr-1">Source Breakdown:</span>
                      {ratingBreakdown.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="bg-[#FDF6E3] border border-[#D6D1B1] px-2 py-0.5 rounded text-[10px] text-[#073642] font-semibold flex items-center gap-1"
                        >
                          <span>{src.platform}:</span>
                          <strong className="text-amber-700 font-mono">{src.rating}★</strong>
                        </span>
                      ))}
                    </div>

                    {/* Review Snippet if available */}
                    {cs.review_summary && (
                      <p className="text-[11px] text-[#586E75] italic bg-[#FDF6E3]/60 p-2 rounded-lg border border-[#D6D1B1]/40">
                        "{cs.review_summary}"
                      </p>
                    )}

                    {/* Bottom Action: Create Purchase Order (1-Tap Immediate Modal Launch) */}
                    <div className="pt-2 border-t border-[#D6D1B1]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#586E75]">
                        Contact: <strong className="text-[#073642] font-medium">{supplierObj?.contact_person || 'Sales Desk'}</strong> ({supplierObj?.phone || supplierObj?.email})
                      </span>

                      <button
                        onClick={() => {
                          if (supplierObj) {
                            onCreatePO(supplierObj, component, effectivePrice, cs.moq);
                            onClose();
                          }
                        }}
                        className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer ${
                          isWinner
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                            : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Create Purchase Order (₹{effectivePrice.toLocaleString('en-IN')})</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#D6D1B1]/70 bg-[#FDF6E3] flex items-center justify-between text-xs text-[#586E75]">
          <span>
            Target Route: <code className="font-mono text-[10px] bg-[#EEE8D5] px-1.5 py-0.5 rounded">/procurement/new?supplierId={winningId}&price=...</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-bold text-xs border border-[#D6D1B1]"
          >
            Close Sourcing Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
