import React, { useState } from 'react';
import { CatalogItem, Supplier, MultiSupplierPODraft } from '../types';
import { parseProcurementWithGemini } from '../services/geminiService';
import { Sparkles, Mic, Image, Send, RefreshCw, CheckCircle2, ArrowRight, Bot } from 'lucide-react';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<
    { itemName: string; quantity: number; matchedCatalogId?: string; estimatedPrice: number }[]
  >([]);

  // Voice recording simulation / Web Speech API
  const handleVoiceRecord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setTextPrompt('Order 16 units of 3.2V 100Ah LFP Cells and 1 unit 16S Smart BMS for Pack Assembly');
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [aiError, setAiError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!textPrompt && !imagePreview) return;
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const results = await parseProcurementWithGemini(textPrompt, catalog, imagePreview || undefined);
      if (!results || results.length === 0) {
        throw new Error('AI Parsing Error: Unable to extract line items from provided payload.');
      }
      setParsedItems(results);
    } catch (e: any) {
      console.error('AI Analysis error:', e);
      setAiError(e.message || 'AI Parsing Error: Failed to process document image. Please ensure file contains legible text.');
      setParsedItems([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertToOrder = () => {
    if (parsedItems.length === 0) return;

    const supplierMap = new Map<string, MultiSupplierPODraft>();

    parsedItems.forEach(pi => {
      const matchedCatalog = catalog.find(c => c.id === pi.matchedCatalogId) || catalog[0];
      const supplier = suppliers.find(s => s.id === matchedCatalog.supplier_id) || suppliers[0];

      if (!supplierMap.has(supplier.id)) {
        supplierMap.set(supplier.id, {
          supplier,
          items: [],
          total_amount: 0
        });
      }

      const draft = supplierMap.get(supplier.id)!;
      const total_price = pi.quantity * pi.estimatedPrice;
      draft.items.push({
        catalogItem: matchedCatalog,
        quantity: pi.quantity,
        unit_price: pi.estimatedPrice,
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
              Speak or upload paper invoices/notes — Gemini extracts items and drafts 1-tap POs.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 self-start md:self-auto">
          Gemini Multimodal Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Panel: Voice / Photo / Text */}
        <div className="glass-card bg-[#FDF6E3] p-6 rounded-2xl space-y-5 border border-[#D6D1B1] text-[#073642] shadow-sm">
          <h3 className="text-base font-bold text-[#073642] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>1. Capture Input (Voice, Photo, or Text)</span>
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
            <div className="relative rounded-xl overflow-hidden border border-[#D6D1B1] max-h-48">
              <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* AI Parsing Explicit Error Alert Banner */}
          {aiError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold flex items-start gap-2.5">
              <span className="text-base font-bold">⚠️</span>
              <div className="space-y-0.5">
                <span className="font-bold block">AI Parsing Failed</span>
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
              placeholder="e.g. Speak or type: 'Order 32 units 3.2V cells and 2 BMS boards for Pack Production'"
              className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl p-3 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 resize-none font-medium placeholder-[#586E75]"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!textPrompt && !imagePreview)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Gemini Analyzing Input...</span>
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
            <h3 className="text-base font-bold text-[#073642] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>2. AI Extracted Procurement Line Items</span>
              </span>
              <span className="text-xs font-semibold text-[#586E75]">{parsedItems.length} items parsed</span>
            </h3>

            {parsedItems.length === 0 ? (
              <div className="h-56 rounded-xl border border-dashed border-[#D6D1B1] flex flex-col items-center justify-center p-6 text-center text-[#586E75] space-y-2 bg-[#EEE8D5]/50">
                <Bot className="w-8 h-8 text-[#93A1A1]" />
                <p className="text-xs font-semibold">No items extracted yet.</p>
                <p className="text-[11px] text-[#586E75] max-w-xs">
                  Record a voice note or upload a photo of a paper list to generate 1-tap PO line items.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#073642]">{item.itemName}</div>
                      <div className="text-[#586E75] font-mono text-[11px]">
                        Catalog Matched | Est: ₹{item.estimatedPrice.toLocaleString('en-IN')}/unit
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-xs">
                        Qty: {item.quantity}
                      </span>
                      <div className="text-emerald-800 font-bold font-mono mt-1">
                        ₹{(item.quantity * item.estimatedPrice).toLocaleString('en-IN')}
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 active:scale-95"
          >
            <span>Convert AI Draft to Live Procurement Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
