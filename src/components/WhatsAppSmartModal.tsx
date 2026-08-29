import React, { useState } from 'react';
import { Company } from '../types';
import { MessageSquare, X, PhoneCall, Check } from 'lucide-react';

interface Props {
  company: Company;
  itemNameOrContext?: string;
  onClose: () => void;
  onUpdateCompanyPhone: (companyId: string, phone: string) => Promise<void> | void;
}

export const WhatsAppSmartModal: React.FC<Props> = ({
  company,
  itemNameOrContext = 'procurement items',
  onClose,
  onUpdateCompanyPhone
}) => {
  const existingPhone = company.whatsapp || company.phone || '';
  const needsPhone = !existingPhone.trim();

  const [phoneInput, setPhoneInput] = useState(existingPhone);
  const [errorMsg, setErrorMsg] = useState('');

  const executeWhatsAppLaunch = (targetPhone: string) => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const message = `Hello ${company.name}, inquiring about ${itemNameOrContext} quotation from Cosmo Cnergy.`;
    const encodedText = encodeURIComponent(message);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
    onClose();
  };

  const handleSaveAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneInput.replace(/[^0-9]/g, '');
    if (clean.length < 8) {
      setErrorMsg('Please enter a valid phone number with country code (e.g. +91 9876543210).');
      return;
    }

    try {
      await onUpdateCompanyPhone(company.id, phoneInput);
      executeWhatsAppLaunch(phoneInput);
    } catch (err) {
      console.error('Failed to update phone number:', err);
      executeWhatsAppLaunch(phoneInput);
    }
  };

  if (!needsPhone) {
    executeWhatsAppLaunch(existingPhone);
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-[#073642]">WhatsApp Smart Dispatch</h3>
          </div>
          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAndLaunch} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-[#586E75] font-medium">
              Please enter phone number for <span className="font-bold text-[#073642]">{company.name}</span>:
            </p>

            <div className="relative">
              <PhoneCall className="w-4 h-4 text-[#586E75] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                autoFocus
                value={phoneInput}
                onChange={e => {
                  setPhoneInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="+91 98765 43210"
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#073642] focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
            {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}
          </div>

          <div className="bg-[#EEE8D5] p-3 rounded-xl border border-[#D6D1B1] space-y-1">
            <div className="text-[11px] font-bold text-[#586E75] uppercase tracking-wider">
              Pre-filled Message Preview:
            </div>
            <p className="text-xs text-[#073642] font-mono italic leading-relaxed">
              "Hello {company.name}, inquiring about {itemNameOrContext} quotation from Cosmo Cnergy."
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D6D1B1]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save & Launch WhatsApp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
