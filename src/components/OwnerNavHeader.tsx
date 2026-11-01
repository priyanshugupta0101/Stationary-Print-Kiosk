import React from 'react';
import { Printer, History, TrendingUp, Settings, Database, LogOut } from 'lucide-react';

interface OwnerNavHeaderProps {
  activeTab: 'desk' | 'history' | 'analytics' | 'settings';
  onSelectTab: (tab: 'desk' | 'history' | 'analytics' | 'settings') => void;
  pendingCount: number;
  onLogout?: () => void;
}

export const OwnerNavHeader: React.FC<OwnerNavHeaderProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  onLogout,
}) => {
  const tabs = [
    {
      id: 'desk' as const,
      label: 'Counter Queue',
      icon: Printer,
      badge: pendingCount > 0 ? pendingCount : null,
      desc: 'OTP lookup & instant printing',
    },
    {
      id: 'history' as const,
      label: 'Order Archives',
      icon: History,
      desc: 'Past jobs, receipts & re-prints',
    },
    {
      id: 'analytics' as const,
      label: 'Financial Insights',
      icon: TrendingUp,
      desc: 'Real-time revenue & sales stats',
    },
    {
      id: 'settings' as const,
      label: 'Shop & Rates',
      icon: Settings,
      desc: 'Configure pricing & SQLite backup',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pt-4 pb-0 mb-6 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-yellow-400 block">
              Counter Administration
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Operator Management Console
            </h1>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <a
              href="/api/database/backup"
              download="printshop-database.sqlite"
              title="Download real-world SQLite database file"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-yellow-400" />
              <span className="hidden sm:inline">Export SQLite DB</span>
              <span className="sm:hidden">Backup</span>
            </a>

            {onLogout && (
              <button
                id="owner-nav-logout-btn"
                type="button"
                onClick={onLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                title="Lock counter desk"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Lock Desk</span>
              </button>
            )}
          </div>
        </div>

        {/* Distinct Segmented Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`owner-nav-${tab.id}`}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-indigo-600 dark:border-yellow-400 text-indigo-600 dark:text-yellow-400 bg-indigo-50/50 dark:bg-slate-800 rounded-t-xl'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 text-[10px] font-extrabold bg-indigo-600 dark:bg-yellow-400 dark:text-slate-950 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
