import React, { useState, useEffect, useRef } from 'react';
import { Zap, LogOut, LogIn, User, PlusCircle, Sparkles, Truck, Layers, History, Search, Mail, ChevronDown, ShieldCheck, Building2 } from 'lucide-react';

interface Props {
  activeTab: 'catalog' | 'suppliers' | 'ai' | 'orders' | 'webmail';
  setActiveTab: (tab: 'catalog' | 'suppliers' | 'ai' | 'orders' | 'webmail') => void;
  onOpenBOMModal: () => void;
  onOpenSearch: () => void;
  userName: string;
  userEmail?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenBOMModal,
  onOpenSearch,
  userName,
  userEmail = 'anuj@cosmocnergy.com',
  onOpenAuth,
  onLogout
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayEmail = userEmail || (userName ? `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}@cosmocnergy.com` : '');
  const userInitial = (userName ? userName.charAt(0) : (displayEmail ? displayEmail.charAt(0) : 'U')).toUpperCase();

  // Navigation Items: Orders as First/Main Item, AI Studio as Final Highlighted Item
  const navItems = [
    { id: 'orders' as const, label: 'Orders', icon: History, isAi: false },
    { id: 'catalog' as const, label: 'Components & Products', icon: Layers, isAi: false },
    { id: 'suppliers' as const, label: 'Suppliers', icon: Truck, isAi: false },
    { id: 'webmail' as const, label: 'Webmail', icon: Mail, isAi: false },
    { id: 'ai' as const, label: 'AI Studio', icon: Sparkles, isAi: true },
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-[#1e3e62] px-4 lg:px-8 py-2.5 bg-[#0B192C] select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand Logo & Mobile Profile Dropdown Trigger */}
        <div className="flex items-center justify-between shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setActiveTab('orders')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center emerald-glow shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                COSMO<span className="text-emerald-400">CNERGY</span>
              </span>
            </div>
          </div>

          {/* Mobile User Profile & Search Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl bg-[#1e3e62]/70 border border-slate-700 text-slate-300 active:scale-95"
              title="Search"
            >
              <Search className="w-4 h-4 text-emerald-400" />
            </button>

            {userName ? (
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1e3e62]/70 border border-slate-700 text-white active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {userInitial}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Reordered Navigation Bar with Standout AI Studio Pill */}
        <nav className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 p-1 rounded-2xl bg-[#071322]/80 border border-slate-800/80 shadow-inner">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Standout styling for AI Studio
            if (item.isAi) {
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all relative group overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 text-white shadow-lg shadow-purple-500/40 ring-2 ring-pink-400/60 scale-[1.03]'
                      : 'bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-pink-950/70 hover:from-purple-900 hover:via-indigo-900 hover:to-pink-900 text-purple-200 hover:text-white border border-purple-500/40 shadow-sm shadow-purple-500/20 hover:scale-[1.02]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 text-pink-300 group-hover:rotate-12 transition-transform ${isActive ? 'animate-spin-slow' : ''}`} />
                  <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-white bg-clip-text text-transparent font-black">
                    {item.label}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping absolute top-1.5 right-1.5" />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/40'
                    : 'bg-[#10243E]/60 hover:bg-[#1E3E62] text-slate-300 hover:text-white border border-slate-700/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Master Compact Search + BOM Action + Profile Badge */}
        <div className="flex items-center justify-end gap-2.5 shrink-0" ref={dropdownRef}>
          {/* Master Search Widget */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-[#071322] hover:bg-[#10243E] border border-slate-700/80 hover:border-emerald-500/60 text-slate-300 hover:text-white transition-all text-xs group shadow-inner"
            title="Open Master Search (Ctrl + K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-slate-300 group-hover:text-white">Quick Search</span>
            </div>
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono text-[10px] text-emerald-400 font-bold">
              Ctrl+K
            </kbd>
          </button>

          {/* 1-Tap BOM Procurement Button */}
          <button
            onClick={onOpenBOMModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">1-Tap BOM PO</span>
            <span className="md:hidden">BOM PO</span>
          </button>

          {/* User Profile Badge (Desktop) */}
          {userName ? (
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#1e3e62]/70 hover:bg-[#1e3e62] border border-slate-700/80 transition-all text-left group active:scale-95 overflow-hidden"
                title="User Profile & Session"
              >
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors truncate max-w-[120px]">
                    {displayEmail}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                    {userName.split(' ')[0]}
                  </span>
                </div>

                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-emerald-500/30 shrink-0">
                  {userInitial}
                </div>

                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Interactive Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0B192C] border border-slate-700 shadow-2xl p-3 text-xs space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {userInitial}
                      </div>
                      <div className="truncate min-w-0">
                        <div className="font-bold text-white text-xs truncate">{userName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Supabase Active
                      </span>
                      <span>Solarized Light</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Session Control
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Profile Dropdown Menu Drawer */}
      {isProfileDropdownOpen && userName && (
        <div className="md:hidden mt-2 p-3 rounded-2xl bg-[#071322] border border-slate-700 shadow-xl space-y-3 overflow-hidden">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="truncate min-w-0">
              <div className="font-bold text-white text-xs truncate">{userName}</div>
              <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
            </div>
          </div>
          <button
            onClick={() => {
              setIsProfileDropdownOpen(false);
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 text-red-400 font-bold text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Session</span>
          </button>
        </div>
      )}
    </header>
  );
};
