import React, { useState, useEffect } from 'react';
import { ProcurementOrder, OrderItem, OrderStatus, Company } from '../types';
import { generateOrderPDF, generateOrderPDFBlobUri } from '../services/pdfService';
import { X, FileText, Download, Save, Plus, Trash2, Building2, RefreshCw, Eye, Edit3, CheckCircle2 } from 'lucide-react';

interface Props {
  order: ProcurementOrder;
  onClose: () => void;
  onSave: (updatedOrder: ProcurementOrder) => void;
}

export const PDFEditorModal: React.FC<Props> = ({ order, onClose, onSave }) => {
  const [editableOrder, setEditableOrder] = useState<ProcurementOrder>(() => ({
    ...order,
    company: order.company ? { ...order.company } : undefined,
    items: (order.items || []).map(it => ({
      ...it,
      item: it.item ? { ...it.item } : undefined
    }))
  }));

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recalculate totals and generate vector PDF blob URL
  useEffect(() => {
    const grandTotal = (editableOrder.items || []).reduce(
      (sum, it) => sum + (Number(it.total_price) || 0),
      0
    );

    const updatedWithTotal = {
      ...editableOrder,
      total_amount: grandTotal
    };

    try {
      const url = generateOrderPDFBlobUri(updatedWithTotal);
      setPdfPreviewUrl(url);

      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('Failed to generate PDF vector preview:', e);
    }
  }, [
    editableOrder.order_number,
    editableOrder.type,
    editableOrder.status,
    editableOrder.created_by,
    editableOrder.notes,
    editableOrder.company,
    editableOrder.items
  ]);

  // Line Item Update Helper
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...(editableOrder.items || [])];
    const currentItem = { ...updatedItems[index] };

    if (field === 'name') {
      currentItem.item = { ...(currentItem.item || { id: `cat-${Date.now()}`, sku: 'SKU', specs: '', uom: 'Pcs', preset_price: 100, company_id: '', min_order_qty: 1, in_stock_qty: 100, procurement_status: 'TO_BE_ORDERED' }), name: value };
    } else if (field === 'sku') {
      currentItem.item = { ...(currentItem.item || { id: `cat-${Date.now()}`, name: 'Item', specs: '', uom: 'Pcs', preset_price: 100, company_id: '', min_order_qty: 1, in_stock_qty: 100, procurement_status: 'TO_BE_ORDERED' }), sku: value };
    } else if (field === 'specs') {
      currentItem.item = { ...(currentItem.item || { id: `cat-${Date.now()}`, name: 'Item', sku: 'SKU', uom: 'Pcs', preset_price: 100, company_id: '', min_order_qty: 1, in_stock_qty: 100, procurement_status: 'TO_BE_ORDERED' }), specs: value };
    } else if (field === 'quantity') {
      const qty = Number(value) || 0;
      currentItem.quantity = qty;
      currentItem.total_price = qty * (Number(currentItem.unit_price) || 0);
    } else if (field === 'unit_price') {
      const price = Number(value) || 0;
      currentItem.unit_price = price;
      currentItem.total_price = (Number(currentItem.quantity) || 0) * price;
    } else if (field === 'uom') {
      currentItem.item = { ...(currentItem.item || { id: `cat-${Date.now()}`, name: 'Item', sku: 'SKU', specs: '', preset_price: 100, company_id: '', min_order_qty: 1, in_stock_qty: 100, procurement_status: 'TO_BE_ORDERED' }), uom: value };
    }

    updatedItems[index] = currentItem;
    setEditableOrder({
      ...editableOrder,
      items: updatedItems,
      total_amount: updatedItems.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
    });
  };

  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: `oi-${Date.now()}`,
      order_id: editableOrder.id,
      item_id: `cat-${Date.now()}`,
      quantity: 1,
      unit_price: 100,
      total_price: 100,
      item: {
        id: `cat-${Date.now()}`,
        sku: `SKU-${Date.now().toString().slice(-4)}`,
        name: 'New Component',
        specs: 'Standard Specification',
        uom: 'Pcs',
        preset_price: 100,
        company_id: editableOrder.company_id,
        min_order_qty: 1,
        in_stock_qty: 100,
        procurement_status: 'TO_BE_ORDERED'
      }
    };

    const updated = [...(editableOrder.items || []), newItem];
    setEditableOrder({
      ...editableOrder,
      items: updated,
      total_amount: updated.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
    });
  };

  const handleRemoveItem = (index: number) => {
    const updated = (editableOrder.items || []).filter((_, i) => i !== index);
    setEditableOrder({
      ...editableOrder,
      items: updated,
      total_amount: updated.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
    });
  };

  const handleSave = () => {
    onSave(editableOrder);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownload = async () => {
    await generateOrderPDF(editableOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#EEE8D5] w-full max-w-7xl h-[94vh] rounded-3xl border border-[#D6D1B1] shadow-2xl flex flex-col overflow-hidden my-auto text-[#073642]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D6D1B1]/60 bg-[#0B192C] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  Edit PDF Document: #{editableOrder.order_number}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {editableOrder.type}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Interactive Vector PDF Editor & Live Preview • Datlion Cnergy Vector Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher on Mobile/Tablet */}
            <div className="hidden sm:flex md:hidden items-center bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${activeTab === 'editor' ? 'bg-emerald-600 text-white' : 'text-slate-800'}`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${activeTab === 'preview' ? 'bg-emerald-600 text-white' : 'text-slate-800'}`}
              >
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-800 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-all font-bold"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split Body: Left Editor / Right Live Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[#EEE8D5]">
          {/* Left Column: Form Editor */}
          <div className={`md:col-span-6 lg:col-span-6 p-6 overflow-y-auto space-y-6 border-r border-[#D6D1B1] ${activeTab === 'preview' ? 'hidden md:block' : 'block'}`}>
            {/* 1. Document Parameters */}
            <div className="p-4 rounded-2xl bg-[#FDF6E3] border border-[#D6D1B1] shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D6D1B1]/60 pb-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Document & Routing Parameters</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Document #</label>
                  <input
                    type="text"
                    value={editableOrder.order_number}
                    onChange={e => setEditableOrder({ ...editableOrder, order_number: e.target.value })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Document Type</label>
                  <select
                    value={editableOrder.type}
                    onChange={e => setEditableOrder({ ...editableOrder, type: e.target.value as 'PO' | 'RFQ' })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PO">Purchase Order (PO)</option>
                    <option value="RFQ">Request for Quotation (RFQ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Order Status</label>
                  <select
                    value={editableOrder.status}
                    onChange={e => setEditableOrder({ ...editableOrder, status: e.target.value as OrderStatus })}
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TO_BE_ORDERED">🟡 To Be Ordered</option>
                    <option value="RFQ_SENT">🔵 RFQ Sent</option>
                    <option value="ORDERED">🟣 Ordered / PO Issued</option>
                    <option value="DELIVERED">🟢 Delivered</option>
                    <option value="ON_HOLD">🔴 On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Company Vendor Entity */}
            <div className="p-4 rounded-2xl bg-[#FDF6E3] border border-[#D6D1B1] shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D6D1B1]/60 pb-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Company / Vendor Entity</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Company / Entity Name</label>
                  <input
                    type="text"
                    value={editableOrder.company?.name || ''}
                    onChange={e =>
                      setEditableOrder({
                        ...editableOrder,
                        company: {
                          ...(editableOrder.company || { id: 'supp-1', email: '', contact_person: '', phone: '', whatsapp: '' }),
                          name: e.target.value
                        }
                      })
                    }
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Attn Contact Person</label>
                  <input
                    type="text"
                    value={editableOrder.company?.contact_person || ''}
                    onChange={e =>
                      setEditableOrder({
                        ...editableOrder,
                        company: {
                          ...(editableOrder.company || { id: 'supp-1', name: '', email: '', phone: '', whatsapp: '' }),
                          contact_person: e.target.value
                        }
                      })
                    }
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={editableOrder.company?.email || ''}
                    onChange={e =>
                      setEditableOrder({
                        ...editableOrder,
                        company: {
                          ...(editableOrder.company || { id: 'supp-1', name: '', contact_person: '', phone: '', whatsapp: '' }),
                          email: e.target.value
                        }
                      })
                    }
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#073642] mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={editableOrder.company?.phone || ''}
                    onChange={e =>
                      setEditableOrder({
                        ...editableOrder,
                        company: {
                          ...(editableOrder.company || { id: 'supp-1', name: '', email: '', contact_person: '', whatsapp: '' }),
                          phone: e.target.value
                        }
                      })
                    }
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#073642] mb-1">Plant / Dispatch Address</label>
                  <input
                    type="text"
                    value={editableOrder.company?.address || ''}
                    onChange={e =>
                      setEditableOrder({
                        ...editableOrder,
                        company: {
                          ...(editableOrder.company || { id: 'supp-1', name: '', email: '', contact_person: '', phone: '', whatsapp: '' }),
                          address: e.target.value
                        }
                      })
                    }
                    className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-[#073642] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Line Items Editor */}
            <div className="p-4 rounded-2xl bg-[#FDF6E3] border border-[#D6D1B1] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-2">
                <h4 className="text-xs font-bold text-[#073642] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Order Line Items ({editableOrder.items?.length || 0})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 text-xs font-bold border border-emerald-500/30 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {(editableOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#073642]">Line #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#586E75]">Item Name</label>
                        <input
                          type="text"
                          value={item.item?.name || ''}
                          onChange={e => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-[#073642] font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#586E75]">SKU Code</label>
                        <input
                          type="text"
                          value={item.item?.sku || ''}
                          onChange={e => handleItemChange(idx, 'sku', e.target.value)}
                          className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-[#073642] font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-[#586E75]">Technical Specs</label>
                      <input
                        type="text"
                        value={item.item?.specs || ''}
                        onChange={e => handleItemChange(idx, 'specs', e.target.value)}
                        className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-[#073642]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="text-[10px] font-semibold text-[#586E75] block mb-1">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-[#073642] font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#586E75] block mb-1">Unit Rate (INR)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-[#073642] font-mono font-bold text-right focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#586E75] block mb-1">Line Total</label>
                        <div className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-lg px-2.5 py-1.5 text-emerald-800 font-mono font-bold text-right truncate overflow-hidden">
                          ₹{Number(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Terms & Notes */}
            <div className="p-4 rounded-2xl bg-[#FDF6E3] border border-[#D6D1B1] shadow-xs space-y-3">
              <label className="block text-xs font-bold text-[#073642] uppercase tracking-wider">
                Terms & Special Instructions
              </label>
              <textarea
                rows={3}
                value={editableOrder.notes || ''}
                onChange={e => setEditableOrder({ ...editableOrder, notes: e.target.value })}
                placeholder="1. Please confirm dispatch schedule within 24 hours of receipt..."
                className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Right Column: Live Vector Preview */}
          <div className={`md:col-span-6 lg:col-span-6 p-4 md:p-6 flex flex-col overflow-hidden bg-[#EEE8D5] ${activeTab === 'editor' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-[#073642]">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Live Vector PDF Preview (Selectable Text)</span>
              </span>
              <span className="text-[11px] font-semibold text-[#586E75]">
                100% Vector Engine
              </span>
            </div>

            <div className="flex-1 bg-[#FDF6E3] rounded-2xl shadow-xl overflow-hidden border border-[#D6D1B1]">
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full border-0 rounded-2xl"
                  title="PDF Vector Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[#586E75] text-xs">
                  Generating vector preview...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="px-6 py-4 border-t border-[#D6D1B1] bg-[#FDF6E3] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-emerald-800 text-xs font-bold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Changes Saved to Database & Orders State!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-semibold text-xs transition-all border border-[#D6D1B1]"
            >
              Close Editor
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
