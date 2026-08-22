import React, { useState } from 'react';
import { MultiSupplierPODraft, Supplier } from '../types';
import { Mail, MessageSquare, Check, X, ShieldAlert, Sparkles, ArrowRight, Rocket, Building2 } from 'lucide-react';
import { generateProcurementEmailBodyWithGemini } from '../services/geminiService';

interface Props {
  drafts: MultiSupplierPODraft[];
  type: 'PO' | 'RFQ';
  onClose: () => void;
  onConfirmAll: (drafts: MultiSupplierPODraft[], type: 'PO' | 'RFQ') => Promise<void>;
  onOpenWebmail?: (supplier: Supplier, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
}

export const MultiVendorDispatchModal: React.FC<Props> = ({
  drafts,
  type,
  onClose,
  onConfirmAll,
  onOpenWebmail
}) => {
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, 'webmail' | 'whatsapp'>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);

  const handleDispatchVendorWebmail = async (draft: MultiSupplierPODraft) => {
    setLoadingVendorId(draft.supplier.id);
    try {
      const orderNum = `${type}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const itemsList = draft.items.map(i => ({
        name: i.catalogItem.name,
        qty: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price
      }));

      const { subject, body } = await generateProcurementEmailBodyWithGemini(
        orderNum,
        type,
        draft.supplier.name,
        draft.supplier.contact_person || '',
        draft.total_amount,
        itemsList
      );

      if (onOpenWebmail) {
        onOpenWebmail(
          draft.supplier,
          subject,
          body,
          draft.total_amount,
          'CATALOG_BOM',
          'ORDERED'
        );
      }

      setDispatchedMap(prev => ({ ...prev, [draft.supplier.id]: 'webmail' }));
      onClose();
    } catch (e) {
      console.error('Webmail dispatch error:', e);
    } finally {
      setLoadingVendorId(null);
    }
  };

  const handleDispatchVendorWhatsApp = (draft: MultiSupplierPODraft) => {
    const phone = draft.supplier.whatsapp || draft.supplier.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const orderNum = `${type}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsText = draft.items
      .map(i => `• *${i.catalogItem.name}*: ${i.quantity} ${i.catalogItem.uom || 'Pcs'} @ ₹${i.unit_price} = ₹${i.total_price}`)
      .join('\n');

    const waText = `*COSMOCNERGY PROCUREMENT* 🚀\n----------------------------------------\n📄 *${type}:* ${orderNum}\n🏢 *Vendor:* ${draft.supplier.name}\n\n📦 *ITEMS:*\n${itemsText}\n\n💰 *TOTAL:* ₹${Number(draft.total_amount).toLocaleString('en-IN')}`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;

    window.open(waUrl, '_blank');
    setDispatchedMap(prev => ({ ...prev, [draft.supplier.id]: 'whatsapp' }));
  };

  const handleFinishAll = async () => {
    setIsProcessing(true);
    try {
      await onConfirmAll(drafts, type);
      onClose();
    } catch (e) {
      console.error('Finish all failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#FDF6E3] w-full max-w-4xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-5 my-8 text-[#073642]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#073642]">Multi-Vendor Dispatch Workspace</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {drafts.length} Vendors
                </span>
              </div>
              <p className="text-xs text-[#586E75]">
                Review and dispatch individual vendor purchase orders via internal Webmail or WhatsApp
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Cards List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {drafts.map((draft, idx) => {
            const isDispatched = Boolean(dispatchedMap[draft.supplier.id]);

            return (
              <div
                key={draft.supplier.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDispatched ? 'bg-emerald-50/70 border-emerald-300' : 'bg-[#EEE8D5]/70 border-[#D6D1B1]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D1B1]/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#073642]">{draft.supplier.name}</h4>
                      <p className="text-[11px] text-[#586E75]">
                        {draft.supplier.email} • {draft.items.length} items • <strong className="text-emerald-800 font-mono">₹{draft.total_amount.toLocaleString('en-IN')}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDispatchVendorWebmail(draft)}
                      disabled={loadingVendorId === draft.supplier.id}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open in Webmail</span>
                    </button>

                    <button
                      onClick={() => handleDispatchVendorWhatsApp(draft)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] font-bold text-xs border border-[#D6D1B1] shadow-xs active:scale-95 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {draft.items.map((it, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#FDF6E3] border border-[#D6D1B1] text-[10px] text-[#073642] font-medium"
                    >
                      {it.catalogItem.name} (x{it.quantity} @ ₹{it.unit_price})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D6D1B1]/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
          >
            Cancel
          </button>

          <button
            onClick={handleFinishAll}
            disabled={isProcessing}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {isProcessing ? 'Confirming...' : 'Confirm All Dispatches & Log Orders'}
          </button>
        </div>
      </div>
    </div>
  );
};
