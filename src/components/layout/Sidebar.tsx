import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Wrench,
  Fuel,
  Wallet,
  FileCheck,
  ShieldAlert,
  Receipt,
  CreditCard,
  BarChart3,
  TrendingUp,
  Gauge,
  FileSpreadsheet,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Cloud,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'vehicles'
  | 'maintenance'
  | 'fuel'
  | 'salary'
  | 'paper'
  | 'fines'
  | 'other'
  | 'suppliers'
  | 'profit'
  | 'costPerKm'
  | 'analysis'
  | 'import'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  vehicleCount: number;
  upcomingRenewalsCount: number;
  pendingSupplierCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  vehicleCount,
  upcomingRenewalsCount,
  pendingSupplierCount,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    section?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      section: 'MAIN OPERATIONS',
    },
    {
      id: 'costPerKm',
      label: 'Cost Per KM (CPK)',
      icon: <Gauge className="w-4 h-4 text-sky-400" />,
      badge: 'CPK',
    },
    {
      id: 'profit',
      label: 'Profit & Loss (P&L)',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      badge: 'P&L',
    },
    {
      id: 'analysis',
      label: 'Cost Matrix Analysis',
      icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'vehicles',
      label: 'Vehicle Master',
      icon: <Truck className="w-4 h-4" />,
      badge: vehicleCount,
      section: 'OPERATIONAL EXPENSES',
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Repairs',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'fuel',
      label: 'Fuel & Gas Logs',
      icon: <Fuel className="w-4 h-4" />,
    },
    {
      id: 'salary',
      label: 'Driver Salary',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'paper',
      label: 'Paper Renewal',
      icon: <FileCheck className="w-4 h-4" />,
      badge: upcomingRenewalsCount > 0 ? `${upcomingRenewalsCount} Alert` : undefined,
    },
    {
      id: 'fines',
      label: 'Police & Traffic Fines',
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      id: 'other',
      label: 'Other Operating Cost',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      id: 'suppliers',
      label: 'Suppliers & Payables',
      icon: <CreditCard className="w-4 h-4" />,
      badge: pendingSupplierCount > 0 ? pendingSupplierCount : undefined,
      section: 'FINANCIALS & DATA',
    },
    {
      id: 'import',
      label: 'Excel Import / Upload',
      icon: <FileSpreadsheet className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'settings',
      label: 'Settings & DB Backup',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-[#060D1A] text-slate-300 flex flex-col shrink-0 select-none border-r border-[#15233D] transition-all duration-200 z-40`}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-[#15233D] bg-[#040812] flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-950">
              <span className="tracking-tighter">FC</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-white tracking-wider leading-none">
                  FLEETCORE
                </h1>
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
              </div>
              <p className="text-[10px] text-sky-400/80 font-bold uppercase tracking-wider mt-1">
                COST CONSOLE
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white font-black text-sm">
            FC
          </div>
        )}

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 text-xs font-medium custom-scrollbar">
        {navItems.map((item, index) => {
          const isActive = currentTab === item.id;
          return (
            <React.Fragment key={item.id}>
              {item.section && !isCollapsed && (
                <div
                  className={`px-3 pt-3 pb-1 text-[9px] font-black tracking-widest text-[#64748B] uppercase ${
                    index !== 0 ? 'mt-1' : ''
                  }`}
                >
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'
                } rounded-md transition-all text-left group ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-950'
                    : 'text-[#94A3B8] hover:bg-[#0F1D36] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`transition-colors ${
                      isActive ? 'text-white' : 'text-[#64748B] group-hover:text-sky-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                          isActive
                            ? 'bg-blue-900 text-blue-100 border border-blue-400/40'
                            : typeof item.badge === 'string' && item.badge.toLowerCase().includes('alert')
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-[#15233D] text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer Console Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#15233D] bg-[#040812] text-[10px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-semibold">CONSOLE ACTIVE</span>
            </div>
            <span className="font-mono font-bold text-sky-400">BDT (৳)</span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
            <div className="flex items-center gap-1 text-slate-400">
              <Cloud className="w-2.5 h-2.5 text-sky-400" />
              <span>Firebase</span>
            </div>
            <span className="text-emerald-400 font-mono font-semibold">Online</span>
          </div>
        </div>
      )}
    </aside>
  );
};
