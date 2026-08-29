import React, { useState, useEffect, useMemo } from 'react';
import { ProductFolder, CatalogItem, Company, ProcurementOrder, MultiCompanyPODraft, QueuedMailDraft, determineOrderType, formatProcurementSubject } from '../types';
import { Send, Mail, MessageSquare, Check, X, AlertCircle, Building2, ExternalLink, RefreshCw, Rocket, Phone, Edit2, ShieldAlert, Zap, Layers } from 'lucide-react';

interface Props {
  folder: ProductFolder;
  catalog: CatalogItem[];
  companies: Company[];
  orders: ProcurementOrder[];
  onClose: () => void;
  onUpdateCompanyContact?: (companyId: string, email: string, phone: string) => Promise<void> | void;
  onLogOrders?: (drafts: MultiCompanyPODraft[]) => Promise<void> | void;
  onOpenWhatsApp?: (company: Company, context?: string) => void;
  onOpenWebmail?: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onEnqueueMailDrafts?: (drafts: QueuedMailDraft[], openFirstImmediately?: boolean) => void;
}

export const BatchSendPOsModal: React.FC<Props> = ({
  folder,
  catalog,
  companies,
  orders,
  onClose,
  onUpdateCompanyContact,
  onLogOrders,
  onOpenWhatsApp,
  onOpenWebmail,
  onEnqueueMailDrafts
}) => {
  const [preferredChannel, setPreferredChannel] = useState<'webmail' | 'whatsapp'>('webmail');
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, 'webmail' | 'whatsapp'>>({});
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  // Editable inline vendor contacts
  const [editableContacts, setEditableContacts] = useState<Record<string, { email: string; phone: string }>>(() => {
    const map: Record<string, { email: string; phone: string }> = {};
    companies.forEach(s => {
      map[s.id] = {
        email: s.email || '',
        phone: s.whatsapp || s.phone || ''
      };
    });
    return map;
  });

  // Aggregate folder components by vendor_id
  const vendorDrafts = useMemo<MultiCompanyPODraft[]>(() => {
    const map = new Map<string, MultiCompanyPODraft>();

    // 1. Process Recipe Components
    (folder.components || []).forEach(comp => {
      const catItem = catalog.find(c => c.id === comp.item_id)
        || catalog.find(c => c.name.toLowerCase() === (comp.item_id || '').toLowerCase());
      if (!catItem) return;

      const supp = (catItem.company_id ? companies.find(s => s.id === catItem.company_id) : null)
        || catItem.company
        || (catItem.company_id ? companies.find(s => s.name.toLowerCase() === (catItem.company_id || '').toLowerCase()) : null)
        || companies[0]
        || {
          id: 'supp-default',
          name: 'General Vendor',
          email: 'sales@vendor.com',
          phone: '+91 98765 43210',
          whatsapp: '919876543210',
          contact_person: 'Sales Dept'
        };

      if (!map.has(supp.id)) {
        map.set(supp.id, {
          company: supp,
          items: [],
          total_amount: 0
        });
      }

      const draft = map.get(supp.id)!;
      const unitPrice = Number(catItem.preset_price) || 100;
      const qty = comp.qty_per_unit || 1;
      const total = qty * unitPrice;

      draft.items.push({
        catalogItem: catItem,
        quantity: qty,
        unit_price: unitPrice,
        total_price: total
      });
      draft.total_amount += total;
    });

    // 2. Process Linked PO Items if recipe components were empty
    if (map.size === 0 && folder.linked_po_ids && folder.linked_po_ids.length > 0) {
      const linkedOrders = orders.filter(o => folder.linked_po_ids.includes(o.id));
      linkedOrders.forEach(po => {
        const supp = po.company || companies.find(s => s.id === po.company_id) || {
          id: po.company_id || 'supp-default',
          name: 'General Vendor',
          email: 'sales@vendor.com',
          phone: '+91 98765 43210',
          whatsapp: '919876543210',
          contact_person: 'Sales Dept'
        };

        if (!map.has(supp.id)) {
          map.set(supp.id, {
            company: supp,
            items: [],
            total_amount: 0
          });
        }

        const draft = map.get(supp.id)!;
        (po.items || []).forEach(poItem => {
          const catItem = poItem.item || catalog.find(c => c.id === poItem.item_id);
          if (!catItem) return;

          const unitPrice = Number(poItem.unit_price) || Number(catItem.preset_price) || 100;
          const qty = poItem.quantity || 1;
          const total = qty * unitPrice;

          draft.items.push({
            catalogItem: catItem,
            quantity: qty,
            unit_price: unitPrice,
            total_price: total
          });
          draft.total_amount += total;
        });
      });
    }

    return Array.from(map.values());
  }, [folder, catalog, companies, orders]);

  // Sync contacts whenever companies or vendorDrafts change
  useEffect(() => {
    setEditableContacts(prev => {
      const updated = { ...prev };
      companies.forEach(s => {
        if (!updated[s.id] || !updated[s.id].email) {
          updated[s.id] = {
            email: s.email || '',
            phone: s.whatsapp || s.phone || ''
          };
        }
      });
      vendorDrafts.forEach(d => {
        if (!updated[d.company.id] || !updated[d.company.id].email) {
          updated[d.company.id] = {
            email: d.company.email || '',
            phone: d.company.whatsapp || d.company.phone || ''
          };
        }
      });
      return updated;
    });
  }, [companies, vendorDrafts]);

  // Select all vendors by default
  useEffect(() => {
    setSelectedVendorIds(vendorDrafts.map(d => d.company.id));
  }, [vendorDrafts]);

  const [orderType, setOrderType] = useState<'PO' | 'RFQ'>('PO');
  const emailSubject = formatProcurementSubject(orderType, folder.name);

  // Update contact details in local state
  const handleContactChange = (companyId: string, field: 'email' | 'phone', val: string) => {
    setEditableContacts(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: val
      }
    }));
  };

  const handleSaveContact = (companyId: string) => {
    const contact = editableContacts[companyId];
    if (contact && onUpdateCompanyContact) {
      onUpdateCompanyContact(companyId, contact.email, contact.phone);
    }
  };

  // Build Body for a single vendor draft
  const generateVendorEmailBody = (draft: MultiCompanyPODraft) => {
    const itemsList = draft.items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.catalogItem.name} (${item.catalogItem.specs || 'Standard'}) — Qty: ${item.quantity} ${item.catalogItem.uom || 'Pcs'} @ ₹${item.unit_price} = ₹${item.total_price.toLocaleString('en-IN')}`
      )
      .join('\n');

    const docName = orderType === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)';
    return `Dear ${draft.company.contact_person || draft.company.name},\n\nPlease accept our ${docName} for the "${folder.name}" assembly:\n\n${itemsList}\n\nTotal Amount: ₹${draft.total_amount.toLocaleString('en-IN')}\n\nDelivery Location: Unit 4, Energy Tech Park, Pune Plant\nPayment Terms: 30 Days Net on QC Inspection\n\nPlease confirm at your earliest convenience.\n\nBest regards,\nProcurement Department\nCosmo Cnergy Procurement Ltd.`;
  };

  // Build WhatsApp text for a single vendor draft
  const generateVendorWhatsAppText = (draft: MultiCompanyPODraft) => {
    const itemsList = draft.items
      .map(item => `• *${item.catalogItem.name}*: ${item.quantity} ${item.catalogItem.uom || 'Pcs'} @ ₹${item.unit_price}`)
      .join('\n');

    const docName = orderType === 'PO' ? 'PURCHASE ORDER (PO)' : 'REQUEST FOR QUOTATION (RFQ)';
    return `*COSMO CNERGY ${docName}* 🚀\n----------------------------------------\n🏢 *Product Assembly:* ${folder.name}\n👤 *Vendor:* ${draft.company.name}\n\n📦 *REQUIRED ITEMS:*\n${itemsList}\n\n💰 *TOTAL AMOUNT:* ₹${draft.total_amount.toLocaleString('en-IN')}\n📍 *Plant:* Pune Plant\n\nPlease confirm availability and quotation dispatch.`;
  };

  // Dispatch individual vendor via internal Webmail and persist the remaining drafts in queue
  const dispatchSingleVendorWebmail = (draft: MultiCompanyPODraft, advanceQueue = false) => {
    const contact = editableContacts[draft.company.id] || { email: draft.company.email, phone: draft.company.phone };
    if (!contact.email) {
      alert(`Please enter a valid email for ${draft.company.name}`);
      return;
    }

    const allQueued: QueuedMailDraft[] = vendorDrafts.map((d, idx) => {
      const c = editableContacts[d.company.id] || { email: d.company.email, phone: d.company.phone };
      return {
        id: `queue-${d.company.id}-${Date.now()}-${idx}`,
        company: { ...d.company, email: c.email, phone: c.phone },
        to: c.email || d.company.email,
        subject: emailSubject,
        body: generateVendorEmailBody(d),
        productName: folder.name,
        totalAmount: d.total_amount,
        itemsCount: d.items.length,
        context: 'CATALOG_BOM'
      };
    });

    const activeDraftIndex = allQueued.findIndex(q => q.company.id === draft.company.id);
    const activeDraft = allQueued[activeDraftIndex] || allQueued[0];
    const remainingDrafts = allQueued.filter((_, idx) => idx !== activeDraftIndex);

    // Persist pending POs in storage
    try {
      sessionStorage.setItem('cosmo_pending_pos_queue', JSON.stringify(remainingDrafts));
    } catch {}

    if (onEnqueueMailDrafts) {
      onEnqueueMailDrafts([activeDraft, ...remainingDrafts], true);
    } else if (onOpenWebmail) {
      onOpenWebmail(
        { ...draft.company, email: contact.email },
        folder.name,
        generateVendorEmailBody(draft),
        draft.total_amount,
        'CATALOG_BOM',
        'ORDERED'
      );
    }
    setDispatchedMap(prev => ({ ...prev, [draft.company.id]: 'webmail' }));

    if (advanceQueue) {
      setActiveQueueIndex(prev => Math.min(prev + 1, vendorDrafts.length - 1));
    }
    onClose();
  };

  // Dispatch individual vendor via WhatsApp
  const dispatchSingleVendorWhatsApp = (draft: MultiCompanyPODraft, advanceQueue = false) => {
    const contact = editableContacts[draft.company.id] || { email: draft.company.email, phone: draft.company.phone };
    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert(`Please enter a valid phone number for ${draft.company.name}`);
      return;
    }

    const text = generateVendorWhatsAppText(draft);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setDispatchedMap(prev => ({ ...prev, [draft.company.id]: 'whatsapp' }));

    if (advanceQueue) {
      setActiveQueueIndex(prev => Math.min(prev + 1, vendorDrafts.length - 1));
    }
  };

  // Fixed 'Dispatch All POs' Action Handler with Storage Persistence
  const handleBatchDispatchAll = async () => {
    const selectedDrafts = vendorDrafts.filter(d => selectedVendorIds.includes(d.company.id));
    if (selectedDrafts.length === 0) return;

    if (onLogOrders) {
      await onLogOrders(selectedDrafts);
    }

    if (preferredChannel === 'webmail') {
      const allQueued: QueuedMailDraft[] = selectedDrafts.map((d, idx) => {
        const c = editableContacts[d.company.id] || { email: d.company.email, phone: d.company.phone };
        return {
          id: `queue-${d.company.id}-${Date.now()}-${idx}`,
          company: { ...d.company, email: c.email, phone: c.phone },
          to: c.email || d.company.email,
          subject: emailSubject,
          body: generateVendorEmailBody(d),
          productName: folder.name,
          totalAmount: d.total_amount,
          itemsCount: d.items.length,
          context: 'CATALOG_BOM',
          orderType
        };
      });

      // Save pending POs array to sessionStorage and localStorage
      try {
        sessionStorage.setItem('cosmo_pending_pos_queue', JSON.stringify(allQueued.slice(1)));
      } catch {}

      if (onEnqueueMailDrafts) {
        onEnqueueMailDrafts(allQueued, true);
      } else if (onOpenWebmail) {
        const first = selectedDrafts[0];
        const contact = editableContacts[first.company.id] || { email: first.company.email, phone: first.company.phone };
        onOpenWebmail(
          { ...first.company, email: contact.email },
          folder.name,
          generateVendorEmailBody(first),
          first.total_amount,
          'CATALOG_BOM',
          'ORDERED'
        );
      }
    } else if (preferredChannel === 'whatsapp') {
      selectedDrafts.forEach(d => dispatchSingleVendorWhatsApp(d, false));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#FDF6E3] w-full max-w-4xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-5 my-8 text-[#073642]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#073642]">Multi-Vendor Dispatch Workspace</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {vendorDrafts.length} Vendors
                </span>
              </div>
              <p className="text-xs text-[#586E75]">
                Aggregated PO drafts for assembly <span className="font-bold text-[#073642]">"{folder.name}"</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#586E75] hover:text-[#073642] font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dispatch Options & Progress */}
        <div className="bg-[#EEE8D5] p-4 rounded-2xl border border-[#D6D1B1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#073642]">Dispatch Mode:</span>
              <div className="flex items-center p-1 bg-[#FDF6E3] rounded-xl border border-[#D6D1B1]">
                <button
                  type="button"
                  onClick={() => setOrderType('PO')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    orderType === 'PO'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  PO
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('RFQ')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    orderType === 'RFQ'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  RFQ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-[#073642]">Channel:</span>
              <div className="flex items-center p-1 bg-[#FDF6E3] rounded-xl border border-[#D6D1B1]">
                <button
                  type="button"
                  onClick={() => setPreferredChannel('webmail')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                    preferredChannel === 'webmail'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Webmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreferredChannel('whatsapp')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                    preferredChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchDispatchAll}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Dispatch All ({selectedVendorIds.length}) POs</span>
            </button>
          </div>
        </div>

        {/* Vendor Drafts Ladder List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {vendorDrafts.map((draft, index) => {
            const contact = editableContacts[draft.company.id] || { email: draft.company.email, phone: draft.company.phone };
            const isDispatched = Boolean(dispatchedMap[draft.company.id]);

            return (
              <div
                key={draft.company.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDispatched
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-[#EEE8D5]/70 border-[#D6D1B1]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D1B1]/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedVendorIds.includes(draft.company.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedVendorIds(prev => [...prev, draft.company.id]);
                        } else {
                          setSelectedVendorIds(prev => prev.filter(id => id !== draft.company.id));
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-[#D6D1B1] focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#073642]">{draft.company.name}</h4>
                      <p className="text-[11px] text-[#586E75]">
                        Contact: {draft.company.contact_person || 'Sales Dept'} • Total: <strong className="text-emerald-800 font-mono">₹{draft.total_amount.toLocaleString('en-IN')}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dispatchSingleVendorWebmail(draft)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open Webmail Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispatchSingleVendorWhatsApp(draft)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] font-bold text-xs border border-[#D6D1B1] shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {draft.items.map((it, idx) => (
                    <span
                      key={idx}
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
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D1B1]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
