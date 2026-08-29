import React, { useState, useEffect } from 'react';
import { CatalogItem, Company } from '../types';
import { ShoppingCart, X, Check, Building2, PackageCheck, Mail, MessageSquare, Send, Sparkles, FileText, ChevronDown, CheckCircle2 } from 'lucide-react';

interface Props {
  item: CatalogItem;
  quantity: number;
  company?: Company;
  onClose: () => void;
  onConfirm: (item: CatalogItem, qty: number) => Promise<void> | void;
  onOpenWebmail?: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onOpenWhatsApp?: (company: Company, context?: string) => void;
}

export const ReOrderConfirmationModal: React.FC<Props> = ({
  item,
  quantity,
  company,
  onClose,
  onConfirm,
  onOpenWebmail,
  onOpenWhatsApp
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'webmail' | 'whatsapp' | 'direct_po'>('webmail');
  const [isPlacing, setIsPlacing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('rfq');
  const [emailBody, setEmailBody] = useState<string>('');

  const totalPrice = quantity * Number(item.preset_price || 0);
  const companyName = company?.name || 'Company Vendor';

  // Dynamic Subject Line mapping
  const subjectOptions = [
    { key: 'rfq', label: `Request for Quotation (RFQ) - ${item.name}` },
    { key: 'po', label: `Purchase Order (PO) - ${item.name}` },
    { key: 'status', label: `Order Status Update & Inquiry - ${item.name}` },
    { key: 'urgent', label: `Urgent Price & Availability Request - ${item.name}` }
  ];

  // Dynamic Email Body Template generator based on selected Subject
  useEffect(() => {
    if (selectedSubjectKey === 'rfq') {
      setEmailBody(
`Dear ${companyName} Sales & Quotation Team,

We are seeking a formal Price Quotation and delivery lead time for the following component requirement:

• Component Name: ${item.name}
• Target Quantity: ${quantity} ${item.uom || 'Pcs'}
• Technical Specifications: ${item.specs || 'Standard industrial grade as per product catalog'}
• Delivery Location: Pune Battery Plant, Maharashtra, India

Please provide your best commercial quotation, GST breakdown (HSN/SAC), and minimum delivery lead time at your earliest convenience.

Best regards,
Procurement Officer
Cosmo Cnergy / Datlion Cnergy Enterprise`
      );
    } else if (selectedSubjectKey === 'po') {
      setEmailBody(
`Dear ${companyName} Orders & Dispatch Team,

Please accept this formal Purchase Order for the following component:

• Component Name: ${item.name}
• Order Quantity: ${quantity} ${item.uom || 'Pcs'}
• Unit Rate: ₹${Number(item.preset_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• Total Order Value: ₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
• Delivery Destination: Pune Plant, Maharashtra

Kindly acknowledge receipt of this PO and confirm the scheduled dispatch date within 24 hours.

Best regards,
Procurement Team
Cosmo Cnergy`
      );
    } else if (selectedSubjectKey === 'status') {
      setEmailBody(
`Dear ${companyName} Support & Logistics Team,

We are following up on the current production and dispatch status for:
• Component: ${item.name}
• Target Quantity: ${quantity} ${item.uom || 'Pcs'}

Please provide an update regarding tracking details and the expected delivery date at Pune Plant.

Best regards,
Cosmo Cnergy Procurement`
      );
    } else {
      setEmailBody(
`Dear ${companyName} Team,

We have an urgent procurement inquiry regarding stock availability and best pricing for:
• Component: ${item.name}
• Required Volume: ${quantity} ${item.uom || 'Pcs'}

Please advise current ex-stock availability and dispatch turnaround time.

Best regards,
Cosmo Cnergy Procurement Team`
      );
    }
  }, [selectedSubjectKey, item.name, item.specs, item.uom, item.preset_price, quantity, companyName, totalPrice]);

  const handleExecuteDispatch = async () => {
    setIsPlacing(true);
    try {
      if (selectedChannel === 'direct_po') {
        await onConfirm(item, quantity);
        setIsSuccess(true);
      } else if (selectedChannel === 'webmail') {
        const activeSubject = subjectOptions.find(o => o.key === selectedSubjectKey)?.label || `Procurement: ${item.name}`;
        const targetCompany = company || {
          id: 'supp-gen',
          name: companyName,
          contact_person: 'Sales Dept',
          email: 'sales@vendor.com',
          phone: '+91 98765 43210'
        };

        if (onOpenWebmail) {
          onOpenWebmail(
            targetCompany,
            activeSubject,
            emailBody,
            totalPrice,
            'CATALOG_BOM',
            'ORDERED'
          );
        }
        await onConfirm(item, quantity);
        onClose();
        return;
      } else if (selectedChannel === 'whatsapp') {
        const rawPhone = company?.whatsapp || company?.phone || '';
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

        const waText = `*CosmoCnergy Procurement Inquiry*\n\nHello ${companyName},\nWe would like to request an order / quotation for:\n• *Item:* ${item.name}\n• *Qty:* ${quantity} ${item.uom || 'Pcs'}\n• *Specs:* ${item.specs || 'Standard'}\n\nPlease confirm availability and price. Thank you!`;
        const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(waText)}`;
        window.open(waUrl, '_blank');

        await onConfirm(item, quantity);
        setIsSuccess(true);
      }
    } catch (e) {
      console.error('Failed to execute reorder:', e);
    } finally {
      setIsPlacing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-8 border border-[#D6D1B1] shadow-2xl space-y-6 text-center my-8 animate-in fade-in zoom-in-95 duration-150 text-[#073642]">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-[#073642]">Order created successfully</h3>
            <p className="text-xs text-[#586E75]">
              Procurement order for <strong className="text-[#073642]">{item.name}</strong> ({quantity} {item.uom || 'Pcs'}) has been logged with <strong className="text-[#073642]">{companyName}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2 text-xs text-left">
            <div className="flex items-center justify-between text-[#586E75]">
              <span>Total Value:</span>
              <span className="font-mono font-bold text-emerald-800">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-[#586E75]">
              <span>Channel:</span>
              <span className="font-bold text-[#073642] uppercase">{selectedChannel.replace('_', ' ')}</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              Done & Return to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#FDF6E3] w-full max-w-xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 my-8 text-[#073642]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#073642]">1-Tap Component Reorder</h3>
              <p className="text-xs text-[#586E75]">
                Target Vendor: <strong className="text-[#073642]">{companyName}</strong>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Summary Card */}
        <div className="p-4 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#073642] text-sm">{item.name}</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[#586E75] text-[11px] pt-1 border-t border-[#D6D1B1]/60">
            <div>
              Order Volume: <strong className="text-[#073642]">{quantity} {item.uom || 'Pcs'}</strong>
            </div>
            <div>
              Unit Price: <strong className="text-[#073642]">₹{Number(item.preset_price || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#073642] uppercase tracking-wider">
            Select Dispatch Channel:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedChannel('webmail')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                selectedChannel === 'webmail'
                  ? 'bg-emerald-600 text-white shadow-md border-emerald-500'
                  : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7] border-[#D6D1B1]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Webmail</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChannel('whatsapp')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                selectedChannel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-md border-emerald-500'
                  : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7] border-[#D6D1B1]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChannel('direct_po')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                selectedChannel === 'direct_po'
                  ? 'bg-purple-600 text-white shadow-md border-purple-500'
                  : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7] border-[#D6D1B1]'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Direct PO</span>
            </button>
          </div>
        </div>

        {/* Webmail Subject Line & Email Body */}
        {selectedChannel === 'webmail' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#073642] mb-1">
                Select Procurement Intent / Subject:
              </label>
              <select
                value={selectedSubjectKey}
                onChange={e => setSelectedSubjectKey(e.target.value)}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] font-semibold focus:outline-none focus:border-emerald-500"
              >
                {subjectOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#073642] mb-1">
                Draft Email Body:
              </label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl p-3 text-xs text-[#073642] font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* WhatsApp Preview */}
        {selectedChannel === 'whatsapp' && (
          <div className="p-4 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Target WhatsApp Contact: {company?.phone || '+91 98765 43210'}</span>
            </div>
            <p className="text-[#586E75] leading-relaxed">
              Clicking dispatch will open an official WhatsApp chat pre-filled with the component particulars ({item.name}, Qty: {quantity} {item.uom || 'Pcs'}) and request immediate commercial confirmation.
            </p>
          </div>
        )}

        {/* Direct PO Info */}
        {selectedChannel === 'direct_po' && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-purple-800">
              <PackageCheck className="w-4 h-4 text-purple-600" />
              <span>Instant Purchase Order Creation</span>
            </div>
            <p className="text-[#586E75] leading-relaxed">
              Instantly registers a new Purchase Order in the Orders Timeline and marks the status as <strong>ORDERED</strong> without external email dispatch.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7] transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPlacing}
            onClick={handleExecuteDispatch}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {selectedChannel === 'webmail'
                ? 'Dispatch via Webmail'
                : selectedChannel === 'whatsapp'
                ? 'Launch WhatsApp Dispatch'
                : (isPlacing ? 'Placing PO...' : 'Confirm & Place PO')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
