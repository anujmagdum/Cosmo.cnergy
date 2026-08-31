import React, { useState, useMemo } from 'react';
import { ProcurementOrder, OrderStatus, STATUS_MAP, Company } from '../types';
import { PDFEditorModal } from './PDFEditorModal';
import { CsvManagerWidget } from './CsvManagerWidget';
import { History, Calendar, User, Search, CheckCircle, Edit3, Trash2, AlertCircle } from 'lucide-react';

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        o.order_number.toLowerCase().includes(term) ||
        (o.company?.name || '').toLowerCase().includes(term) ||
        (o.created_by || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  // Synchronous Delete Order Handler
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
            <span>Orders & Procurement Timeline</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Ultra-dense ladder order tracking, status management, vector PDF editor, and audit logs.
          </p>
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
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search order #, company, author..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#FDF6E3] border border-[#D6D1B1] rounded-xl pl-10 pr-4 py-2 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 transition-all shadow-sm font-medium"
          />
        </div>

        {/* Color-Coded Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'bg-[#FDF6E3] text-[#586E75] hover:bg-[#EEE8D5] border border-[#D6D1B1]'
            }`}
          >
            All ({orders.length})
          </button>

          {(Object.keys(STATUS_MAP) as OrderStatus[]).map(statusKey => {
            const cfg = STATUS_MAP[statusKey];
            const count = orders.filter(o => o.status === statusKey).length;

            return (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(statusKey)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-all cursor-pointer ${
                  filterStatus === statusKey
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} font-bold shadow-xs`
                    : 'bg-[#FDF6E3] text-[#586E75] hover:bg-[#EEE8D5] border-[#D6D1B1]'
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

      {/* Orders Ladder List (Strict Vertical Ladder Layout) */}
      <div className="space-y-2">
        <div className="bg-[#EEE8D5] rounded-3xl p-4 sm:p-6 border border-[#D6D1B1] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-[#073642] text-sm md:text-base flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <History className="w-4 h-4 text-emerald-600" />
                Procurement Document Registry ({filteredOrders.length})
              </h3>
              <span className="text-[11px] text-[#586E75] ml-6">Maximized density ladder view with bulk selection</span>
            </div>

            {selectedOrderIds.length > 0 && (
              <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-emerald-500 animate-in fade-in">
                <span className="text-xs font-bold text-[#073642] px-2">{selectedOrderIds.length} Selected</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isBulkDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
  
          <div className="flex flex-col space-y-2">
          {filteredOrders.map(order => {
            // Edit PDF always available for RFQ_SENT and PO Issued/Ordered
            const canEditPDF = order.status === 'ORDERED' || order.status === 'RFQ_SENT' || order.type === 'PO' || order.type === 'RFQ';
            const itemsCount = (order.items || []).length;
            const itemsSummary = (order.items || []).map(i => i.item?.name || 'Item').join(', ');

            return (
              <div
                key={order.id}
                className="w-full bg-[#FDF6E3] rounded-xl p-3 border border-[#D6D1B1] hover:border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all"
              >
                {/* Left: Checkbox, Order Type, Order #, Company, Items Summary */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    onChange={() => toggleSelectOne(order.id)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                  />

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                      order.type === 'PO' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {order.type}
                  </span>

                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs md:text-sm font-bold text-[#073642] font-mono truncate">{order.order_number}</h4>
                      <span className="text-[#586E75] text-[11px]">to</span>
                      <span className="text-emerald-800 text-xs font-bold truncate">{order.company?.name || 'General Company'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#EEE8D5] text-[#073642] font-semibold border border-[#D6D1B1] shrink-0">
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#586E75] truncate mt-0.5">
                      <span className="truncate max-w-[240px]">{itemsSummary || 'Standard components'}</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                      <span>•</span>
                      <span className="truncate">{order.created_by}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Dropdown, Total Amount, Conditional Edit PDF & Delete Trash */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D6D1B1]/60">
                  {/* Static Status Badge — auto-determined by order type */}
                  {(() => {
                    const cfg = STATUS_MAP[order.status] || STATUS_MAP['RFQ_SENT'];
                    return (
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} flex items-center gap-1.5 shrink-0`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </span>
                    );
                  })()}

                  {/* Total Amount */}
                  <div className="text-right">
                    <span className="text-[9px] text-[#586E75] uppercase font-semibold block">Total</span>
                    <span className="text-xs font-extrabold text-emerald-800 font-mono">
                      ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Actions: Edit PDF and Delete Trash Button */}
                  <div className="flex items-center gap-1">
                    {canEditPDF && (
                      <button
                        onClick={() => setEditingPDFOrder(order)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#1E3E62] text-white text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
                        title="Launch interactive vector PDF editor"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-400" />
                        <span>Edit PDF</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 rounded-lg bg-[#EEE8D5] hover:bg-red-100 text-[#586E75] hover:text-red-700 border border-[#D6D1B1] transition-all cursor-pointer"
                      title="Delete Order Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Order Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#FDF6E3] w-full max-w-md rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-4 text-[#073642]">
            <h3 className="text-lg font-bold text-red-700">Delete Procurement Order</h3>
            <p className="text-xs text-[#586E75]">
              Are you sure you want to delete order <span className="font-mono font-bold text-[#073642]">"{orderToDelete.order_number}"</span>? This will permanently delete the order and associated line items.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#EEE8D5] text-[#073642] text-xs font-semibold hover:bg-[#E4DDC7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => confirmDeleteOrder(orderToDelete)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Editor Modal */}
      {editingPDFOrder && (
        <PDFEditorModal
          order={editingPDFOrder}
          onClose={() => setEditingPDFOrder(null)}
          onSave={updatedOrder => {
            if (onUpdateOrder) {
              onUpdateOrder(updatedOrder);
            }
            setEditingPDFOrder(null);
          }}
        />
      )}
    </div>
  );
};
