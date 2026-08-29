import React from 'react';
import { Mail, MessageSquare, CheckCircle, X } from 'lucide-react';
import { ProcurementOrder, Company } from '../types';

interface Props {
  order: ProcurementOrder;
  onClose: () => void;
  onOpenWebmail?: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
}

export const ChannelChoiceModal: React.FC<Props> = ({ order, onClose, onOpenWebmail }) => {
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'CosmoCnergy Procurement Ltd.';
  const subject = `[${order.type}] ${order.order_number} - ${companyName}`;

  const itemsListText = (order.items || [])
    .map(i => `- ${i.item?.name || 'Item'}: ${i.quantity} ${i.item?.uom || 'Pcs'} @ ₹${i.unit_price}/unit = ₹${i.total_price}`)
    .join('\n');

  const emailBody = `Dear ${order.company?.contact_person || order.company?.name || 'Company'},\n\nPlease find order details below:\n\nOrder Number: ${order.order_number}\nDate: ${new Date(order.created_at).toLocaleDateString('en-IN')}\n\nItems:\n${itemsListText}\n\nTotal Amount: ₹${Number(order.total_amount).toLocaleString('en-IN')}\n\nNotes: ${order.notes || 'Please confirm receipt.'}\n\nBest regards,\n${order.created_by}\n${companyName}`;

  const handleSendWebmail = () => {
    if (onOpenWebmail && order.company) {
      onOpenWebmail(
        order.company,
        subject,
        emailBody,
        order.total_amount,
        'CATALOG_BOM',
        order.status
      );
    }
    onClose();
  };

  const handleSendWhatsApp = () => {
    const phone = order.company?.whatsapp || order.company?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waText = `*${companyName}*\n📄 *${order.type}:* ${order.order_number}\n🏢 *Vendor:* ${order.company?.name}\n💰 *Total:* ₹${Number(order.total_amount).toLocaleString('en-IN')}\n\n📦 *Items:*\n${itemsListText}`;
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`
      : `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl border border-[#D6D1B1] shadow-2xl p-6 relative text-[#073642]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#586E75] hover:text-[#073642] p-1 rounded-full bg-[#EEE8D5]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 shadow-md shadow-emerald-500/20">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#073642]">Order Created Successfully!</h3>
          <p className="text-xs text-[#586E75]">
            Order <span className="font-mono font-bold text-emerald-800">{order.order_number}</span> is logged. Choose how you would like to transmit it to <span className="text-[#073642] font-semibold">{order.company?.name}</span>:
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSendWebmail}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Send via Webmail</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full uppercase font-bold">Internal</span>
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-emerald-800 font-bold text-sm border border-[#D6D1B1] active:scale-95 transition-all group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-600" />
              <span>Send via WhatsApp</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-bold border border-emerald-300">Deep Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
