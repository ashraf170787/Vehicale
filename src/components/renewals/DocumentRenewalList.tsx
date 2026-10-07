import React, { useState, useMemo } from 'react';
import { DocumentRenewal, Vehicle } from '../../types';
import { formatBDT, parseYearFromDate } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { DocumentRenewalModal } from './DocumentRenewalModal';
import {
  FileCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface DocumentRenewalListProps {
  renewals: DocumentRenewal[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const DocumentRenewalList: React.FC<DocumentRenewalListProps> = ({
  renewals,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentRenewal | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<'ALL' | 'Expired' | 'ExpiringSoon' | 'Valid'>('ALL');

  const todayStr = new Date().toISOString().substring(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().substring(0, 10);

  const getValidityStatus = (expiryDate: string): { label: string; variant: 'danger' | 'warning' | 'success'; isExpiringSoon: boolean; isExpired: boolean } => {
    if (expiryDate < todayStr) {
      return { label: 'Expired', variant: 'danger', isExpiringSoon: false, isExpired: true };
    }
    if (expiryDate <= in30DaysStr) {
      return { label: 'Expiring Soon', variant: 'warning', isExpiringSoon: true, isExpired: false };
    }
    return { label: 'Valid', variant: 'success', isExpiringSoon: false, isExpired: false };
  };

  const filteredItems = useMemo(() => {
    return renewals.filter((r) => {
      if (vehicleFilter !== 'ALL' && r.vehicleNo !== vehicleFilter) return false;
      if (docTypeFilter !== 'ALL' && r.documentType !== docTypeFilter) return false;

      const validity = getValidityStatus(r.expiryDate);
      if (expiryStatusFilter === 'Expired' && !validity.isExpired) return false;
      if (expiryStatusFilter === 'ExpiringSoon' && !validity.isExpiringSoon) return false;
      if (expiryStatusFilter === 'Valid' && (validity.isExpired || validity.isExpiringSoon)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          r.vehicleNo.toLowerCase().includes(q) ||
          r.documentNumber.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.documentType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [renewals, vehicleFilter, docTypeFilter, expiryStatusFilter, searchQuery, todayStr, in30DaysStr]);

  const stats = useMemo(() => {
    const expiredCount = renewals.filter((r) => r.expiryDate < todayStr).length;
    const expiringSoonCount = renewals.filter((r) => r.expiryDate >= todayStr && r.expiryDate <= in30DaysStr).length;
    const totalCost = filteredItems.reduce((s, x) => s + x.renewalCost, 0);
    return { expiredCount, expiringSoonCount, totalCost };
  }, [renewals, filteredItems, todayStr, in30DaysStr]);

  const handleSave = (item: DocumentRenewal) => {
    storage.saveRenewal(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this renewal document record?')) {
      storage.deleteRenewal(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((r) => ({
      'VEHICLE NO': r.vehicleNo,
      'DOCUMENT TYPE': r.documentType,
      'DOCUMENT NUMBER': r.documentNumber,
      'RENEWAL DATE': r.renewalDate,
      'EXPIRY DATE': r.expiryDate,
      'VALIDITY STATUS': getValidityStatus(r.expiryDate).label,
      'RENEWAL COST': r.renewalCost,
      AUTHORITY: r.supplier,
      STATUS: r.paymentStatus,
      REMARKS: r.remarks || '',
    }));

    ExcelService.exportToExcel([{ sheetName: 'Paper Renewals', data: sheetData }], 'Document_Renewals');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Paper &amp; Document Renewal Tracking</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage BRTA Fitness, Tax Tokens, Route Permits and Insurance renewals with expiry reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Renewal</span>
          </button>
        </div>
      </div>

      {/* Reminder Alerts & KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setExpiryStatusFilter(expiryStatusFilter === 'Expired' ? 'ALL' : 'Expired')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            stats.expiredCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Expired Documents
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl font-black text-rose-800 font-mono mt-0.5 block">
            {stats.expiredCount}
          </span>
          <span className="text-[11px] text-rose-600">Immediate renewal required</span>
        </button>

        <button
          onClick={() => setExpiryStatusFilter(expiryStatusFilter === 'ExpiringSoon' ? 'ALL' : 'ExpiringSoon')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            stats.expiringSoonCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Expiring Within 30 Days
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-800 font-mono mt-0.5 block">
            {stats.expiringSoonCount}
          </span>
          <span className="text-[11px] text-amber-600">Advance paperwork recommended</span>
        </button>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Renewal Fees
          </span>
          <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(stats.totalCost)}
          </span>
          <span className="text-[11px] text-slate-400">Total fees for current filtered list</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search document no, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.vehicleNo}>
                {v.vehicleNo}
              </option>
            ))}
          </select>

          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Document Types</option>
            <option value="Fitness">Fitness</option>
            <option value="Tax Token">Tax Token</option>
            <option value="Route Permit">Route Permit</option>
            <option value="Insurance">Insurance</option>
            <option value="Registration">Registration</option>
          </select>

          <select
            value={expiryStatusFilter}
            onChange={(e) => setExpiryStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Expiry Statuses</option>
            <option value="Expired">Expired Only</option>
            <option value="ExpiringSoon">Expiring Soon (30 Days)</option>
            <option value="Valid">Valid Documents</option>
          </select>
        </div>

        <div className="text-slate-500 text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> documents
        </div>
      </div>

      {/* Renewals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Vehicle No</th>
                <th className="py-2.5 px-3">Document Type</th>
                <th className="py-2.5 px-3">Document Number</th>
                <th className="py-2.5 px-3">Renewal Date</th>
                <th className="py-2.5 px-3">Expiry Date</th>
                <th className="py-2.5 px-3 text-center">Validity</th>
                <th className="py-2.5 px-3 text-right">Cost (BDT)</th>
                <th className="py-2.5 px-3">Authority / Agency</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                    No document records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((r) => {
                  const validity = getValidityStatus(r.expiryDate);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                          className="hover:text-emerald-700 hover:underline"
                        >
                          {r.vehicleNo}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {r.documentType}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.documentNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {r.renewalDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.expiryDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={validity.variant}>{validity.label}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBDT(r.renewalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{r.supplier}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingItem(r);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DocumentRenewalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
