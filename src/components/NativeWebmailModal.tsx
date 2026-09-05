import React, { useState } from 'react';
import { Company, determineOrderType, formatProcurementSubject } from '../types';
import { Mail, X, Paperclip, Send, CheckCircle, Zap, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  company: Company;
  itemName?: string;
  itemSpecs?: string;
  quantity?: number | string;
  context?: string;
  statusState?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NativeWebmailModal: React.FC<Props> = ({
  company,
  itemName = 'Battery Cell / Materials Assembly',
  itemSpecs = 'Standard Industry Grade Specification',
  quantity = 100,
  context = 'CATALOG_BOM',
  statusState,
  onClose,
  onSuccess
}) => {
  const orderType = determineOrderType(context, statusState);
  const initialSubject = formatProcurementSubject(orderType, itemName);

  const [toEmail, setToEmail] = useState(company.email || '');
  const [subject, setSubject] = useState(initialSubject);

  const defaultBody = `Dear Sales Team (${company.name}),

We at Cosmo Cnergy would like to request an official Request for Quotation (RFQ)/PO for the following item:

• Product: ${itemName}
• Specification / Particulars: ${itemSpecs}
• Quantity Required: ${quantity}

Could you please share:
1. Official unit rate (excl. and incl. GST)
2. Lead time & delivery schedule for Pune plant
3. Applicable bulk discounts
4. Warranty & payment terms

Looking forward to your prompt response.

Best regards,
Procurement Team
Cosmo Cnergy`;

  const [bodyText, setBodyText] = useState(defaultBody);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      const fullBodyWithSignature = `${bodyText}\n\n----------------------------------------\nCOSMOCNERGY PROCUREMENT LTD.\nUnit 4, Energy Tech Park, Pune / New Delhi, India\nWebsite: https://cosmocnergy.com | Email: procurement@cosmocnergy.com`;

      const response = await fetch('/api/webmail-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject,
          text: fullBodyWithSignature,
          html: `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #0f172a; line-height: 1.6;">${fullBodyWithSignature.replace(/\n/g, '<br/>')}</div>`
        })
      });

      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.error || resData.message || 'SMTP transport failed to deliver message.');
      }

      setSendSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[Webmail Modal] Dispatch error:', err);
      setErrorMsg(err.message || 'Failed to dispatch via SMTP transport.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[white] w-full max-w-2xl rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 my-8 text-[#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0f172a]">Official Webmail Composer</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {orderType}
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                Direct SMTP transport to <strong className="text-[#0f172a]">{company.name}</strong>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#64748b] hover:text-[#0f172a] font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sendSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 animate-in zoom-in-50 duration-200">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a]">Email Dispatched via Webmail SMTP!</h3>
            <p className="text-xs text-[#64748b] max-w-sm">
              Official {orderType} message transmitted to <span className="font-semibold text-[#0f172a]">{toEmail}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
            {/* Recipient */}
            <div>
              <label className="block font-semibold text-[#0f172a] mb-1">Recipient Vendor Email *</label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                placeholder="sales@vendor.com"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block font-semibold text-[#0f172a] mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-sm text-[#0f172a] focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block font-semibold text-[#0f172a] mb-1">Email Message Payload</label>
              <textarea
                rows={7}
                required
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-xs text-[#0f172a] font-mono focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block font-semibold text-[#0f172a] mb-1">Attachments</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#e2e8f0] text-[#0f172a] cursor-pointer text-xs font-semibold">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Attach Document</span>
                  <input type="file" multiple onChange={handleFileChange} className="hidden" />
                </label>
                {attachedFiles.length > 0 && (
                  <span className="text-xs text-[#64748b]">{attachedFiles.length} file(s) attached</span>
                )}
              </div>

              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-lg text-xs"
                    >
                      <FileText className="w-3 h-3 text-emerald-600" />
                      <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Corporate Auto Signature Card */}
            <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] space-y-1 text-[11px] text-[#64748b]">
              <span className="font-bold text-[#0f172a] block">Verified Procurement Footprint:</span>
              <p>CosmoCnergy Procurement Ltd. • Unit 4, Energy Tech Park, Pune / New Delhi, India</p>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e2e8f0]/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#f8fafc] text-[#0f172a] font-semibold hover:bg-[#e2e8f0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Official Webmail via SMTP</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
