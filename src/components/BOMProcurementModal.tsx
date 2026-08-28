import React, { useState, useMemo, useEffect } from 'react';
import { CatalogItem, ProductBOM, Supplier, MultiSupplierPODraft, ProductFolder, ProcurementOrder, formatProcurementSubject, QueuedMailDraft } from '../types';
import { Layers, Rocket, Calculator, Check, ArrowRight, Zap, RefreshCw, X, Building2, Package, Mail, MessageSquare } from 'lucide-react';

interface Props {
  catalog: CatalogItem[];
  boms: ProductBOM[];
  suppliers: Supplier[];
  folders?: ProductFolder[];
  orders?: ProcurementOrder[];
  onClose: () => void;
  onDispatchOrders: (orders: MultiSupplierPODraft[], type: 'PO' | 'RFQ') => Promise<void>;
  onOpenWebmail?: (supplier: Supplier, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onEnqueueMailDrafts?: (drafts: QueuedMailDraft[], openFirstImmediately?: boolean) => void;
}

export const BOMProcurementModal: React.FC<Props> = ({
  catalog,
  boms,
  suppliers,
  folders = [],
  orders = [],
  onClose,
  onDispatchOrders,
  onOpenWebmail,
  onEnqueueMailDrafts
}) => {
  // Option list combining Product Folders and registered BOM finished products
  const folderNames = folders.map(f => ({
    code: f.id,
    name: f.name,
    isFolder: true,
    linkedPoIds: f.linked_po_ids || [],
    components: f.components || []
  }));

  const bomProducts = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    boms.forEach(b => {
      if (!map.has(b.product_code)) {
        map.set(b.product_code, { code: b.product_code, name: b.product_name });
      }
    });
    return Array.from(map.values()).map(p => ({
      code: p.code,
      name: p.name,
      isFolder: false,
      linkedPoIds: [],
      components: []
    }));
  }, [boms]);

  const allSelectableProducts = useMemo(() => {
    return [...folderNames, ...bomProducts];
  }, [folderNames, bomProducts]);

  const [selectedProductCode, setSelectedProductCode] = useState<string>(
    allSelectableProducts[0]?.code || 'PACK-51.2V-100AH'
  );
  const [packQuantity, setPackQuantity] = useState<number>(5);
  const [orderType, setOrderType] = useState<'PO' | 'RFQ'>('PO');
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeTabSupplierId, setActiveTabSupplierId] = useState<string | null>(null);

  const currentSelection = useMemo(() => {
    return allSelectableProducts.find(p => p.code === selectedProductCode) || allSelectableProducts[0];
  }, [allSelectableProducts, selectedProductCode]);

  // 1-TAP BOM AUTO-CALCULATION & MULTI-SUPPLIER AUTO-SPLITTING LOGIC
  const splitDrafts = useMemo<MultiSupplierPODraft[]>(() => {
    const supplierMap = new Map<string, MultiSupplierPODraft>();

    if (currentSelection?.isFolder) {
      const currentFolder = folders.find(f => f.id === currentSelection.code || f.name === currentSelection.name);

      // Path A: Folder has direct nested recipe components
      if (currentFolder?.components && currentFolder.components.length > 0) {
        currentFolder.components.forEach(comp => {
          const rawItem = catalog.find(c => c.id === comp.item_id);
          if (!rawItem) return;

          const supplier = suppliers.find(s => s.id === rawItem.supplier_id) || {
            id: rawItem.supplier_id || 'unknown',
            name: 'General Vendor',
            email: 'sales@vendor.com',
            phone: '+91 98765 43210',
            whatsapp: '919876543210',
            contact_person: 'Sales Dept'
          };

          if (!supplierMap.has(supplier.id)) {
            supplierMap.set(supplier.id, {
              supplier,
              items: [],
              total_amount: 0
            });
          }

          const draft = supplierMap.get(supplier.id)!;
          const totalItemQty = comp.qty_per_unit * packQuantity;
          const unitPrice = rawItem.preset_price || 100;
          const subtotal = totalItemQty * unitPrice;

          draft.items.push({
            catalogItem: rawItem,
            quantity: totalItemQty,
            unit_price: unitPrice,
            total_price: subtotal
          });
          draft.total_amount += subtotal;
        });
      }
      // Path B: Folder has linked POs
      else if (currentFolder?.linked_po_ids && currentFolder.linked_po_ids.length > 0) {
        const linkedPOs = orders.filter(o => currentFolder.linked_po_ids.includes(o.id));
        linkedPOs.forEach(po => {
          const supplier = po.supplier || suppliers.find(s => s.id === po.supplier_id) || {
            id: po.supplier_id || 'unknown',
            name: 'General Vendor',
            email: 'sales@vendor.com',
            phone: '+91 98765 43210',
            whatsapp: '919876543210',
            contact_person: 'Sales Department'
          };

          if (!supplierMap.has(supplier.id)) {
            supplierMap.set(supplier.id, {
              supplier,
              items: [],
              total_amount: 0
            });
          }

          const draft = supplierMap.get(supplier.id)!;
          (po.items || []).forEach(poItem => {
            const item = poItem.item || catalog.find(c => c.id === poItem.item_id);
            if (!item) return;

            const qty = poItem.quantity * packQuantity;
            const uPrice = poItem.unit_price || item.preset_price || 100;
            const tPrice = qty * uPrice;

            draft.items.push({
              catalogItem: item,
              quantity: qty,
              unit_price: uPrice,
              total_price: tPrice
            });
            draft.total_amount += tPrice;
          });
        });
      }
    }

    // Path C: Fallback to registered BOM items if folder didn't populate or BOM was selected
    if (supplierMap.size === 0) {
      const targetBOMItems = boms.filter(
        b => b.product_code === selectedProductCode || b.product_name === currentSelection?.name
      );

      targetBOMItems.forEach(bom => {
        const rawItem = catalog.find(c => c.id === bom.raw_material_id) || bom.raw_material;
        if (!rawItem) return;

        const supplier = suppliers.find(s => s.id === rawItem.supplier_id) || {
          id: rawItem.supplier_id || 'unknown',
          name: 'General Vendor',
          email: 'sales@vendor.com',
          phone: '+91 98765 43210',
          whatsapp: '919876543210',
          contact_person: 'Sales Dept'
        };

        if (!supplierMap.has(supplier.id)) {
          supplierMap.set(supplier.id, {
            supplier,
            items: [],
            total_amount: 0
          });
        }

        const draft = supplierMap.get(supplier.id)!;
        const totalItemQty = bom.qty_per_unit * packQuantity;
        const unitPrice = rawItem.preset_price || 100;
        const subtotal = totalItemQty * unitPrice;

        draft.items.push({
          catalogItem: rawItem,
          quantity: totalItemQty,
          unit_price: unitPrice,
          total_price: subtotal
        });
        draft.total_amount += subtotal;
      });
    }

    return Array.from(supplierMap.values());
  }, [selectedProductCode, packQuantity, boms, catalog, suppliers, currentSelection, orders, folders]);

  // Set default active tab
  if (!activeTabSupplierId && splitDrafts.length > 0) {
    setActiveTabSupplierId(splitDrafts[0].supplier.id);
  }

  const totalCalculatedCost = useMemo(() => {
    return splitDrafts.reduce((sum, d) => sum + d.total_amount, 0);
  }, [splitDrafts]);

  // State to track missing vendor contact details
  const [editableContacts, setEditableContacts] = useState<Record<string, { email: string; phone: string }>>({});
  const [dispatchChannel, setDispatchChannel] = useState<'webmail' | 'whatsapp'>('webmail');

  useEffect(() => {
    const map: Record<string, { email: string; phone: string }> = {};
    splitDrafts.forEach(d => {
      map[d.supplier.id] = {
        email: d.supplier.email || '',
        phone: d.supplier.whatsapp || d.supplier.phone || ''
      };
    });
    setEditableContacts(map);
  }, [splitDrafts]);

  const handleContactChange = (supplierId: string, field: 'email' | 'phone', value: string) => {
    setEditableContacts(prev => ({
      ...prev,
      [supplierId]: {
        ...prev[supplierId],
        [field]: value
      }
    }));
  };

  // Helper to format itemized PO list for a vendor draft
  const formatVendorItemsList = (draft: MultiSupplierPODraft) => {
    return draft.items
      .map(
        (it, i) =>
          `${i + 1}. ${it.catalogItem.name} (${it.catalogItem.specs || 'Standard'}) — Qty: ${it.quantity} ${it.catalogItem.uom || 'Pcs'} @ ₹${it.unit_price} = ₹${it.total_price.toLocaleString('en-IN')}`
      )
      .join('\n');
  };

  // Helper to format full email subject & body for a vendor draft
  const buildVendorEmailData = (draft: MultiSupplierPODraft) => {
    const contact = editableContacts[draft.supplier.id] || { email: draft.supplier.email, phone: draft.supplier.phone };
    const itemsList = formatVendorItemsList(draft);
    const subject = `${orderType === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)'} - ${currentSelection?.name || 'Assembly'}`;
    const body = `Dear ${draft.supplier.contact_person || draft.supplier.name},\n\nPlease accept our formal ${orderType === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)'} for the "${currentSelection?.name || 'Assembly'}" (Batch x${packQuantity}):\n\n${itemsList}\n\nTotal PO Amount: ₹${draft.total_amount.toLocaleString('en-IN')}\n\nDelivery Location: Unit 4, Energy Tech Park, Pune Plant\nPayment Terms: 30 Days Net on QC Inspection\n\nPlease confirm order acceptance and dispatch schedule at your earliest convenience.\n\nBest regards,\nProcurement Department\nCosmo Cnergy Procurement Ltd.`;
    const mailtoUrl = `mailto:${encodeURIComponent(contact.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { to: contact.email || draft.supplier.email || '', subject, body, mailtoUrl };
  };

  // Helper to format WhatsApp message & URL for a vendor draft
  const buildVendorWhatsAppUrl = (draft: MultiSupplierPODraft) => {
    const contact = editableContacts[draft.supplier.id] || { email: draft.supplier.email, phone: draft.supplier.phone };
    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const itemsList = draft.items
      .map(i => `• ${i.catalogItem.name}: ${i.quantity} ${i.catalogItem.uom} @ ₹${i.unit_price} = ₹${i.total_price}`)
      .join('\n');
    const message = `*COSMOCNERGY 1-TAP PROCUREMENT*\n----------------------------------------\n📄 *Type:* ${orderType}\n🏢 *Vendor:* ${draft.supplier.name}\n📦 *Items:*\n${itemsList}\n💰 *Total:* ₹${draft.total_amount.toLocaleString('en-IN')}`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    return { cleanPhone, message, waUrl };
  };

  // Dispatch a single vendor draft via Webmail or mailto:
  const handleDispatchSingleVendorWebmail = (draft: MultiSupplierPODraft) => {
    const emailData = buildVendorEmailData(draft);
    if (!emailData.to) {
      alert(`Please enter a valid Email Address for ${draft.supplier.name}`);
      return;
    }

    if (onEnqueueMailDrafts) {
      const queuedDraft: QueuedMailDraft = {
        id: `bom-single-${draft.supplier.id}-${Date.now()}`,
        supplier: { ...draft.supplier, email: emailData.to },
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        productName: currentSelection?.name || 'Assembly',
        totalAmount: draft.total_amount,
        itemsCount: draft.items.length,
        context: 'CATALOG_BOM',
        orderType
      };
      onEnqueueMailDrafts([queuedDraft], true);
      onClose();
    } else if (onOpenWebmail) {
      onOpenWebmail(
        { ...draft.supplier, email: emailData.to },
        currentSelection?.name || 'Assembly',
        emailData.body,
        draft.total_amount,
        'CATALOG_BOM',
        'ORDERED'
      );
      onClose();
    } else {
      window.location.href = emailData.mailtoUrl;
    }
  };

  // Dispatch a single vendor draft via WhatsApp
  const handleDispatchSingleVendorWhatsApp = (draft: MultiSupplierPODraft) => {
    const { waUrl, cleanPhone } = buildVendorWhatsAppUrl(draft);
    if (!cleanPhone) {
      alert(`Please enter a valid WhatsApp/Phone Number for ${draft.supplier.name}`);
      return;
    }
    window.open(waUrl, '_blank');
  };

  const [autoRecordOrders, setAutoRecordOrders] = useState<boolean>(true);

  // Master Dispatch Handler — maps through POs, triggers Webmail/WhatsApp, and confirms DB mutation
  const handleMasterDispatch = async () => {
    // 1. Validation of contact info
    for (const draft of splitDrafts) {
      const contact = editableContacts[draft.supplier.id];
      if (dispatchChannel === 'webmail' && !contact?.email) {
        alert(`Please enter Email Address for supplier ${draft.supplier.name} before dispatching.`);
        setActiveTabSupplierId(draft.supplier.id);
        return;
      }
      if (dispatchChannel === 'whatsapp' && !contact?.phone) {
        alert(`Please enter WhatsApp/Phone Number for supplier ${draft.supplier.name} before dispatching.`);
        setActiveTabSupplierId(draft.supplier.id);
        return;
      }
    }

    setIsDispatching(true);
    try {
      if (dispatchChannel === 'whatsapp') {
        // Dispatch via WhatsApp Deep Links
        splitDrafts.forEach(draft => {
          const { waUrl } = buildVendorWhatsAppUrl(draft);
          window.open(waUrl, '_blank');
        });
      } else if (dispatchChannel === 'webmail' && splitDrafts.length > 0) {
        // Construct comprehensive PO drafts for ALL vendors
        const allQueuedDrafts: QueuedMailDraft[] = splitDrafts.map((draft, idx) => {
          const emailData = buildVendorEmailData(draft);
          return {
            id: `bom-queue-${draft.supplier.id}-${Date.now()}-${idx}`,
            supplier: { ...draft.supplier, email: emailData.to },
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body,
            productName: currentSelection?.name || 'Assembly',
            totalAmount: draft.total_amount,
            itemsCount: draft.items.length,
            context: 'CATALOG_BOM',
            orderType
          };
        });

        // Store remaining in session recovery
        try {
          sessionStorage.setItem('cosmo_pending_pos_queue', JSON.stringify(allQueuedDrafts.slice(1)));
        } catch {}

        if (onEnqueueMailDrafts) {
          onEnqueueMailDrafts(allQueuedDrafts, true);
        } else if (onOpenWebmail) {
          const first = allQueuedDrafts[0];
          onOpenWebmail(
            first.supplier,
            first.productName,
            first.body,
            first.totalAmount,
            'CATALOG_BOM',
            'ORDERED'
          );
        } else {
          // Fallback to mailto: for first vendor
          const first = splitDrafts[0];
          const emailData = buildVendorEmailData(first);
          window.location.href = emailData.mailtoUrl;
        }
      }

      // Record orders to database if user opted in or confirms
      if (autoRecordOrders && onDispatchOrders) {
        await onDispatchOrders(splitDrafts, orderType);
      }

      onClose();
    } catch (e) {
      console.error('Dispatch error:', e);
    } finally {
      setIsDispatching(false);
    }
  };

  const selectedDraft = splitDrafts.find(d => d.supplier.id === activeTabSupplierId) || splitDrafts[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#FDF6E3] w-full max-w-5xl rounded-3xl border border-[#D6D1B1] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 text-[#073642]">
        {/* Modal Top Banner */}
        <div className="bg-[#0B192C] p-6 border-b border-[#D6D1B1]/60 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  1-Tap Automated BOM Procurement Engine
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Multi-Vendor Auto-Split
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Select pack assembly & batch multiplier — auto-calculates quantities, aggregates suppliers, and executes 1-tap POs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-all font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Select Pack & Multiplier Card */}
          <div className="bg-[#EEE8D5] p-5 rounded-2xl border border-[#D6D1B1] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#586E75] uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>1. Production Assembly Target & Multiplier</span>
              </span>
              <span className="text-xs text-[#586E75] font-semibold">
                Auto-splits into <strong className="text-emerald-800">{splitDrafts.length} distinct supplier POs</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Selection */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#073642] mb-1">
                  Finished Product / Battery Pack Assembly:
                </label>
                <select
                  value={selectedProductCode}
                  onChange={e => setSelectedProductCode(e.target.value)}
                  className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-4 py-2.5 text-sm text-[#073642] font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  {allSelectableProducts.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.isFolder ? `📁 [Product Folder] ${p.name}` : `📦 [BOM Model] ${p.name}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Multiplier */}
              <div>
                <label className="block text-xs font-bold text-[#073642] mb-1">
                  Batch Multiplier (Packs to Build):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={packQuantity}
                    onChange={e => setPackQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-4 py-2.5 text-sm text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500 shadow-sm text-center"
                  />
                  <span className="text-xs font-bold text-[#586E75]">Packs</span>
                </div>
              </div>
            </div>

            {/* Quick Multiplier Pills */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[#586E75] font-semibold">Quick Set:</span>
              {[1, 5, 10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPackQuantity(val)}
                  className={`px-3 py-1 rounded-lg font-bold font-mono transition-all ${
                    packQuantity === val
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#FDF6E3] text-[#073642] hover:bg-[#E4DDC7] border border-[#D6D1B1]'
                  }`}
                >
                  x{val}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: PO vs RFQ Toggle & Total Cost Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#073642]">Dispatch Mode:</span>
              <div className="flex items-center p-1 bg-[#FDF6E3] rounded-xl border border-[#D6D1B1] text-xs">
                <button
                  type="button"
                  onClick={() => setOrderType('PO')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                    orderType === 'PO'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  Purchase Order (PO)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('RFQ')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                    orderType === 'RFQ'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#586E75] hover:text-[#073642]'
                  }`}
                >
                  Request for Quote (RFQ)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] text-[#586E75] font-semibold uppercase block">
                  Total Procurement Value
                </span>
                <span className="text-xl font-extrabold text-emerald-800 font-mono">
                  ₹{totalCalculatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Multi-Supplier Auto-Split Breakdown Tabs */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#586E75] uppercase tracking-wider block">
              2. Multi-Vendor Auto-Split Breakdown ({splitDrafts.length} Vendors)
            </span>

            {/* Supplier Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {splitDrafts.map(draft => {
                const isActive = (selectedDraft?.supplier.id === draft.supplier.id);
                return (
                  <button
                    key={draft.supplier.id}
                    onClick={() => setActiveTabSupplierId(draft.supplier.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md border-emerald-500'
                        : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7] border-[#D6D1B1]'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{draft.supplier.name}</span>
                    <span className="opacity-80 font-mono text-[10px]">
                      (₹{draft.total_amount.toLocaleString('en-IN')})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Supplier PO Content */}
            {selectedDraft && (
              <div className="bg-[#EEE8D5] rounded-2xl p-5 border border-[#D6D1B1] space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D6D1B1] pb-3 text-xs">
                  <div>
                    <h4 className="font-bold text-sm text-[#073642] flex items-center gap-2">
                      <span>{selectedDraft.supplier.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                        {selectedDraft.items.length} Line Item(s)
                      </span>
                    </h4>
                    <p className="text-[#586E75] mt-0.5">
                      Attn: {selectedDraft.supplier.contact_person || 'Sales Department'} ({selectedDraft.supplier.email})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#586E75] uppercase block">Subtotal for this Vendor</span>
                    <span className="text-base font-extrabold text-emerald-800 font-mono">
                      ₹{selectedDraft.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#586E75] border-b border-[#D6D1B1]">
                        <th className="pb-2 font-bold">Raw Material Item</th>
                        <th className="pb-2 font-bold text-center">Unit Price</th>
                        <th className="pb-2 font-bold text-center">Calculated Qty</th>
                        <th className="pb-2 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D6D1B1]/50">
                      {selectedDraft.items.map((item, idx) => (
                        <tr key={idx} className="text-[#073642]">
                          <td className="py-2.5 font-semibold">
                            <div>{item.catalogItem.name}</div>
                            <div className="text-[11px] text-[#586E75]">{item.catalogItem.specs}</div>
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold">
                            ₹{item.unit_price.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="px-2 py-1 rounded bg-[#FDF6E3] text-emerald-800 font-bold border border-[#D6D1B1]">
                              {item.quantity} {item.catalogItem.uom}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-800 font-mono">
                            ₹{item.total_price.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-[#D6D1B1]/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[#586E75] uppercase mb-0.5">
                      Vendor Email {!editableContacts[selectedDraft.supplier.id]?.email && <span className="text-red-600 font-bold">*Required</span>}
                    </label>
                    <input
                      type="email"
                      value={editableContacts[selectedDraft.supplier.id]?.email || ''}
                      onChange={e => handleContactChange(selectedDraft.supplier.id, 'email', e.target.value)}
                      placeholder="sales@vendor.com"
                      className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#586E75] uppercase mb-0.5">
                      WhatsApp / Phone {!editableContacts[selectedDraft.supplier.id]?.phone && <span className="text-red-600 font-bold">*Required</span>}
                    </label>
                    <input
                      type="text"
                      value={editableContacts[selectedDraft.supplier.id]?.phone || ''}
                      onChange={e => handleContactChange(selectedDraft.supplier.id, 'phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Individual Vendor Send PO Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D6D1B1]/60">
                  <span className="text-xs text-[#586E75]">
                    Transmit this specific PO to <strong className="text-[#073642]">{selectedDraft.supplier.name}</strong>:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDispatchSingleVendorWebmail(selectedDraft)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send PO via Webmail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDispatchSingleVendorWhatsApp(selectedDraft)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] font-bold text-xs border border-[#D6D1B1] shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send via WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer & MASTER DISPATCH BUTTON */}
        <div className="bg-[#EEE8D5] p-5 border-t border-[#D6D1B1] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Channel Selector */}
            <div className="flex items-center gap-2 bg-[#FDF6E3] p-1 rounded-xl border border-[#D6D1B1] text-xs">
              <button
                type="button"
                onClick={() => setDispatchChannel('webmail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dispatchChannel === 'webmail'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[#586E75] hover:text-[#073642]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Internal Webmail</span>
              </button>

              <button
                type="button"
                onClick={() => setDispatchChannel('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dispatchChannel === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[#586E75] hover:text-[#073642]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Optional Database Recording Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-[#073642] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRecordOrders}
                onChange={e => setAutoRecordOrders(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-[#D6D1B1] focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span>Record orders in database</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] font-semibold text-xs transition-all w-full sm:w-auto border border-[#D6D1B1]"
            >
              Cancel
            </button>

            {/* MASTER DISPATCH BUTTON */}
            <button
              type="button"
              disabled={isDispatching || splitDrafts.length === 0}
              onClick={handleMasterDispatch}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all w-full sm:w-auto"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching {splitDrafts.length} POs...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 fill-white" />
                  <span>🚀 DISPATCH ALL {splitDrafts.length} POs ({dispatchChannel === 'webmail' ? 'Webmail' : 'WhatsApp'})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
