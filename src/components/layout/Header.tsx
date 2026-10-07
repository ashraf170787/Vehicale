import React, { useState } from 'react';
import {
  Search,
  FileSpreadsheet,
  Plus,
  Calendar,
  RotateCw,
  Download,
  PanelLeft,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  activeTitle: string;
  activeSubtitle?: string;
  vehicles: Vehicle[];
  onOpenVehicleDetail: (vehicleNo: string) => void;
  onOpenQuickAdd: () => void;
  onNavigateToImport: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onSyncFirestore?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTitle,
  vehicles,
  onOpenVehicleDetail,
  onOpenQuickAdd,
  onNavigateToImport,
  onToggleSidebar,
  isSidebarCollapsed = false,
  onSyncFirestore,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, loading: authLoading, isAdmin, isAshrafAdmin, login, logout, isConnectedToFirebase } = useAuth();

  const matchedVehicles = searchQuery.trim()
    ? vehicles.filter(
        (v) =>
          v.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onSyncFirestore) {
        await onSyncFirestore();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 600);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>{isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
          </button>
        )}

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-tight">
          <span className="text-slate-400">FLEET OPERATIONS</span>
          <span className="text-slate-300">/</span>
          <span className="text-[#0F172A] font-extrabold">{activeTitle}</span>
        </div>
      </div>

      {/* Right: Quick Action Status Pills and Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Firebase Live Cloud Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold font-mono border ${
            user
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
          title={user ? `Firebase Active: ${user.email}` : 'Firebase Provisioned (Sign in to sync live)'}
        >
          <Cloud className={`w-3.5 h-3.5 ${user ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span>{user ? 'Firestore Live' : 'Firebase Ready'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
        </div>

        {/* Auth Profile / Login Button */}
        {user ? (
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-xs">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="font-semibold text-slate-800 max-w-[130px] truncate" title={user.email || ''}>
              {user.email}
            </span>
            {isAshrafAdmin && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> Admin
              </span>
            )}
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => login()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-2xs font-mono"
            title="Sign in with Google (ashraf170787@gmail.com)"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Connect Google</span>
          </button>
        )}

        {/* FY Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 font-mono">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>FY 2026 &bull; Q3</span>
        </div>

        {/* Live Records Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>{vehicles.length} Vehicles</span>
        </div>

        {/* CSV / Excel Import */}
        <button
          onClick={onNavigateToImport}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
        >
          <Download className="w-3 h-3 text-slate-500" />
          <span>CSV / Excel</span>
        </button>

        {/* Sync / Reload */}
        <button
          onClick={handleSync}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
          title="Sync Local & Firebase Database"
        >
          <RotateCw className={`w-3 h-3 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Sync</span>
        </button>

        {/* Primary CTA: New Entry */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-blue-700 rounded transition-colors shadow-2xs font-mono"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ NEW ENTRY</span>
        </button>
      </div>
    </header>
  );
};

