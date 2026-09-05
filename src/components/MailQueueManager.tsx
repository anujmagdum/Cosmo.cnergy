import React from 'react';
import { useMailQueue } from '../context/MailQueueContext';
import { Mail, CheckCircle, XCircle, Clock, Play, RotateCcw, X, AlertCircle } from 'lucide-react';

export const MailQueueManager: React.FC = () => {
  const { queue, isProcessing, processQueue, retryFailed, clearQueue, removeQueueItem } = useMailQueue();

  const activeAccount = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cosmo_webmail_accounts');
      const accounts = saved ? JSON.parse(saved) : [];
      const activeEmail = localStorage.getItem('cosmo_webmail_active_email');
      return accounts.find((a: any) => a.email === activeEmail) || accounts[0] || {
        id: 'acc-procurement',
        email: 'procurement@cosmocnergy.com',
        senderName: 'CosmoCnergy Procurement',
      };
    } catch {
      return { email: 'procurement@cosmocnergy.com' };
    }
  }, []);

  if (queue.length === 0) return null;

  const successCount = queue.filter(q => q.status === 'success').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;
  const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'sending').length;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-[#0B192C] rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden z-[100] text-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-emerald-900/40 border-b border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm">Background Mail Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            {queue.length} Tasks
          </span>
          <button onClick={clearQueue} className="text-slate-800 hover:text-white p-1" title="Clear Queue">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="p-4 flex items-center justify-between bg-slate-900/50">
        <div className="flex gap-4 text-xs font-semibold">
          <span className="text-slate-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> {pendingCount}
          </span>
          <span className="text-slate-300 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> {successCount}
          </span>
          <span className="text-slate-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" /> {failedCount}
          </span>
        </div>

        <div className="flex gap-2">
          {failedCount > 0 && !isProcessing && (
            <button
              onClick={() => retryFailed(activeAccount)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 font-bold text-[10px] uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Failed
            </button>
          )}
          {pendingCount > 0 && !isProcessing && (
            <button
              onClick={() => processQueue(activeAccount)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Process Queue
            </button>
          )}
          {isProcessing && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-[10px] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Processing...
            </span>
          )}
        </div>
      </div>

      {/* Queue Items */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-2 bg-slate-900/30">
        {queue.map((item, index) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 text-slate-800 font-mono text-[10px]">
                {(index + 1).toString().padStart(2, '0')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-200 truncate">{item.company.name}</div>
                <div className="text-slate-800 text-[10px] truncate">{item.subject}</div>
                {item.error && <div className="text-red-400 text-[10px] mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {item.error}</div>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.status === 'pending' && <Clock className="w-4 h-4 text-slate-700" />}
              {item.status === 'sending' && <span className="w-4 h-4 rounded-full border-2 border-t-emerald-500 border-slate-600 animate-spin" />}
              {item.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
              
              <button onClick={() => removeQueueItem(item.id)} className="text-slate-700 hover:text-red-400 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
