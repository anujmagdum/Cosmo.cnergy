import React, { useState, useMemo } from 'react';
import { ProcurementOrder, OrderStatus, STATUS_MAP, Company } from '../types';
import { PDFEditorModal } from './PDFEditorModal';
import { CsvManagerWidget } from './CsvManagerWidget';
import { generateOrderPDF } from '../services/pdfService';
import {
  History,
  Calendar,
  User,
  Search,
  CheckCircle,
  FileEdit,
  Download,
  StickyNote,
  Mail,
  Trash2,
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  X,
  Save,
  MessageSquare
} from 'lucide-react';

interface Props {
  orders: ProcurementOrder[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (updatedOrder: ProcurementOrder) => void;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
  onOpenWhatsApp?: (company: Company, context?: string) => void;
  onOpenWebmail?: (company: Company, itemName?: string, specs?: string, qty?: number | string, context?: string, statusState?: string) => void;
  onImportOrders?: (rows: any[]) => Promise<number | void> | number | void;
}

export const OrderHistoryTimeline: React.FC<Props> = ({
  orders,
  onUpdateStatus,
  onUpdateOrder,
  onDeleteOrder,
  onOpenWhatsApp,
  onOpenWebmail,
  onImportOrders
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingPDFOrder, setEditingPDFOrder] = useState<ProcurementOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ProcurementOrder | null>(null);
  const [noteOrder, setNoteOrder] = useState<ProcurementOrder | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        o.order_number.toLowerCase().includes(term) ||
        (o.company?.name || '').toLowerCase().includes(term) ||
        (o.created_by || '').toLowerCase().includes(term) ||
        (o.notes || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  // Financial Metrics Summary (Datlion Cnergy Finance Style)
  const financialSummary = useMemo(() => {
    const totalCount = filteredOrders.length;
    const grossTotal = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const taxableSubtotal = grossTotal / 1.18;
    const estimatedGst = grossTotal - taxableSubtotal;
    const poCount = filteredOrders.filter(o => o.type === 'PO').length;
    const rfqCount = filteredOrders.filter(o => o.type === 'RFQ').length;

    return {
      totalCount,
      grossTotal,
      taxableSubtotal,
      estimatedGst,
      poCount,
      rfqCount
    };
  }, [filteredOrders]);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!onDeleteOrder) return;
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders?`)) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedOrderIds) {
        await onDeleteOrder(id);
      }
      setSelectedOrderIds([]);
      setToastFeedback({ type: 'success', message: 'Bulk delete successful.' });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (e: any) {
      setToastFeedback({ type: 'error', message: `Bulk delete failed: ${e?.message || 'Error'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Synchronous Delete Single Order Handler
  const confirmDeleteOrder = async (order: ProcurementOrder) => {
    if (!onDeleteOrder) return;
    setIsDeleting(true);
    try {
      await onDeleteOrder(order.id);
      setOrderToDelete(null);
      setToastFeedback({ type: 'success', message: `Order "${order.order_number}" deleted successfully.` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Delete order failed:', err);
      setToastFeedback({ type: 'error', message: `Delete failed: ${err.message || 'Failed to delete order'}` });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // One-Click Direct PDF Download via jsPDF & jspdf-autotable
  const handleDownloadDirectPDF = async (order: ProcurementOrder) => {
    setIsDownloadingPdf(order.id);
    try {
      await generateOrderPDF(order);
      setToastFeedback({ type: 'success', message: `PDF for ${order.order_number} generated & downloaded successfully!` });
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      setToastFeedback({ type: 'error', message: 'PDF Download failed: ' + (err.message || err) });
      setTimeout(() => setToastFeedback(null), 4000);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  // Open Note Modal
  const handleOpenNoteModal = (order: ProcurementOrder) => {
    setNoteOrder(order);
    setNoteText(order.notes || '');
  };

  // Save Note
  const handleSaveNote = () => {
    if (!noteOrder || !onUpdateOrder) return;
    const updated: ProcurementOrder = {
      ...noteOrder,
      notes: noteText
    };
    onUpdateOrder(updated);
    setNoteOrder(null);
    setToastFeedback({ type: 'success', message: `Notes updated for ${noteOrder.order_number}` });
    setTimeout(() => setToastFeedback(null), 3000);
  };

  // Direct Send Mail Trigger
  const handleSendMail = (order: ProcurementOrder) => {
    if (!onOpenWebmail) return;
    const company = order.company || {
      id: order.company_id || 'comp-unknown',
      name: 'Vendor Partner',
      email: 'vendor.sales@company.com',
      contact_person: 'Sales Lead',
      phone: '+91 98765 43210'
    };
    const itemsSummary = (order.items || []).map(i => i.item?.name || 'Component').join(', ');
    const qtySummary = (order.items || []).reduce((acc, i) => acc + (i.quantity || 0), 0);

    onOpenWebmail(
      company,
      itemsSummary || `${order.type} Order ${order.order_number}`,
      `Order ${order.order_number} - Total ₹${Number(order.total_amount).toLocaleString('en-IN')}`,
      qtySummary || 100,
      order.type,
      order.status
    );
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback Notification */}
      {toastFeedback && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce text-white font-bold text-sm ${
            toastFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toastFeedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{toastFeedback.message}</span>
        </div>
      )}

      {/* Primary Action Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl bg-[#0B192C] text-white shadow-md">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="w-7 h-7 text-emerald-400" />
            <span>Procurement & Invoice Summary</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Datlion Cnergy finance registry, vector PDF generation (jsPDF / autotable), note logging, and dispatch actions.
          </p>
        </div>
      </div>

      {/* Datlion Cnergy Finance Summary KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Invoices / Orders */}
        <div className="bg-[white] p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Total Orders / Invoices</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-[#0f172a] font-mono">{financialSummary.totalCount}</div>
            <div className="text-[11px] text-[#64748b] mt-0.5 flex items-center gap-1.5 font-semibold">
              <span className="text-purple-700">{financialSummary.poCount} POs</span>
              <span>•</span>
              <span className="text-emerald-700">{financialSummary.rfqCount} RFQs</span>
            </div>
          </div>
        </div>

        {/* Taxable Subtotal (Excl. GST) */}
        <div className="bg-[white] p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Taxable Subtotal (Excl. GST)</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-[#0f172a] font-mono">
              ₹{financialSummary.taxableSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-[#64748b] mt-0.5 font-semibold">Base procurement valuation</div>
          </div>
        </div>

        {/* Estimated GST (18%) */}
        <div className="bg-[white] p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Estimated GST (18%)</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-amber-900 font-mono">
              ₹{financialSummary.estimatedGst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-[#64748b] mt-0.5 font-semibold">Standard 18% tax credit</div>
          </div>
        </div>

        {/* Grand Total Value */}
        <div className="bg-gradient-to-br from-emerald-900 to-[#0f172a] p-4 rounded-2xl border border-emerald-600/40 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Grand Total Spend</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-emerald-300 font-mono">
              ₹{financialSummary.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5 font-semibold">Gross dispatched order volume</div>
          </div>
        </div>
      </div>

      {/* Decoupled Independent CSV Manager Widget */}
      <CsvManagerWidget
        sectionType="orders"
        data={filteredOrders}
        onImport={async rows => {
          if (onImportOrders) {
            return await onImportOrders(rows);
          }
          return rows.length;
        }}
      />

      {/* Status Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search order #, issuer, receiver, notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[white] border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-emerald-500 transition-all shadow-xs font-medium placeholder-[#64748b]"
          />
        </div>

        {/* Color-Coded Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-[white] text-[#64748b] hover:bg-[white] border border-[#e2e8f0]'
            }`}
          >
            All ({orders.length})
          </button>

          {(['RFQ_SENT', 'ORDERED'] as OrderStatus[]).map(statusKey => {
            const cfg = STATUS_MAP[statusKey];
            const count = orders.filter(o => o.status === statusKey).length;

            return (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(statusKey)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-all cursor-pointer ${
                  filterStatus === statusKey
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} font-bold shadow-xs`
                    : 'bg-[white] text-[#64748b] hover:bg-[white] border-[#e2e8f0]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                <span>{cfg.label}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Datlion Cnergy Finance Summary Table Section */}
      <div className="bg-[white] rounded-3xl p-4 sm:p-6 border border-[#e2e8f0] shadow-xl space-y-3">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-[#0f172a] text-sm md:text-base">
              Finance & Procurement Summary Registry ({filteredOrders.length})
            </h3>
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-xs border border-emerald-500 animate-in fade-in">
              <span className="text-xs font-bold text-[#0f172a]">{selectedOrderIds.length} Selected</span>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulkDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-[white]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#e2e8f0] text-[#0f172a] font-black uppercase text-[10px] tracking-wider border-b border-[#e2e8f0]">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                </th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Issuer</th>
                <th className="py-3 px-3.5">Receiver</th>
                <th className="py-3 px-3.5">Inv #</th>
                <th className="py-3 px-3.5 text-right">Taxable</th>
                <th className="py-3 px-3.5 text-right">Total</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748b] font-semibold text-xs">
                    No procurement orders or invoices match your filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const gross = Number(order.total_amount) || 0;
                  const taxable = gross / 1.18;
                  const dateObj = order.created_at ? new Date(order.created_at) : new Date();
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const issuerName = order.created_by || 'Cosmo Cnergy Lead';
                  const receiverName = order.company?.name || 'General Supplier';
                  const statusCfg = STATUS_MAP[order.status] || STATUS_MAP['RFQ_SENT'];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[white]/60 transition-colors group/row"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleSelectOne(order.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Issuer */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                          <span className="font-bold text-[#0f172a] truncate max-w-[140px]" title={issuerName}>
                            {issuerName}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748b] block truncate">Cosmo.cnergy HQ</span>
                      </td>

                      {/* Receiver */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="font-bold text-emerald-900 truncate max-w-[170px]" title={receiverName}>
                            {receiverName}
                          </span>
                        </div>
                        {order.company?.contact_person && (
                          <span className="text-[10px] text-[#64748b] block truncate">
                            Attn: {order.company.contact_person}
                          </span>
                        )}
                      </td>

                      {/* Inv # / Order # */}
                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              order.type === 'PO'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {order.type}
                          </span>
                          <span className="font-mono font-bold text-[#0f172a] text-xs">{order.order_number}</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[9px] font-extrabold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </span>
                        </div>
                      </td>

                      {/* Taxable */}
                      <td className="py-3 px-3.5 align-middle text-right whitespace-nowrap font-mono">
                        <span className="text-xs font-bold text-[#0f172a]">
                          ₹{taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-[#64748b] block">excl. 18% GST</span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 align-middle text-right whitespace-nowrap font-mono">
                        <span className="text-xs font-black text-emerald-800">
                          ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-emerald-600 font-semibold block">incl. GST</span>
                      </td>

                      {/* Actions: Edit PDF, Download PDF, Add Note, Send Mail */}
                      <td className="py-3 px-3.5 align-middle text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Edit PDF Icon (uses jsPDF, jspdf-autotable, html2pdf.js) */}
                          <button
                            type="button"
                            onClick={() => setEditingPDFOrder(order)}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Edit PDF (Interactive vector editor with jsPDF & autotable)"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Download PDF Icon */}
                          <button
                            type="button"
                            disabled={isDownloadingPdf === order.id}
                            onClick={() => handleDownloadDirectPDF(order)}
                            className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            title="Download Vector PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Add / View Note Icon */}
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(order)}
                            className={`p-1.5 rounded-lg border shadow-2xs active:scale-95 transition-all cursor-pointer ${
                              order.notes && order.notes.trim().length > 0
                                ? 'bg-amber-200 text-amber-950 border-amber-400 font-bold'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                            title={order.notes ? `View/Edit Note: "${order.notes}"` : 'Add Note / Logistics Instructions'}
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Send Mail Icon */}
                          <button
                            type="button"
                            onClick={() => handleSendMail(order)}
                            className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Compose & Send Webmail to Vendor"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. Delete Order Icon */}
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            className="p-1.5 rounded-lg bg-[white] hover:bg-red-100 text-[#64748b] hover:text-red-700 border border-[#e2e8f0] shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Delete Order Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Note / Remarks Modal */}
      {noteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[white] w-full max-w-lg rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 text-[#0f172a] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-[#0f172a]">
                  Order Notes & Instructions — <span className="font-mono">{noteOrder.order_number}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteOrder(null)}
                className="p-1.5 rounded-xl hover:bg-[white] text-[#64748b] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748b] block mb-1.5">
                Remarks, Delivery Instructions, Logistics Tracking & Internal Notes
              </label>
              <textarea
                rows={5}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Enter special procurement instructions, GST invoices, courier tracking numbers, or dispatch notes..."
                className="w-full bg-white border border-[#e2e8f0] rounded-2xl p-3.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-500 shadow-inner font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setNoteOrder(null)}
                className="px-4 py-2 rounded-xl bg-[white] text-[#0f172a] text-xs font-bold hover:bg-[#e2e8f0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[white] w-full max-w-md rounded-3xl p-6 border border-[#e2e8f0] shadow-2xl space-y-4 text-[#0f172a] animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-red-700">Delete Procurement Order</h3>
            <p className="text-xs text-[#64748b]">
              Are you sure you want to delete order <span className="font-mono font-bold text-[#0f172a]">"{orderToDelete.order_number}"</span>? This will permanently delete the order record from the registry.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[white] text-[#0f172a] text-xs font-bold hover:bg-[#e2e8f0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmDeleteOrder(orderToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Editor Modal (using jsPDF, jspdf-autotable, html2pdf.js) */}
      {editingPDFOrder && (
        <PDFEditorModal
          order={editingPDFOrder}
          onClose={() => setEditingPDFOrder(null)}
          onSave={updatedOrder => {
            if (onUpdateOrder) {
              onUpdateOrder(updatedOrder);
            }
            setEditingPDFOrder(null);
            setToastFeedback({ type: 'success', message: `Order "${updatedOrder.order_number}" PDF updated successfully!` });
            setTimeout(() => setToastFeedback(null), 3500);
          }}
        />
      )}
    </div>
  );
};
