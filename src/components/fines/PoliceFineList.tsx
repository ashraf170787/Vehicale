import React, { useState, useMemo } from 'react';
import { PoliceCase, Vehicle } from '../../types';
import { formatBDT, parseYearFromDate } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { PoliceFineModal } from './PoliceFineModal';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
} from 'lucide-react';

interface PoliceFineListProps {
  fines: PoliceCase[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const PoliceFineList: React.FC<PoliceFineListProps> = ({
  fines,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PoliceCase | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const years = useMemo(() => {
    const set = new Set<number>();
    fines.forEach((f) => set.add(parseYearFromDate(f.date)));
    return Array.from(set).sort((a, b) => b - a);
  }, [fines]);

  const filteredItems = useMemo(() => {
    return fines.filter((f) => {
      if (vehicleFilter !== 'ALL' && f.vehicleNo !== vehicleFilter) return false;
      if (statusFilter !== 'ALL' && f.paymentStatus !== statusFilter) return false;
      if (yearFilter !== 'ALL' && parseYearFromDate(f.date).toString() !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          f.vehicleNo.toLowerCase().includes(q) ||
          f.caseNumber.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [fines, vehicleFilter, statusFilter, yearFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalAmount = filteredItems.reduce((s, x) => s + x.amount, 0);
    const totalPaid = filteredItems.reduce((s, x) => s + x.paidAmount, 0);
    const totalDue = filteredItems.reduce((s, x) => s + x.dueAmount, 0);
    return { totalAmount, totalPaid, totalDue };
  }, [filteredItems]);

  const handleSave = (item: PoliceCase) => {
    storage.saveFine(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this police fine case record?')) {
      storage.deleteFine(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((f) => ({
      DATE: f.date,
      'VEHICLE NO': f.vehicleNo,
      'CASE TYPE': f.caseType,
      'CASE NUMBER': f.caseNumber,
      DESCRIPTION: f.description,
      AMOUNT: f.amount,
      'PAID AMOUNT': f.paidAmount,
      'DUE AMOUNT': f.dueAmount,
      STATUS: f.paymentStatus,
      'PAID DATE': f.paidDate || '',
      REMARKS: f.remarks || '',
    }));

    ExcelService.exportToExcel([{ sheetName: 'Police Fines', data: sheetData }], 'Police_Cases_Fines');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Police Case &amp; Traffic Fine Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor traffic prosecutions, case numbers, penalty settlement status, and vehicle citations.
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
            <span>Record Fine / Case</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Penalty Incurred
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(stats.totalAmount)}
          </span>
          <span className="text-[11px] text-slate-400">
            Across {filteredItems.length} prosecution cases
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Paid / Cleared Penalty
          </span>
          <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
            {formatBDT(stats.totalPaid)}
          </span>
          <span className="text-[11px] text-slate-400">Settled through challan</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
            Unpaid / Pending Fine
          </span>
          <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
            {formatBDT(stats.totalDue)}
          </span>
          <span className="text-[11px] text-slate-400">Pending clearance at traffic office</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search case no, vehicle..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Due">Due / Unpaid</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Years</option>
            {years.map((yr) => (
              <option key={yr} value={yr.toString()}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> cases
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Vehicle No</th>
                <th className="py-2.5 px-3">Case / Fine Type</th>
                <th className="py-2.5 px-3">Case / E-Challan No</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Fine Amount</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                    No police cases found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {f.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => onOpenVehicleDetail(f.vehicleNo)}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {f.vehicleNo}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {f.caseType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {f.caseNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={f.description}>
                      {f.description}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(f.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(f.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {f.dueAmount > 0 ? formatBDT(f.dueAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={f.paymentStatus === 'Paid' ? 'success' : 'danger'}>
                        {f.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(f);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PoliceFineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
