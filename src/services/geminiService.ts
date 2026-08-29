import { GoogleGenAI } from '@google/genai';
import { CatalogItem } from '../types';

export interface ParsedProcurementItem {
  itemName: string;
  quantity: number;
  matchedCatalogId?: string;
  estimatedPrice: number;
  specs?: string;
  category?: string;
}

export const getGeminiApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('cosmo_gemini_api_key');
    if (localKey && localKey.trim()) return localKey.trim();
  }
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  );
};

export const setStoredGeminiApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem('cosmo_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('cosmo_gemini_api_key');
    }
  }
};

/**
 * Multimodal Gemini Parser for Product Photos, Technical Specs, Handwritten BOMs, and Voice Notes.
 */
export const parseProcurementWithGemini = async (
  inputPrompt: string,
  catalog: CatalogItem[],
  imageBase64?: string,
  imageMimeType: string = 'image/jpeg'
): Promise<ParsedProcurementItem[]> => {
  const apiKey = getGeminiApiKey();

  // If no API Key is provided, check if image was uploaded or provide dynamic heuristic
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    if (imageBase64) {
      throw new Error(
        'Gemini Vision API Key Required: Please provide a Gemini API Key in the Studio Key Config or .env.local to analyze product photos and schematics.'
      );
    }
    // Perform dynamic rule-based battery sizing parser if prompt text is given
    return dynamicHeuristicParse(inputPrompt, catalog);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Prepare catalog summary to allow Gemini to link with real inventory IDs
    const catalogSummary = catalog
      .map(
        c =>
          `- ID: "${c.id}" | Name: "${c.name}" | Specs: "${c.specs || 'N/A'}" | Category: "${c.category || 'General'}" | Rate: ₹${c.preset_price || 0}`
      )
      .join('\n');

    const promptText = `You are the Lead Multimodal AI Procurement & Battery Systems Engineer for CosmoCnergy.

MISSION:
Inspect the provided image (e.g. battery pack, raw cells, BMS, technical spec sheet, invoice, handwritten bill, or whiteboard BOM) and/or text instructions.
Deconstruct the target product into its complete Bill of Materials (BOM) components required for manufacturing or procurement.

ENGINEERING DOMAIN GUIDELINES FOR BATTERY & ENERGY SYSTEMS:
1. Voltage & Capacity Deconstruction:
   - 12V (Nominal 12.8V) LFP Pack: 4 Cells in series (4S). Capacity matches cell capacity (e.g. 100Ah = 4x 3.2V 100Ah cells). BMS: 4S (matching current e.g. 100A). Busbars: 3 pcs.
   - 24V (Nominal 25.6V) LFP Pack: 8 Cells in series (8S). BMS: 8S. Busbars: 7 pcs.
   - 36V (Nominal 38.4V) LFP Pack: 12 Cells in series (12S). BMS: 12S. Busbars: 11 pcs.
   - 48V (Nominal 51.2V) LFP Pack: 16 Cells in series (16S). BMS: 16S. Busbars: 15 pcs.
   - 60V / 72V EV Packs: 20S / 24S cells with matching BMS and interconnects.
2. Bill of Materials Components to Extract:
   - Primary Battery Cells (Prismatic / Cylindrical / Pouch with Ah rating).
   - Battery Management System (BMS with Series and Amperage specs).
   - Nickel / Copper Busbar Interconnects (Count = total series cells - 1).
   - Pack Enclosure / Casing (e.g. 12V 100Ah ABS Battery Box, 48V Server Rack Enclosure).
   - Heavy-duty Terminals & Connectors (M8 Terminals, Anderson SB50/120, Aviation Plugs).
   - Insulation Sheets / Epoxy Boards / Heat Shrink / Wiring Harness.
3. For Invoices / Quotations / General Hardware:
   - Extract EVERY row item with exact quantity and specifications.

INVENTORY MATCHING:
- Match each identified component against the available CosmoCnergy Catalog below.
- If an item matches an existing catalog entry, set "matchedCatalogId" to the catalog item's exact ID, and use its preset price as "estimatedPrice".
- If no catalog item matches, set "matchedCatalogId" to null, and estimate a realistic industrial market price in INR.

AVAILABLE COSMOCNERGY INVENTORY CATALOG:
${catalogSummary}

${inputPrompt ? `USER CONTEXT & TEXT NOTES:\n"${inputPrompt}"` : ''}

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects matching the schema:
[
  {
    "itemName": "string (clear descriptive component name)",
    "quantity": number (positive integer count),
    "matchedCatalogId": "string (valid catalog ID) or null",
    "estimatedPrice": number (unit price in INR),
    "specs": "string (detailed technical specification)",
    "category": "string (e.g. 'Battery Cells', 'BMS', 'Hardware', 'Enclosures')"
  }
]`;

    let cleanBase64 = '';
    let effectiveMime = imageMimeType || 'image/jpeg';

    if (imageBase64) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) {
        effectiveMime = match[1] || effectiveMime;
        cleanBase64 = match[2].trim();
      } else {
        cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
      }
    }

    const parts: any[] = [];

    if (cleanBase64 && cleanBase64.length > 20) {
      parts.push({
        inlineData: {
          mimeType: effectiveMime,
          data: cleanBase64
        }
      });
    }

    parts.push({
      text: promptText
    });

    console.log('[Gemini Multimodal] Dispatching generateContent request:', {
      models: ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
      hasImage: !!cleanBase64,
      mimeType: effectiveMime,
      imagePayloadSize: cleanBase64 ? `${Math.round(cleanBase64.length / 1024)} KB` : 'none'
    });

    let response: any = null;
    let lastError: any = null;
    const candidateModels = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini Multimodal] Querying model: ${model}`);
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts
            }
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        });

        if (response && response.text) {
          console.log(`[Gemini Multimodal] Success with model: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Multimodal] Model ${model} encountered error:`, err?.message || err);
        lastError = err;
        // If model not found or unavailable, try next candidate
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('404') || msg.includes('no longer available') || msg.includes('deprecated')) {
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to generate response from Gemini Multimodal API.');
    }

    const responseText = response.text || '';
    if (!responseText.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Gemini response format is invalid or returned no line items.');
    }

    // Enhance matched items with catalog verification
    return parsed.map((it: any) => {
      const matched = it.matchedCatalogId ? catalog.find(c => c.id === it.matchedCatalogId) : null;
      return {
        itemName: it.itemName || matched?.name || 'Industrial Component',
        quantity: Math.max(1, Number(it.quantity) || 1),
        matchedCatalogId: matched?.id || it.matchedCatalogId || undefined,
        estimatedPrice: Number(it.estimatedPrice) || matched?.preset_price || 500,
        specs: it.specs || matched?.specs || 'Industrial Grade',
        category: it.category || matched?.category || 'General'
      };
    });
  } catch (error: any) {
    console.error('Gemini Multimodal API Error:', error);
    // Explicitly bubble up the real error message rather than silently returning mock static data
    throw new Error(
      error?.message || 'Failed to communicate with Gemini Multimodal API. Please verify your API Key and image clarity.'
    );
  }
};

/**
 * Dynamic rule-based sizing calculator for battery systems and hardware when offline / without Gemini API key.
 * Analyzes exact voltage/Ah inputs rather than static presets.
 */
export const dynamicHeuristicParse = (
  inputPrompt: string,
  catalog: CatalogItem[]
): ParsedProcurementItem[] => {
  const text = inputPrompt.toLowerCase();
  const results: ParsedProcurementItem[] = [];

  // Extract Voltage (e.g. 12V, 24V, 48V, 72V)
  const voltMatch = text.match(/(\d{1,3})\s*v(?:olts?)?/i);
  const voltage = voltMatch ? parseInt(voltMatch[1], 10) : 12;

  // Extract Capacity in Ah (e.g. 100Ah, 200Ah, 50Ah)
  const ahMatch = text.match(/(\d{1,4})\s*ah/i);
  const capacityAh = ahMatch ? parseInt(ahMatch[1], 10) : 100;

  // Extract quantity multiplier
  const packQtyMatch = text.match(/(\d+)\s*(?:packs?|units?|sets?|batteries)/i);
  const packQty = packQtyMatch ? parseInt(packQtyMatch[1], 10) : 1;

  // Calculate series cell count based on LFP nominal cell voltage 3.2V
  let seriesCells = 4;
  if (voltage >= 60) seriesCells = 20;
  else if (voltage >= 48) seriesCells = 16;
  else if (voltage >= 36) seriesCells = 12;
  else if (voltage >= 24) seriesCells = 8;
  else seriesCells = 4;

  const totalCells = seriesCells * packQty;
  const busbarCount = Math.max(1, (seriesCells - 1) * packQty);

  // 1. Primary Battery Cells
  const matchingCell = catalog.find(
    c => c.name.toLowerCase().includes('cell') || c.category?.toLowerCase().includes('cell')
  );
  results.push({
    itemName: matchingCell ? matchingCell.name : `3.2V ${capacityAh}Ah Prismatic LFP Cell`,
    quantity: totalCells,
    matchedCatalogId: matchingCell?.id,
    estimatedPrice: matchingCell?.preset_price || 2850,
    specs: `3.2V ${capacityAh}Ah Grade A, 6000 Cycle Life`,
    category: 'Battery Cells'
  });

  // 2. Battery Management System (BMS)
  const matchingBms = catalog.find(
    c => c.name.toLowerCase().includes('bms') || c.category?.toLowerCase().includes('bms')
  );
  results.push({
    itemName: matchingBms ? matchingBms.name : `${seriesCells}S ${capacityAh}A Smart Bluetooth BMS`,
    quantity: packQty,
    matchedCatalogId: matchingBms?.id,
    estimatedPrice: matchingBms?.preset_price || (seriesCells >= 16 ? 4500 : 2200),
    specs: `${seriesCells}S ${voltage}V ${capacityAh}A Continuous with Temp Sensor`,
    category: 'BMS'
  });

  // 3. Copper Busbars
  const matchingBusbar = catalog.find(
    c => c.name.toLowerCase().includes('busbar') || c.category?.toLowerCase().includes('hardware')
  );
  results.push({
    itemName: matchingBusbar ? matchingBusbar.name : `Laser-cut Pure Copper Busbar (${capacityAh}Ah spacing)`,
    quantity: busbarCount,
    matchedCatalogId: matchingBusbar?.id,
    estimatedPrice: matchingBusbar?.preset_price || 85,
    specs: `Pure T2 Copper with Nickel Plating, M6/M8 mounting`,
    category: 'Hardware'
  });

  // 4. Battery Enclosure
  const matchingCase = catalog.find(
    c => c.name.toLowerCase().includes('case') || c.name.toLowerCase().includes('enclosure')
  );
  results.push({
    itemName: matchingCase ? matchingCase.name : `${voltage}V ${capacityAh}Ah Heavy-Duty ABS Battery Enclosure Box`,
    quantity: packQty,
    matchedCatalogId: matchingCase?.id,
    estimatedPrice: matchingCase?.preset_price || 1450,
    specs: `IP65 Weatherproof with Brass M8 Terminals`,
    category: 'Enclosures'
  });

  return results;
};

export const generateProcurementEmailBodyWithGemini = async (
  orderNumber: string,
  type: string,
  vendorName: string,
  contactPerson: string,
  totalAmount: number,
  items: { name: string; qty: number; unitPrice: number; totalPrice: number }[]
): Promise<{ subject: string; body: string }> => {
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'CosmoCnergy Procurement Ltd.';
  const defaultSubject =
    type === 'RFQ'
      ? `Request for Quotation (RFQ) - ${orderNumber} - ${companyName}`
      : `Purchase Order (PO) - ${orderNumber} - ${companyName}`;
  const itemsText = items
    .map(i => `- ${i.name}: ${i.qty} units @ ₹${i.unitPrice} = ₹${i.totalPrice}`)
    .join('\n');

  const fallbackBody = `Dear ${contactPerson || vendorName},\n\nPlease accept our ${type === 'RFQ' ? 'Request for Quotation' : 'Purchase Order'} ${orderNumber}.\n\nItems Requested:\n${itemsText}\n\nTotal Amount: ₹${Number(totalAmount).toLocaleString('en-IN')}\n\nPlease confirm availability and expected dispatch schedule at your earliest convenience.\n\nBest regards,\nProcurement Team\n${companyName}`;

  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return { subject: defaultSubject, body: fallbackBody };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an executive procurement manager at ${companyName}.
Draft a professional, courteous, concise, and business-ready procurement email for:
- Order Type: ${type === 'RFQ' ? 'Request for Quotation' : 'Purchase Order'}
- Order Number: ${orderNumber}
- Company: ${companyName} (Contact: ${contactPerson})
- Line Items:
${itemsText}
- Total Amount: ₹${Number(totalAmount).toLocaleString('en-IN')}

Respond ONLY in valid JSON format with keys "subject" and "body". Do not include markdown code block ticks.`;

    let responseText = '';
    const candidateModels = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Email] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!responseText) {
      return { subject: defaultSubject, body: fallbackBody };
    }

    const cleanJson = responseText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      subject: parsed.subject || defaultSubject,
      body: parsed.body || fallbackBody
    };
  } catch (err) {
    console.warn('Gemini email dispatch generation failed, using standard fallback:', err);
    return { subject: defaultSubject, body: fallbackBody };
  }
};

