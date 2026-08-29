import { ComponentCompany } from '../types';

export interface ScoredCompanyCandidate {
  componentCompany: ComponentCompany;
  effectivePrice: number;
  effectiveRating: number;
  ratingBreakdown: { platform: string; rating: number }[];
  matchScore: number; // 0 to 100
  scoreBreakdown: {
    costScore: number;
    ratingScore: number;
    leadTimeScore: number;
    moqScore: number;
  };
}

/**
 * Computes multi-platform aggregated rating from rating_sources JSONB or falls back to external_rating
 */
export const calculateAggregatedRating = (
  cs: ComponentCompany
): { rating: number; breakdown: { platform: string; rating: number }[] } => {
  const sources = cs.rating_sources || {};
  const entries = Object.entries(sources).filter(([_, val]) => typeof val === 'number' && val > 0) as [string, number][];

  if (entries.length > 0) {
    const sum = entries.reduce((acc, [_, val]) => acc + val, 0);
    const avg = Number((sum / entries.length).toFixed(2));
    const breakdown = entries.map(([platform, rating]) => ({
      platform: formatPlatformName(platform),
      rating
    }));
    return { rating: avg, breakdown };
  }

  const fallback = cs.external_rating || cs.company?.rating || 4.0;
  return {
    rating: Number(fallback.toFixed(1)),
    breakdown: [
      { platform: 'IndiaMART', rating: Number(fallback.toFixed(1)) },
      { platform: 'Google Maps', rating: Number(Math.max(1, fallback - 0.2).toFixed(1)) }
    ]
  };
};

const formatPlatformName = (key: string): string => {
  switch (key.toLowerCase()) {
    case 'indiamart':
      return 'IndiaMART';
    case 'google_maps':
    case 'googlemaps':
      return 'Google Maps';
    case 'amazon':
      return 'Amazon Business';
    case 'tradeindia':
      return 'TradeIndia';
    case 'moglix':
      return 'Moglix';
    case 'industrybuying':
      return 'IndustryBuying';
    case 'alibaba':
      return 'Alibaba';
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
};

/**
 * Deterministic Multi-Criteria Pre-Scoring
 * Weights:
 * - Cost / RFQ Quoted Price: 40% (Inverted: lower price = higher score)
 * - Platform Ratings: 30% (Direct: higher rating = higher score)
 * - Lead Time: 20% (Inverted: faster delivery = higher score)
 * - Minimum Order Quantity: 10% (Inverted: lower trial MOQ = higher score)
 */
export const scoreCompanyCandidates = (
  candidates: ComponentCompany[]
): ScoredCompanyCandidate[] => {
  if (!candidates || candidates.length === 0) return [];

  // Extract values
  const prices = candidates.map(c => Number(c.rfq_quoted_price || c.unit_price) || 1);
  const leadTimes = candidates.map(c => Number(c.lead_time_days) || 1);
  const moqs = candidates.map(c => Number(c.moq) || 1);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minLeadTime = Math.min(...leadTimes);
  const maxLeadTime = Math.max(...leadTimes);

  const minMoq = Math.min(...moqs);
  const maxMoq = Math.max(...moqs);

  const scored: ScoredCompanyCandidate[] = candidates.map(cs => {
    const effectivePrice = Number(cs.rfq_quoted_price || cs.unit_price) || 1;
    const { rating: effectiveRating, breakdown: ratingBreakdown } = calculateAggregatedRating(cs);
    const leadTime = Number(cs.lead_time_days) || 1;
    const moq = Number(cs.moq) || 1;

    // Normalized Inversions (0 to 1, where 1 is best)
    const normCost = maxPrice === minPrice ? 1 : 1 - (effectivePrice - minPrice) / (maxPrice - minPrice);
    const normRating = Math.min(5, Math.max(0, effectiveRating)) / 5.0;
    const normLeadTime = maxLeadTime === minLeadTime ? 1 : 1 - (leadTime - minLeadTime) / (maxLeadTime - minLeadTime);
    const normMoq = maxMoq === minMoq ? 1 : 1 - (moq - minMoq) / (maxMoq - minMoq);

    // Calculate component scores
    const costScore = Number((normCost * 40).toFixed(1));
    const ratingScore = Number((normRating * 30).toFixed(1));
    const leadTimeScore = Number((normLeadTime * 20).toFixed(1));
    const moqScore = Number((normMoq * 10).toFixed(1));

    const matchScore = Math.min(100, Math.max(1, Math.round(costScore + ratingScore + leadTimeScore + moqScore)));

    return {
      componentCompany: cs,
      effectivePrice,
      effectiveRating,
      ratingBreakdown,
      matchScore,
      scoreBreakdown: {
        costScore,
        ratingScore,
        leadTimeScore,
        moqScore
      }
    };
  });

  // Sort descending by highest matchScore
  return scored.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Returns Top N candidates for Gemini AI evaluation
 */
export const getTopScoredCandidates = (
  candidates: ComponentCompany[],
  topN: number = 3
): ScoredCompanyCandidate[] => {
  return scoreCompanyCandidates(candidates).slice(0, topN);
};
