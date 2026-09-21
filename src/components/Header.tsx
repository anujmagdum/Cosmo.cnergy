import React, { useState, useEffect, useRef } from 'react';
import { Zap, LogOut, LogIn, PlusCircle, ShoppingBag, Package, Building2, Mail, ChevronDown } from 'lucide-react';
import { NavigationTab } from '../types';

interface Props {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenBOMModal: () => void;
  onOpenSearch: () => void;
  userName: string;
  userEmail?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  ordersCount?: number;
  catalogCount?: number;
  companiesCount?: number;
  alertsCount?: number;
  mailQueueCount?: number;
  onOpenAddFolder?: () => void;
  onOpenAddCatalog?: () => void;
  onOpenAddCompany?: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenBOMModal,
  onOpenSearch,
  userName,
  userEmail,
  onOpenAuth,
  onLogout,
  ordersCount = 0,
  catalogCount = 0,
  companiesCount = 0,
  alertsCount = 0,
  mailQueueCount = 0,
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

  const displayEmail =
    userEmail ||
    localStorage.getItem('cosmo_user_email') ||
    (userName ? `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}@cosmocnergy.com` : 'anujmagdum@cnergy.co.in');

  const userInitial = (
    userName ? userName.charAt(0) : (displayEmail ? displayEmail.charAt(0) : 'A')
  ).toUpperCase();

  // Navigation Items matching the reference UI/UX
  const navItems = [
    { id: 'procurement' as const, label: 'Procurement', icon: ShoppingBag, count: ordersCount, alert: false },
    { id: 'inventory' as const, label: 'Inventory', icon: Package, count: catalogCount, alert: alertsCount > 0 },
    { id: 'companies' as const, label: 'Companies', icon: Building2, count: companiesCount, alert: false },
    { id: 'webmail' as const, label: 'Webmail', icon: Mail, count: mailQueueCount > 0 ? mailQueueCount : undefined, alert: mailQueueCount > 0 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#08090B] border-b border-[#1C1E22] select-none shadow-xl overflow-x-clip">
      <div className="max-w-7xl 2xl:max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        {/* Desktop Single-Row Header (h-14) / Mobile & Tablet Top Row */}
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 min-w-0">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
            onClick={() => setActiveTab('procurement')}
          >
            <div className="w-8 h-8 rounded-xl bg-[#8db600] flex items-center justify-center shadow-md shadow-[#8db600]/25 group-hover:scale-105 transition-transform">
              <Zap className="w-4.5 h-4.5 text-black fill-black" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-sans">
                COSMO<span className="text-[#8db600]">CNERGY</span>
              </span>
              <span className="hidden xl:inline-block ml-2 text-[10px] font-medium tracking-wide text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                Procurement OS
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop Wide >= 1280px) */}
          <nav className="hidden xl:flex items-center h-full gap-1.5 2xl:gap-2.5 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative h-full flex items-center gap-1.5 2xl:gap-2 px-3 2xl:px-4 text-xs 2xl:text-sm font-semibold transition-colors duration-150 shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#8db600]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors duration-150 ${
                      isActive
                        ? 'text-[#8db600]'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
                        isActive
                          ? 'bg-[#8db600]/20 text-[#8db600] border border-[#8db600]/40'
                          : 'bg-[#1C1E22] text-slate-400 group-hover:text-white border border-slate-700/60'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.alert && (
                    <span
                      className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse ml-0.5"
                      title="Action alert available"
                    />
                  )}

                  {/* Active Apple Green Bottom Indicator Bar */}
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#8db600] rounded-t-sm shadow-[0_-1px_8px_rgba(141,182,0,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Section: Action Pill + User Profile Pill + Standalone Logout Icon */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3 shrink-0 min-w-0" ref={dropdownRef}>
            {/* 1-Tap BOM PO Action Button (Green Pill matching Reference) */}
            <button
              onClick={onOpenBOMModal}
              className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 px-2.5 sm:px-3 xl:px-4 py-1.5 rounded-full bg-[#8db600] hover:bg-[#709200] text-black font-extrabold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
              title="1-Tap Multi-Company BOM Procurement Engine"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.5]" />
              <span className="hidden xl:inline">1-Tap BOM PO</span>
              <span className="xl:hidden text-[11px] sm:text-xs">BOM PO</span>
            </button>

            {/* User Profile Pill */}
            {userName || displayEmail ? (
              <div className="relative min-w-0 shrink">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 px-2 sm:px-2.5 xl:px-3 py-1 rounded-full bg-[#0E131B] hover:bg-[#151D29] border border-[#1F293B] transition-all text-left group active:scale-95 cursor-pointer shadow-sm min-w-0 shrink max-w-full"
                  title="User Profile & Session Details"
                >
                  {/* Circle Avatar with Apple Green fill and black bold letter */}
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#8db600] text-black flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                    {userInitial}
                  </div>

                  {/* Two-Line Stacked Identity Text */}
                  <div className="hidden sm:flex flex-col text-left justify-center min-w-0 pr-0.5">
                    <span className="text-white font-bold text-xs leading-none truncate max-w-[75px] sm:max-w-[95px] lg:max-w-[115px] xl:max-w-[175px] group-hover:text-white transition-colors">
                      {displayEmail}
                    </span>
                    <span className="text-[#8db600] font-black text-[9px] uppercase tracking-wider leading-none mt-1">
                      BILLING & OPS
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-3 h-3 text-slate-400 group-hover:text-white transition-transform shrink-0 ${
                      isProfileDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Details Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0C0D0E] border border-slate-700 shadow-2xl p-3 text-xs space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                    <div className="p-2.5 rounded-xl bg-[#141618] border border-[#23262B] space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#8db600] text-black flex items-center justify-center font-black text-xs shrink-0">
                          {userInitial}
                        </div>
                        <div className="truncate min-w-0">
                          <div className="font-bold text-white text-xs truncate">
                            {userName || displayEmail.split('@')[0]}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{displayEmail}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#23262B] flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-[#8db600] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8db600] animate-pulse" />
                          BILLING & OPS
                        </span>
                        <span className="text-slate-400 font-medium">Cosmo Cnergy</span>
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
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#8db600] hover:bg-[#709200] text-xs font-black text-black transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>Login</span>
              </button>
            )}

            {/* Dedicated Standalone Logout Icon Button (matching Reference on far right) */}
            <button
              onClick={onLogout}
              title="Log Out Session"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all rounded-xl cursor-pointer flex items-center justify-center shrink-0"
            >
              <LogOut className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Laptops, Tablets & Mobile Navigation Tabs Row (Clean Dedicated Row < 1280px) */}
        <div className="xl:hidden flex items-center justify-start md:justify-center h-11 border-t border-[#1C1E22] overflow-x-auto scrollbar-none touch-scroll gap-1 sm:gap-2 px-2 sm:px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative h-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#8db600]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                    isActive
                      ? 'text-[#8db600]'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold ${
                      isActive
                        ? 'bg-[#8db600]/20 text-[#8db600] border border-[#8db600]/40'
                        : 'bg-[#1C1E22] text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
                {/* Active Apple Green Bottom Indicator */}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#8db600] rounded-t-sm shadow-[0_-1px_8px_rgba(141,182,0,0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
