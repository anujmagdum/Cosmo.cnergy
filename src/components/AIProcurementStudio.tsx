import React, { useState, useEffect } from 'react';
import { CatalogItem, Supplier, MultiSupplierPODraft } from '../types';
import {
  parseProcurementWithGemini,
  getGeminiApiKey,
  setStoredGeminiApiKey,
  ParsedProcurementItem
} from '../services/geminiService';
import {
  Sparkles,
  Mic,
  Image,
  Send,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Bot,
  Key,
  Layers,
  Tag,
  AlertTriangle
} from 'lucide-react';

interface Props {
  catalog: CatalogItem[];
  suppliers: Supplier[];
  onGenerateOrderFromAI: (drafts: MultiSupplierPODraft[]) => void;
}

export const AIProcurementStudio: React.FC<Props> = ({
  catalog,
  suppliers,
  onGenerateOrderFromAI
}) => {
  const [textPrompt, setTextPrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedProcurementItem[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Gemini API Key management
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());
  const [isKeyConfigOpen, setIsKeyConfigOpen] = useState(false);
  const [isKeyActive, setIsKeyActive] = useState(() => !!getGeminiApiKey());

  useEffect(() => {
    setIsKeyActive(!!getGeminiApiKey());
  }, []);

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(apiKeyInput);
    setIsKeyActive(!!apiKeyInput.trim());
    setIsKeyConfigOpen(false);
  };

  // Voice recording simulation / Web Speech API
  const handleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setTextPrompt('Order 16 units of 3.2V 100Ah LFP Cells, 1 unit 16S 100A Smart BMS, and 15 pure copper busbars for Battery Pack Assembly');
      return;
    }

    setIsRecording(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTextPrompt(transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMimeType(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!textPrompt.trim() && !imagePreview) {
      setAiError('Please enter a description, record a voice note, or upload a product photo.');
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const results = await parseProcurementWithGemini(
        textPrompt.trim(),
        catalog,
        imagePreview || undefined,
        imageMimeType
      );
      if (!results || results.length === 0) {
        throw new Error('No components could be extracted from the provided input.');
      }
      setParsedItems(results);
    } catch (e: any) {
      console.error('AI Analysis error:', e);
      setAiError(e.message || 'AI Parsing Error: Failed to process document/image with Gemini.');
      setParsedItems([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertToOrder = () => {
    if (parsedItems.length === 0) return;

    const supplierMap = new Map<string, MultiSupplierPODraft>();

    parsedItems.forEach(pi => {
      const matchedCatalog =
        (pi.matchedCatalogId ? catalog.find(c => c.id === pi.matchedCatalogId) : null) ||
        catalog.find(c => c.name.toLowerCase().includes(pi.itemName.toLowerCase())) ||
        catalog[0] || {
          id: `cat-ai-${Date.now()}`,
          name: pi.itemName,
          specs: pi.specs || 'Extracted via Gemini Vision',
          preset_price: pi.estimatedPrice,
          uom: 'Pcs',
          supplier_id: suppliers[0]?.id || 'supp-1'
        };

      const supplier =
        suppliers.find(s => s.id === matchedCatalog.supplier_id) ||
        suppliers[0] || {
          id: 'supp-1',
          name: 'General Industrial Supplier',
          contact_person: 'Sales Dept',
          email: 'sales@supplier.com',
          phone: '+91 98765 43210'
        };

      if (!supplierMap.has(supplier.id)) {
        supplierMap.set(supplier.id, {
          supplier,
          items: [],
          total_amount: 0
        });
      }

      const draft = supplierMap.get(supplier.id)!;
      const unitPrice = pi.estimatedPrice || matchedCatalog.preset_price || 100;
      const total_price = pi.quantity * unitPrice;
      draft.items.push({
        catalogItem: matchedCatalog,
        quantity: pi.quantity,
        unit_price: unitPrice,
        total_price
      });
      draft.total_amount += total_price;
    });

    onGenerateOrderFromAI(Array.from(supplierMap.values()));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Studio Header */}
      <div className="glass-panel p-6 rounded-3xl bg-[#0B192C] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-black fill-black" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>Gemini AI Photo & Voice Procurement Studio</span>
            </h2>
            <p className="text-sm text-slate-300">
              Upload product photos, schematics, or voice notes — Gemini extracts items and drafts 1-tap POs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsKeyConfigOpen(!isKeyConfigOpen)}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
              isKeyActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isKeyActive ? '🟢 Gemini 3.6 Active' : '🔑 Set Gemini API Key'}</span>
          </button>
        </div>
      </div>

      {/* API Key Configuration Drawer */}
      {isKeyConfigOpen && (
        <div className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-2xl p-4 shadow-md animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>Gemini API Key Configuration</span>
            </h4>
            <span className="text-[11px] text-[#586E75]">Supports Google AI Studio API Keys</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Paste your AI Studio GEMINI_API_KEY (AIzaSy...)"
              className="flex-1 bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3.5 py-2 text-xs font-mono text-[#073642] focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Save Key
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Panel: Voice / Photo / Text */}
        <div className="glass-card bg-[#FDF6E3] p-6 rounded-2xl space-y-5 border border-[#D6D1B1] text-[#073642] shadow-sm">
          <h3 className="text-base font-bold text-[#073642] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>1. Capture Input (Photo, Voice, or Text)</span>
          </h3>

          {/* Quick Voice & Photo Trigger Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleVoiceRecord}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all ${
                isRecording
                  ? 'bg-red-50 border-red-500 text-red-600 animate-pulse'
                  : 'bg-[#EEE8D5] hover:bg-[#E4DDC7] border-[#D6D1B1] text-[#073642]'
              }`}
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'text-red-600' : 'text-emerald-600'}`} />
              <span>{isRecording ? 'Listening...' : 'Record Voice Note'}</span>
            </button>

            <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-[#EEE8D5] hover:bg-[#E4DDC7] border border-[#D6D1B1] text-[#073642] cursor-pointer transition-all">
              <Image className="w-4 h-4 text-emerald-600" />
              <span>Upload Photo/Note</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-[#D6D1B1] max-h-56 bg-slate-950/5">
              <img src={imagePreview} alt="Upload preview" className="w-full h-48 object-contain" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full p-1 text-xs transition-all"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          )}

          {/* AI Parsing Explicit Error Alert Banner */}
          {aiError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">AI Multimodal Parsing Error</span>
                <span className="text-red-800 text-[11px] leading-relaxed">{aiError}</span>
              </div>
            </div>
          )}

          {/* Text Area */}
          <div>
            <textarea
              rows={4}
              value={textPrompt}
              onChange={e => setTextPrompt(e.target.value)}
              placeholder="e.g. Speak or type: '12V 100Ah LFP Battery Pack assembly with 100A smart BMS' or describe product photo details..."
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl p-3 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 resize-none font-medium placeholder-[#586E75]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!textPrompt.trim() && !imagePreview)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Gemini 2.5 Flash Analyzing Multimodal Input...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white text-white" />
                <span>Parse Input with Gemini AI</span>
              </>
            )}
          </button>
        </div>

        {/* Output Panel: Extracted Items & Order Conversion */}
        <div className="glass-card bg-[#FDF6E3] p-6 rounded-2xl space-y-5 border border-[#D6D1B1] flex flex-col justify-between text-[#073642] shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#073642] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>2. Extracted BOM Line Items</span>
              </h3>
              <span className="text-xs font-semibold text-[#586E75]">{parsedItems.length} items parsed</span>
            </div>

            {parsedItems.length === 0 ? (
              <div className="h-64 rounded-xl border border-dashed border-[#D6D1B1] flex flex-col items-center justify-center p-6 text-center text-[#586E75] space-y-2 bg-[#EEE8D5]/50">
                <Bot className="w-10 h-10 text-[#93A1A1]" />
                <p className="text-xs font-semibold text-[#073642]">No components extracted yet.</p>
                <p className="text-[11px] text-[#586E75] max-w-xs">
                  Upload a photo of a battery pack, schematic, paper invoice, or enter specifications above to generate 1-tap PO drafts.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#073642] text-sm">{item.itemName}</span>
                        {item.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {item.category}
                          </span>
                        )}
                        {item.matchedCatalogId ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            ✓ Catalog Linked
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                            New Spec
                          </span>
                        )}
                      </div>
                      {item.specs && (
                        <p className="text-[#586E75] text-[11px] truncate font-medium">
                          {item.specs}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-xs shadow-2xs font-mono">
                        Qty: {item.quantity}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-[#586E75] block">₹{item.estimatedPrice.toLocaleString('en-IN')}/unit</span>
                        <div className="text-emerald-800 font-extrabold font-mono text-sm">
                          ₹{(item.quantity * item.estimatedPrice).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleConvertToOrder}
            disabled={parsedItems.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 active:scale-95 cursor-pointer"
          >
            <span>Convert AI Draft to Live Procurement Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

