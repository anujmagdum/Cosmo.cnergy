import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CosmoCnergy ErrorBoundary Caught Exception]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      const keysToRemove = [
        'cosmo_catalog',
        'cosmo_companies',
        'cosmo_boms',
        'cosmo_folders',
        'cosmo_orders',
        'cosmo_component_companies',
        'cosmo_mail_draft_queue'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F2F5] text-[#0C0D0E] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#0b6623] flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8 text-[#0b6623]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#0C0D0E] tracking-tight">
                Cosmo<span className="text-[#0b6623]">Cnergy</span> Recovery
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                An unexpected interface exception occurred. Your data has been preserved in local storage.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-[#F0F2F5] border border-[#E2E8F0] rounded-xl text-left font-mono text-[11px] text-slate-700 max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0b6623] hover:bg-[#084d1a] text-white font-bold text-xs shadow-md shadow-[#0b6623]/25 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Local Cache & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}