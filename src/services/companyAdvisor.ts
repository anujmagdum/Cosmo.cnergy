import { GoogleGenAI } from '@google/genai';
import { CatalogItem } from '../types';
import { ScoredCompanyCandidate } from '../lib/scoring';
import { getGeminiApiKey } from './geminiService';

export interface CompanyRecommendationResult {
  winning_company_id: string;
  badge: string;
  reasoning: string;
  candidateScores: Record<string, number>;
  source: 'gemini-3.6-flash' | 'gemini-fallback' | 'deterministic-heuristic';
}

/**
 * Gemini 3.6 Flash Company Advisor Service
 * Evaluates component specs, RFQ quoted prices, multi-platform review summaries, and delivery metrics.
 */
export const adviseBestCompany = async (
  component: CatalogItem,
  topCandidates: ScoredCompanyCandidate[]
): Promise<CompanyRecommendationResult> => {
  if (!topCandidates || topCandidates.length === 0) {
    throw new Error('No company candidates available for evaluation.');
  }

  // If only 1 candidate, return immediately with clear badge
  if (topCandidates.length === 1) {
    const single = topCandidates[0];
    return {
      winning_company_id: single.componentCompany.company_id,
      badge: 'Exclusive Qualified Vendor',
      reasoning: `Sole verified vendor supplying ${component.name} with a calculated match score of ${single.matchScore}/100.`,
      candidateScores: { [single.componentCompany.company_id]: single.matchScore },
      source: 'deterministic-heuristic'
    };
  }

  const apiKey = getGeminiApiKey();

  // If no Gemini API key configured, use deterministic heuristic recommendation
  if (!apiKey) {
    console.warn('[CompanyAdvisor] No Gemini API key provided. Using multi-criteria mathematical winner.');
    const topScored = topCandidates[0];
    return {
      winning_company_id: topScored.componentCompany.company_id,
      badge: 'Best Value by RFQ & Rating',
      reasoning: `${topScored.componentCompany.company?.name || 'Top Vendor'} ranked #1 with ${topScored.matchScore}/100 baseline match, quoting ₹${topScored.effectivePrice.toLocaleString('en-IN')}.`,
      candidateScores: Object.fromEntries(topCandidates.map(c => [c.componentCompany.company_id, c.matchScore])),
      source: 'deterministic-heuristic'
    };
  }

  const promptCandidates = topCandidates.map((c, idx) => ({
    candidateIndex: idx + 1,
    companyId: c.componentCompany.company_id,
    companyName: c.componentCompany.company?.name || `Company ${idx + 1}`,
    vendorPartNumber: c.componentCompany.part_number_vendor || 'OEM Spec',
    rfqQuotedPrice: c.componentCompany.rfq_quoted_price || c.componentCompany.unit_price,
    catalogUnitPrice: c.componentCompany.unit_price,
    moq: c.componentCompany.moq,
    leadTimeDays: c.componentCompany.lead_time_days,
    ratingOverall: c.effectiveRating,
    ratingBreakdown: c.ratingBreakdown,
    unstructuredReviews: c.componentCompany.review_summary || 'Positive industrial feedback for quality and on-spec delivery.',
    matchScore: c.matchScore
  }));

  const systemInstruction = `
You are the Chief Procurement AI Advisor for CosmoCnergy Industrial Electronics & Battery Systems.
Your task is to analyze candidate companies for a critical component and recommend the WINNING company.

EVALUATION CRITERIA:
1. RFQ Quoted Price (Primary Value Driver): Compare vendor quoted prices against component budget and quality.
2. Verified Rating & Review Summaries: Gauge build quality, warranty adherence, and customer trust across IndiaMART, Google Maps, and Amazon.
3. Batch MOQ & Lead Time: Balance working capital risk against delivery commitments.

BADGE SELECTION GUIDELINES:
Choose one crisp, professional badge:
- "Best Overall Value"
- "Lowest Quoted Price"
- "Spec Match Winner"
- "Top Rated Partner"
- "Lowest MOQ Trial Winner"
(Do NOT use "Fastest Dispatch" as per procurement policy).

OUTPUT FORMAT:
Respond with strictly valid JSON only:
{
  "winning_company_id": "<UUID string of the winning candidate>",
  "badge": "<Selected Crisp Badge>",
  "reasoning": "<1 to 2 sentence executive rationale explaining why this company was chosen>"
}
`;

  const userPrompt = `
Component Specs:
- Name: ${component.name}
- Category: ${component.category || 'Industrial Raw Material'}
- Specifications: ${component.specs || 'Standard industrial specifications'}
- Target Stock Threshold: ${component.min_order_qty || 10} ${component.uom || 'Pcs'}

Top Candidates under evaluation:
${JSON.stringify(promptCandidates, null, 2)}
`;

  // Fallback cascade: gemini-3.6-flash -> gemini-2.0-flash -> gemini-1.5-flash
  const models = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const ai = new GoogleGenAI({ apiKey });

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const responseText = response.text ? response.text.trim() : '';
      if (!responseText) continue;

      const parsed = JSON.parse(responseText);
      if (parsed && parsed.winning_company_id) {
        return {
          winning_company_id: parsed.winning_company_id,
          badge: parsed.badge || 'Best Overall Value',
          reasoning: parsed.reasoning || 'Selected as the optimal procurement partner based on RFQ pricing and multi-platform review metrics.',
          candidateScores: Object.fromEntries(topCandidates.map(c => [c.componentCompany.company_id, c.matchScore])),
          source: model === 'gemini-3.6-flash' ? 'gemini-3.6-flash' : 'gemini-fallback'
        };
      }
    } catch (err: any) {
      console.warn(`[CompanyAdvisor] Model ${model} evaluation failed:`, err?.message || err);
    }
  }

  // Fallback to top scored candidate if all Gemini models fail
  const fallbackWinner = topCandidates[0];
  return {
    winning_company_id: fallbackWinner.componentCompany.company_id,
    badge: 'Best Overall Value',
    reasoning: `${fallbackWinner.componentCompany.company?.name || 'Selected Vendor'} achieved the highest multi-criteria score (${fallbackWinner.matchScore}/100) combining RFQ pricing and verified ratings.`,
    candidateScores: Object.fromEntries(topCandidates.map(c => [c.componentCompany.company_id, c.matchScore])),
    source: 'deterministic-heuristic'
  };
};
