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
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-3xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4 text-[#0D0D0D]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0]/60 pb-3">
          <div className="flex items-center gap-2.5 text-[#0b6623] font-bold">
            <MessageSquare className="w-5 h-5 text-[#0b6623]" />
            <h3 className="text-lg font-bold text-[#0D0D0D]">WhatsApp Smart Dispatch</h3>
          </div>
          <button onClick={onClose} className="text-[#334155] hover:text-[#0D0D0D] font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAndLaunch} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-[#334155] font-medium">
              Please enter phone number for <span className="font-bold text-[#0D0D0D]">{company.name}</span>:
            </p>

            <div className="relative">
              <PhoneCall className="w-4 h-4 text-[#334155] absolute left-3.5 top-3" />
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
                className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0b6623] font-mono font-bold"
              />
            </div>
            {errorMsg && <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>}
          </div>

          <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#E2E8F0] space-y-1">
            <div className="text-[11px] font-bold text-[#334155] uppercase tracking-wider">
              Pre-filled Message Preview:
            </div>
            <p className="text-xs text-[#0D0D0D] font-mono italic leading-relaxed">
              "Hello {company.name}, inquiring about {itemNameOrContext} quotation from Cosmo Cnergy."
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FFFFFF] text-[#0D0D0D] text-xs font-semibold hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0b6623] hover:bg-[#084d1a] text-white font-bold text-xs shadow-md shadow-[#0b6623]/20 active:scale-95 transition-all"
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
