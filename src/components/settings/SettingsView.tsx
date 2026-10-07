import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { syncAllDatasetsToFirestore } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Database,
  Download,
  UploadCloud,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface SettingsViewProps {
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshData }) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const { user, isAshrafAdmin, login, logout, isConnectedToFirebase } = useAuth();

  const handleSyncToFirebase = async () => {
    if (!user) {
      alert('দয়া করে প্রথমে Google দিয়ে সাইন-ইন করুন (ashraf170787@gmail.com)');
      return;
    }
    setIsSyncingFirebase(true);
    try {
      await syncAllDatasetsToFirestore({
        vehicles: storage.getVehicles(),
        suppliers: storage.getSuppliers(),
        maintenance: storage.getMaintenance(),
        fuel: storage.getFuel(),
        salaries: storage.getSalaries(),
        renewals: storage.getRenewals(),
        fines: storage.getFines(),
        other: storage.getOtherExpenses(),
        incomes: storage.getIncomes(),
        mileages: storage.getMileages(),
      });
      setStatusMessage('সব গাড়ি ও খরচের হিস্ট্রি সফলভাবে ফায়ারবেস ক্লাউড ডেটাবেসে (Firestore) সিঙ্ক করা হয়েছে!');
    } catch (e: any) {
      console.error(e);
      alert('Firebase Sync Error: ' + (e?.message || 'Could not sync data'));
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FleetCost_Database_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Database backup JSON successfully downloaded.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = storage.importFullBackupJson(content);
      if (res.success) {
        setStatusMessage(res.message);
        onRefreshData();
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        'আপনি কি নিশ্চিত যে আপনি সব ডেটা ও ডামি রেকর্ড মুছে ফেলতে চান? এটি সব গাড়ি ও খরচের হিস্ট্রি মুছে সম্পূর্ণ খালি করে দেবে।'
      )
    ) {
      storage.clearAllData();
      onRefreshData();
      setStatusMessage('সব ডামি ডেটা সফলভাবে মুছে ফেলা হয়েছে। ডেটাবেস এখন সম্পূর্ণ পরিষ্কার ও খালি।');
    }
  };

  const handleLoadSampleData = () => {
    if (
      window.confirm(
        'আপনি কি ৫ বছরের টেস্টিং ডেমো ডেটা (২০২২—২০২৬) লোড করতে চান? এটি ৫টি স্যাম্পল গাড়ি ও আনুমানিক খরচ লোড করবে।'
      )
    ) {
      storage.loadSampleDemoData();
      onRefreshData();
      setStatusMessage('৫ বছরের স্যাম্পল ডেমো ডেটা সফলভাবে লোড করা হয়েছে।');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <span>System Settings &amp; Data Administration</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure vehicle department parameters, export full offline JSON backups, and manage factory data integrity.
        </p>
      </div>

      {/* Firebase Cloud Database & Sync Card */}
      <div className="bg-linear-to-br from-slate-900 to-[#0A1628] text-white p-5 rounded-xl border border-slate-700 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Firebase Firestore Cloud Database</h4>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-mono font-bold">
                  CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Multi-device realtime synchronization, cloud backups, and security rules enforced.
              </p>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="text-left">
                  <div className="font-semibold text-slate-200">{user.email}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    {isAshrafAdmin ? <ShieldCheck className="w-3 h-3 text-sky-400 inline" /> : null}
                    {isAshrafAdmin ? 'Verified Fleet Admin' : 'Authenticated User'}
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="ml-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] font-semibold text-rose-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <LogIn className="w-4 h-4" />
                <span>Connect with Google (ashraf170787@gmail.com)</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="space-y-1">
            <div className="text-slate-400 font-medium">Project ID:</div>
            <div className="font-mono text-slate-200 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/60">
              ai-studio-applet-webapp-8df09
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-400 font-medium">Designated Fleet Admin:</div>
            <div className="font-mono text-emerald-300 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/60">
              ashraf170787@gmail.com
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-400">
            Click below to push all locally loaded vehicles and transaction logs directly into Firebase Firestore.
          </p>
          <button
            onClick={handleSyncToFirebase}
            disabled={isSyncingFirebase || !user}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
            <span>{isSyncingFirebase ? 'Syncing to Cloud...' : 'Sync Fleet to Firebase'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Backup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Database Backup</span>
          </div>
          <p className="text-xs text-slate-500">
            Export all vehicle masters, maintenance bills, fuel slips, driver salaries, paper renewals, and police cases into an offline JSON backup.
          </p>
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Backup JSON</span>
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Restore From Backup</span>
          </div>
          <p className="text-xs text-slate-500">
            Restore previously exported JSON backup file. All vehicle data and transaction archives will be reloaded.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
            <UploadCloud className="w-4 h-4" />
            <span>Upload Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Clear All Dummy Data (Clean Slate) */}
      <div className="bg-rose-50/70 border border-rose-200 p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
          <RotateCcw className="w-4 h-4 text-rose-600" />
          <span>সব ডামি ডেটা মুছুন / Clear All Dummy Data (Clean Slate)</span>
        </div>
        <p className="text-xs text-rose-700">
          সিস্টেমের সব পুরনো ডামি গাড়ি, মেইন্টেন্যান্স ও তেলের হিস্ট্রি মুছে দিয়ে সিস্টেমটিকে সম্পূর্ণ খালি করুন, যাতে আপনি আপনার ফ্যাক্টরির আসল গাড়ি ও এক্সেল ডেটা এন্ট্রি করতে পারেন।
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleClearAllData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>সব ডামি ডেটা মুছুন (Clear All Data)</span>
          </button>

          <button
            onClick={handleLoadSampleData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
          >
            ঐচ্ছিক: ৫ বছরের ডেমো ডেটা লোড করুন (Testing Demo Data)
          </button>
        </div>
      </div>

      {/* Relational Database Architecture Info */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
        <h4 className="font-bold text-slate-800 text-sm">
          Relational Database Architecture Specifications
        </h4>
        <p>
          Designed strictly with normalized relational structures: Vehicles, MaintenanceTransactions, FuelTransactions, DriverSalaryTransactions, DocumentRenewals, PoliceCases, and OtherExpenses.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-500">
          <li>Primary key / unique IDs across all transaction rows</li>
          <li>Unique constraint enforced on Vehicle No</li>
          <li>Foreign key association ensuring historical records cannot be orphaned</li>
          <li>Supports direct migration to SQL Server or PostgreSQL</li>
        </ul>
      </div>
    </div>
  );
};
