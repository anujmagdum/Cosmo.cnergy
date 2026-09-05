import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { NavigationTab } from '../types';

interface LayoutProps {
  onOpenBOMModal: () => void;
  onOpenSearch: () => void;
  userName: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  ordersCount?: number;
  catalogCount?: number;
  companiesCount?: number;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  unreadWebmailCount: number;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, unreadWebmailCount, onOpenBOMModal, onOpenSearch, userName, onOpenAuth, onLogout, ordersCount, catalogCount, companiesCount }) => {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mailQueueCount={unreadWebmailCount}
        onOpenBOMModal={onOpenBOMModal}
        onOpenSearch={onOpenSearch}
        userName={userName}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        ordersCount={ordersCount}
        catalogCount={catalogCount}
        companiesCount={companiesCount}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28">
        <Outlet />
      </main>
    </div>
  );
};
