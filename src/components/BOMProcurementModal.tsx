import React, { useState, useMemo, useEffect } from 'react';
import {
  CatalogItem,
  ProductBOM,
  Company,
  MultiCompanyPODraft,
  ProductFolder,
  ProcurementOrder,
  formatProcurementSubject,
  QueuedMailDraft,
  ComponentCompany
} from '../types';
import {
  Layers,
  Rocket,
  Calculator,
  Check,
  ArrowRight,
  Zap,
  RefreshCw,
  X,
  Building2,
  Package,
  Mail,
  MessageSquare,
  Search
} from 'lucide-react';

interface Props {
  catalog: CatalogItem[];
  boms: ProductBOM[];
  companies: Company[];
  folders?: ProductFolder[];
  orders?: ProcurementOrder[];
  componentCompanies?: ComponentCompany[];
  onClose: () => void;
  onDispatchOrders: (orders: MultiCompanyPODraft[], type: 'PO' | 'RFQ') => Promise<void>;
  onOpenWebmail?: (
    company: Company,
    itemName?: string,
    specs?: string,
    qty?: number | string,
    context?: string,
    statusState?: string
  ) => void;
  onEnqueueMailDrafts?: (drafts: QueuedMailDraft[], openFirstImmediately?: boolean) => void;
}

export const BOMProcurementModal: React.FC<Props> = ({
  catalog,
  boms,
  companies,
  folders = [],
  orders = [],
  componentCompanies = [],
  onClose,
  onDispatchOrders,
  onOpenWebmail,
  onEnqueueMailDrafts
}) => {
  // Navigation Tabs: Whole Product Assembly vs Selected Components
  const [activeBOMTab, setActiveBOMTab] = useState<'whole_product' | 'selected_components'>('whole_product');

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
  const [activeTabCompanyId, setActiveTabCompanyId] = useState<string | null>(null);

  // Per-item quantity overrides for Whole Product Assembly and Selected Components
  const [rowQtyOverrides, setRowQtyOverrides] = useState<Record<string, number>>({});
  const [selectedCompQtyOverrides, setSelectedCompQtyOverrides] = useState<Record<string, number>>({});

  // Selected Components State
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>(() => {
    return catalog.slice(0, 4).map(c => c.id);
  });
  const [compSearchQuery, setCompSearchQuery] = useState('');

  const currentSelection = useMemo(() => {
    return allSelectableProducts.find(p => p.code === selectedProductCode) || allSelectableProducts[0];
  }, [allSelectableProducts, selectedProductCode]);

  // Helper to pick default company for a component by lowest RFQ price (pure deterministic sorting, no AI)
  const getLowestPriceCompanyForItem = (item: CatalogItem): { company: Company; rfqPrice: number; moq: number } => {
    const linked = componentCompanies.filter(cc => cc.component_id === item.id);
    if (linked.length > 0) {
      // Sort by RFQ price (lowest) then MOQ (lowest)
      const sorted = [...linked].sort((a, b) => {
        const priceA = a.rfq_quoted_price ?? a.unit_price;
        const priceB = b.rfq_quoted_price ?? b.unit_price;
        if (priceA !== priceB) return priceA - priceB;
        return a.moq - b.moq;
      });
      const bestLink = sorted[0];
      const comp = companies.find(c => c.id === bestLink.company_id) || companies[0];
      return {
        company: comp || {
          id: bestLink.company_id,
          name: 'Primary Sourcing Partner',
          email: 'sales@vendor.com',
          phone: '+91 98765 43210',
          contact_person: 'Sales Team'
        },
        rfqPrice: bestLink.rfq_quoted_price ?? bestLink.unit_price,
        moq: bestLink.moq || item.min_order_qty || 1
      };
    }

    const comp = companies.find(s => s.id === item.company_id) || companies[0] || {
      id: item.company_id || 'unknown',
      name: 'General Vendor',
      email: 'sales@vendor.com',
      phone: '+91 98765 43210',
      contact_person: 'Sales Dept'
    };

    return {
      company: comp,
      rfqPrice: item.preset_price || 100,
      moq: item.min_order_qty || 1
    };
  };

  // 1-TAP BOM AUTO-CALCULATION FOR WHOLE PRODUCT ASSEMBLY
  const wholeProductDrafts = useMemo<MultiCompanyPODraft[]>(() => {
    const companyMap = new Map<string, MultiCompanyPODraft>();

    if (currentSelection?.isFolder) {
      const currentFolder = folders.find(f => f.id === currentSelection.code || f.name === currentSelection.name);

      // Path A: Folder has direct nested recipe components
      if (currentFolder?.components && currentFolder.components.length > 0) {
        currentFolder.components.forEach(comp => {
          const rawItem = catalog.find(c => c.id === comp.item_id);
          if (!rawItem) return;

          const winner = getLowestPriceCompanyForItem(rawItem);
          const company = winner.company;

          if (!companyMap.has(company.id)) {
            companyMap.set(company.id, {
              company,
              items: [],
              total_amount: 0
            });
          }

          const draft = companyMap.get(company.id)!;
          const defaultTotalQty = comp.qty_per_unit * packQuantity;
          const totalItemQty = rowQtyOverrides[rawItem.id] !== undefined ? rowQtyOverrides[rawItem.id] : defaultTotalQty;
          const unitPrice = winner.rfqPrice;
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
          const company = po.company || companies.find(s => s.id === po.company_id) || {
            id: po.company_id || 'unknown',
            name: 'General Vendor',
            email: 'sales@vendor.com',
            phone: '+91 98765 43210',
            whatsapp: '919876543210',
            contact_person: 'Sales Department'
          };

          if (!companyMap.has(company.id)) {
            companyMap.set(company.id, {
              company,
              items: [],
              total_amount: 0
            });
          }

          const draft = companyMap.get(company.id)!;
          (po.items || []).forEach(poItem => {
            const item = poItem.item || catalog.find(c => c.id === poItem.item_id);
            if (!item) return;

            const defaultQty = poItem.quantity * packQuantity;
            const qty = rowQtyOverrides[item.id] !== undefined ? rowQtyOverrides[item.id] : defaultQty;
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
    if (companyMap.size === 0) {
      const targetBOMItems = boms.filter(
        b => b.product_code === selectedProductCode || b.product_name === currentSelection?.name
      );

      targetBOMItems.forEach(bom => {
        const rawItem = catalog.find(c => c.id === bom.raw_material_id) || bom.raw_material;
        if (!rawItem) return;

        const winner = getLowestPriceCompanyForItem(rawItem);
        const company = winner.company;

        if (!companyMap.has(company.id)) {
          companyMap.set(company.id, {
            company,
            items: [],
            total_amount: 0
          });
        }

        const draft = companyMap.get(company.id)!;
        const defaultTotalQty = bom.qty_per_unit * packQuantity;
        const totalItemQty = rowQtyOverrides[rawItem.id] !== undefined ? rowQtyOverrides[rawItem.id] : defaultTotalQty;
        const unitPrice = winner.rfqPrice;
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

    return Array.from(companyMap.values());
  }, [selectedProductCode, packQuantity, rowQtyOverrides, boms, catalog, companies, componentCompanies, currentSelection, orders, folders]);

  // SELECTED COMPONENTS AUTO-SPLIT ENGINE
  const selectedComponentsDrafts = useMemo<MultiCompanyPODraft[]>(() => {
    const compMap = new Map<string, MultiCompanyPODraft>();

    selectedCompIds.forEach(id => {
      const item = catalog.find(c => c.id === id);
      if (!item) return;

      const winner = getLowestPriceCompanyForItem(item);
      const company = winner.company;

      if (!compMap.has(company.id)) {
        compMap.set(company.id, {
          company,
          items: [],
          total_amount: 0
        });
      }

      const draft = compMap.get(company.id)!;
      const defaultQty = winner.moq || item.min_order_qty || 10;
      const qty = selectedCompQtyOverrides[item.id] !== undefined ? selectedCompQtyOverrides[item.id] : defaultQty;
      const unitPrice = winner.rfqPrice;
      const subtotal = qty * unitPrice;

      draft.items.push({
        catalogItem: item,
        quantity: qty,
        unit_price: unitPrice,
        total_price: subtotal
      });
      draft.total_amount += subtotal;
    });

    return Array.from(compMap.values());
  }, [selectedCompIds, selectedCompQtyOverrides, catalog, componentCompanies, companies]);

  // Active drafts based on current mode
  const activeDrafts = activeBOMTab === 'whole_product' ? wholeProductDrafts : selectedComponentsDrafts;

  // Sync active company tab
  useEffect(() => {
    if (activeDrafts.length > 0) {
      if (!activeTabCompanyId || !activeDrafts.some(d => d.company.id === activeTabCompanyId)) {
        setActiveTabCompanyId(activeDrafts[0].company.id);
      }
    } else {
      setActiveTabCompanyId(null);
    }
  }, [activeDrafts, activeTabCompanyId]);

  const totalCalculatedCost = useMemo(() => {
    return activeDrafts.reduce((sum, d) => sum + d.total_amount, 0);
  }, [activeDrafts]);

  // State to track missing vendor contact details
  const [editableContacts, setEditableContacts] = useState<Record<string, { email: string; phone: string }>>({});
  const [dispatchChannel, setDispatchChannel] = useState<'webmail' | 'whatsapp'>('webmail');

  useEffect(() => {
    const map: Record<string, { email: string; phone: string }> = {};
    activeDrafts.forEach(d => {
      map[d.company.id] = {
        email: d.company.email || '',
        phone: d.company.whatsapp || d.company.phone || ''
      };
    });
    setEditableContacts(map);
  }, [activeDrafts]);

  const handleContactChange = (companyId: string, field: 'email' | 'phone', value: string) => {
    setEditableContacts(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value
      }
    }));
  };

  // Helper to format itemized list for a vendor draft
  const formatVendorItemsList = (draft: MultiCompanyPODraft) => {
    return draft.items
      .map(
        (it, i) =>
          `${i + 1}. ${it.catalogItem.name} (${it.catalogItem.specs || 'Standard'}) — Qty: ${it.quantity} ${it.catalogItem.uom || 'Pcs'} @ ₹${it.unit_price} = ₹${it.total_price.toLocaleString('en-IN')}`
      )
      .join('\n');
  };

  // Helper to format full email subject & body for a vendor draft
  const buildVendorEmailData = (draft: MultiCompanyPODraft) => {
    const contact = editableContacts[draft.company.id] || { email: draft.company.email, phone: draft.company.phone };
    const itemsList = formatVendorItemsList(draft);
    const contextName = activeBOMTab === 'whole_product' ? (currentSelection?.name || 'Assembly') : 'Selected Components Batch';
    const subject = `${orderType === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)'} - ${contextName}`;
    const body = `Dear ${draft.company.contact_person || draft.company.name},\n\nPlease accept our formal ${orderType === 'PO' ? 'Purchase Order (PO)' : 'Request for Quotation (RFQ)'} for the "${contextName}":\n\n${itemsList}\n\nTotal PO Amount: ₹${draft.total_amount.toLocaleString('en-IN')}\n\nDelivery Location: Unit 4, Energy Tech Park, Pune Plant\nPayment Terms: 30 Days Net on QC Inspection\n\nPlease confirm order acceptance and dispatch schedule at your earliest convenience.\n\nBest regards,\nProcurement Department\nCosmo Cnergy Procurement Ltd.`;
    const mailtoUrl = `mailto:${encodeURIComponent(contact.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { to: contact.email || draft.company.email || '', subject, body, mailtoUrl };
  };

  // Helper to format WhatsApp message & URL for a vendor draft
  const buildVendorWhatsAppUrl = (draft: MultiCompanyPODraft) => {
    const contact = editableContacts[draft.company.id] || { email: draft.company.email, phone: draft.company.phone };
    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const itemsList = draft.items
      .map(i => `• ${i.catalogItem.name}: ${i.quantity} ${i.catalogItem.uom} @ ₹${i.unit_price} = ₹${i.total_price}`)
      .join('\n');
    const contextName = activeBOMTab === 'whole_product' ? (currentSelection?.name || 'Assembly') : 'Selected Components Batch';
    const message = `*COSMOCNERGY 1-TAP PROCUREMENT*\n----------------------------------------\n📄 *Type:* ${orderType}\n🏢 *Vendor:* ${draft.company.name}\n📦 *Context:* ${contextName}\n*Items:*\n${itemsList}\n💰 *Total:* ₹${draft.total_amount.toLocaleString('en-IN')}`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    return { cleanPhone, message, waUrl };
  };

  // Dispatch a single vendor draft via Webmail or mailto:
  const handleDispatchSingleVendorWebmail = (draft: MultiCompanyPODraft) => {
    const emailData = buildVendorEmailData(draft);
    if (!emailData.to) {
      alert(`Please enter a valid Email Address for ${draft.company.name}`);
      return;
    }

    const contextName = activeBOMTab === 'whole_product' ? (currentSelection?.name || 'Assembly') : 'Selected Components Batch';

    if (onEnqueueMailDrafts) {
      const queuedDraft: QueuedMailDraft = {
        id: `bom-single-${draft.company.id}-${Date.now()}`,
        company: { ...draft.company, email: emailData.to },
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        productName: contextName,
        totalAmount: draft.total_amount,
        itemsCount: draft.items.length,
        context: 'CATALOG_BOM',
        orderType
      };
      onEnqueueMailDrafts([queuedDraft], true);
      onClose();
    } else if (onOpenWebmail) {
      onOpenWebmail(
        { ...draft.company, email: emailData.to },
        contextName,
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
  const handleDispatchSingleVendorWhatsApp = (draft: MultiCompanyPODraft) => {
    const { waUrl, cleanPhone } = buildVendorWhatsAppUrl(draft);
    if (!cleanPhone) {
      alert(`Please enter a valid WhatsApp/Phone Number for ${draft.company.name}`);
      return;
    }
    window.open(waUrl, '_blank');
  };

  const [autoRecordOrders, setAutoRecordOrders] = useState<boolean>(true);

  // Master Dispatch Handler
  const handleMasterDispatch = async () => {
    for (const draft of activeDrafts) {
      const contact = editableContacts[draft.company.id];
      if (dispatchChannel === 'webmail' && !contact?.email) {
        alert(`Please enter Email Address for company ${draft.company.name} before dispatching.`);
        setActiveTabCompanyId(draft.company.id);
        return;
      }
      if (dispatchChannel === 'whatsapp' && !contact?.phone) {
        alert(`Please enter WhatsApp/Phone Number for company ${draft.company.name} before dispatching.`);
        setActiveTabCompanyId(draft.company.id);
        return;
      }
    }

    setIsDispatching(true);
    try {
      if (dispatchChannel === 'whatsapp') {
        activeDrafts.forEach(draft => {
          const { waUrl } = buildVendorWhatsAppUrl(draft);
          window.open(waUrl, '_blank');
        });
      } else if (dispatchChannel === 'webmail' && activeDrafts.length > 0) {
        const contextName = activeBOMTab === 'whole_product' ? (currentSelection?.name || 'Assembly') : 'Selected Components Batch';
        const allQueuedDrafts: QueuedMailDraft[] = activeDrafts.map((draft, idx) => {
          const emailData = buildVendorEmailData(draft);
          return {
            id: `bom-queue-${draft.company.id}-${Date.now()}-${idx}`,
            company: { ...draft.company, email: emailData.to },
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body,
            productName: contextName,
            totalAmount: draft.total_amount,
            itemsCount: draft.items.length,
            context: 'CATALOG_BOM',
            orderType
          };
        });

        try {
          sessionStorage.setItem('cosmo_pending_pos_queue', JSON.stringify(allQueuedDrafts.slice(1)));
        } catch {}

        if (onEnqueueMailDrafts) {
          onEnqueueMailDrafts(allQueuedDrafts, true);
        } else if (onOpenWebmail) {
          const first = allQueuedDrafts[0];
          onOpenWebmail(
            first.company,
            first.productName,
            first.body,
            first.totalAmount,
            'CATALOG_BOM',
            'ORDERED'
          );
        } else {
          const first = activeDrafts[0];
          const emailData = buildVendorEmailData(first);
          window.location.href = emailData.mailtoUrl;
        }
      }

      if (autoRecordOrders && onDispatchOrders) {
        await onDispatchOrders(activeDrafts, orderType);
      }

      onClose();
    } catch (e) {
      console.error('Dispatch error:', e);
    } finally {
      setIsDispatching(false);
    }
  };

  const selectedDraft = activeDrafts.find(d => d.company.id === activeTabCompanyId) || activeDrafts[0];

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
                Procure complete product assemblies or customized component batches — edit quantities inline and send RFQ or POs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-all font-bold cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Split Navigation Bar: Whole Product vs Selected Components */}
          <div className="flex items-center gap-2 bg-[#EEE8D5] p-1.5 rounded-2xl border border-[#D6D1B1]">
            <button
              type="button"
              onClick={() => setActiveBOMTab('whole_product')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeBOMTab === 'whole_product'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#586E75] hover:text-[#073642] hover:bg-white/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Whole Product Assembly</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBOMTab('selected_components')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeBOMTab === 'selected_components'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#586E75] hover:text-[#073642] hover:bg-white/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Selected Components ({selectedCompIds.length})</span>
            </button>
          </div>

          {/* Step 1: Whole Product vs Selected Components Selection View */}
          {activeBOMTab === 'whole_product' ? (
            <div className="bg-[#EEE8D5] p-5 rounded-2xl border border-[#D6D1B1] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#586E75] uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>1. Production Assembly Target & Multiplier</span>
                </span>
                <span className="text-xs text-[#586E75] font-semibold">
                  Auto-splits into <strong className="text-emerald-800">{activeDrafts.length} distinct company POs</strong>
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
                    className={`px-3 py-1 rounded-lg font-bold font-mono transition-all cursor-pointer ${
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
          ) : (
            <div className="bg-[#EEE8D5] p-5 rounded-2xl border border-[#D6D1B1] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#586E75] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>1. Select Components for On-Demand Batch ({selectedCompIds.length} Selected)</span>
                </span>
                <span className="text-xs text-[#586E75] font-semibold">
                  Auto-splits into <strong className="text-emerald-800">{activeDrafts.length} lowest-price company orders</strong>
                </span>
              </div>

              {/* Component Search & Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#839496] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search components to add to procurement batch..."
                      value={compSearchQuery}
                      onChange={e => setCompSearchQuery(e.target.value)}
                      className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompIds(catalog.map(c => c.id))}
                    className="px-3 py-2 bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] border border-[#D6D1B1] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCompIds([])}
                    className="px-3 py-2 bg-[#FDF6E3] hover:bg-[#E4DDC7] text-[#073642] border border-[#D6D1B1] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Component Selection Pills */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-[#FDF6E3] rounded-xl border border-[#D6D1B1]">
                  {catalog
                    .filter(c => !compSearchQuery || c.name.toLowerCase().includes(compSearchQuery.toLowerCase()))
                    .map(c => {
                      const isSelected = selectedCompIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCompIds(prev =>
                              isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-[#586E75] border-[#D6D1B1] hover:text-[#073642] hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono">{isSelected ? '✓' : '+'}</span>
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: PO vs RFQ Toggle & Total Cost Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#EEE8D5] border border-[#D6D1B1]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#073642]">Dispatch Mode:</span>
              <div className="flex items-center p-1 bg-[#FDF6E3] rounded-xl border border-[#D6D1B1] text-xs">
                <button
                  type="button"
                  onClick={() => setOrderType('PO')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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

          {/* Step 3: Multi-Company Auto-Split Breakdown Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#586E75] uppercase tracking-wider block">
                2. Multi-Vendor Auto-Split Breakdown ({activeDrafts.length} Vendors)
              </span>
              <span className="text-[11px] text-[#586E75] italic">
                Tip: You can edit individual item quantities directly in the table below
              </span>
            </div>

            {/* Company Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {activeDrafts.map(draft => {
                const isActive = (selectedDraft?.company.id === draft.company.id);
                return (
                  <button
                    key={draft.company.id}
                    onClick={() => setActiveTabCompanyId(draft.company.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md border-emerald-500'
                        : 'bg-[#EEE8D5] text-[#073642] hover:bg-[#E4DDC7] border-[#D6D1B1]'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{draft.company.name}</span>
                    <span className="opacity-80 font-mono text-[10px]">
                      (₹{draft.total_amount.toLocaleString('en-IN')})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Company PO Content */}
            {selectedDraft && (
              <div className="bg-[#EEE8D5] rounded-2xl p-5 border border-[#D6D1B1] space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D6D1B1] pb-3 text-xs">
                  <div>
                    <h4 className="font-bold text-sm text-[#073642] flex items-center gap-2">
                      <span>{selectedDraft.company.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                        {selectedDraft.items.length} Line Item(s)
                      </span>
                    </h4>
                    <p className="text-[#586E75] mt-0.5">
                      Attn: {selectedDraft.company.contact_person || 'Sales Department'} ({selectedDraft.company.email})
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
                        <th className="pb-2 font-bold text-center">Quantity (Editable)</th>
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
                            {/* Inline Editable Quantity Field */}
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={
                                  activeBOMTab === 'whole_product'
                                    ? (rowQtyOverrides[item.catalogItem.id] ?? item.quantity)
                                    : (selectedCompQtyOverrides[item.catalogItem.id] ?? item.quantity)
                                }
                                onChange={e => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  if (activeBOMTab === 'whole_product') {
                                    setRowQtyOverrides(prev => ({ ...prev, [item.catalogItem.id]: val }));
                                  } else {
                                    setSelectedCompQtyOverrides(prev => ({ ...prev, [item.catalogItem.id]: val }));
                                  }
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-bold bg-[#FDF6E3] text-[#073642] border border-[#D6D1B1] rounded-lg text-center focus:outline-none focus:border-emerald-500 shadow-2xs"
                                title="Edit quantity to satisfy MOQ or batch adjustments"
                              />
                              <span className="text-[10px] text-[#586E75] font-semibold">
                                {item.catalogItem.uom || 'Pcs'}
                              </span>
                            </div>
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
                      Vendor Email {!editableContacts[selectedDraft.company.id]?.email && <span className="text-red-600 font-bold">*Required</span>}
                    </label>
                    <input
                      type="email"
                      value={editableContacts[selectedDraft.company.id]?.email || ''}
                      onChange={e => handleContactChange(selectedDraft.company.id, 'email', e.target.value)}
                      placeholder="sales@vendor.com"
                      className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#586E75] uppercase mb-0.5">
                      Vendor WhatsApp/Phone {!editableContacts[selectedDraft.company.id]?.phone && <span className="text-red-600 font-bold">*Required</span>}
                    </label>
                    <input
                      type="text"
                      value={editableContacts[selectedDraft.company.id]?.phone || ''}
                      onChange={e => handleContactChange(selectedDraft.company.id, 'phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl px-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Individual Dispatch Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDispatchSingleVendorWebmail(selectedDraft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B192C] hover:bg-[#1e3e62] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send this {orderType} via Webmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispatchSingleVendorWhatsApp(selectedDraft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white text-white" />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 bg-[#EEE8D5] border-t border-[#D6D1B1]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
              <input
                type="checkbox"
                checked={autoRecordOrders}
                onChange={e => setAutoRecordOrders(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span>Record dispatched {orderType}s to Database Timeline</span>
            </label>

            <div className="flex items-center gap-2 border-l border-[#D6D1B1] pl-4">
              <span className="font-bold text-[#586E75]">Bulk Channel:</span>
              <select
                value={dispatchChannel}
                onChange={e => setDispatchChannel(e.target.value as any)}
                className="bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="webmail">Native Webmail (Auto-Queued)</option>
                <option value="whatsapp">WhatsApp Direct Deep Links</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D6D1B1] text-xs font-bold text-[#586E75] hover:bg-[#E4DDC7] transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleMasterDispatch}
              disabled={isDispatching || activeDrafts.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white text-white" />
              <span>
                {isDispatching
                  ? 'Dispatching...'
                  : `1-Tap Dispatch ${activeDrafts.length} ${orderType}s (₹${totalCalculatedCost.toLocaleString('en-IN')})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
