import React, { useState, useMemo } from 'react';
import { MaintenanceTransaction, Vehicle } from '../../types';
import { formatBDT, parseYearFromDate } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { MaintenanceModal } from './MaintenanceModal';
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Filter,
  Users,
} from 'lucide-react';

interface MaintenanceListProps {
  maintenance: MaintenanceTransaction[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({
  maintenance,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceTransaction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const years = useMemo(() => {
    const set = new Set<number>();
    maintenance.forEach((m) => set.add(parseYearFromDate(m.date)));
    return Array.from(set).sort((a, b) => b - a);
  }, [maintenance]);

  const filteredItems = useMemo(() => {
    return maintenance.filter((m) => {
      if (vehicleFilter !== 'ALL') {
        if (m.vehicleNo === 'SHARED') {
          if (!m.allocatedVehicles?.includes(vehicleFilter)) return false;
        } else if (m.vehicleNo !== vehicleFilter) {
          return false;
        }
      }
      if (serviceTypeFilter !== 'ALL' && m.serviceType !== serviceTypeFilter) return false;
      if (statusFilter !== 'ALL' && m.paymentStatus !== statusFilter) return false;
      if (yearFilter !== 'ALL' && parseYearFromDate(m.date).toString() !== yearFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.vehicleNo.toLowerCase().includes(q) ||
          m.partsDescription.toLowerCase().includes(q) ||
          m.supplier.toLowerCase().includes(q) ||
          m.billNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [maintenance, vehicleFilter, serviceTypeFilter, statusFilter, yearFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalAmount = filteredItems.reduce((s, x) => s + x.amount, 0);
    const totalPaid = filteredItems.reduce((s, x) => s + x.paidAmount, 0);
    const totalDue = filteredItems.reduce((s, x) => s + x.dueAmount, 0);
    return { totalAmount, totalPaid, totalDue };
  }, [filteredItems]);

  const handleSave = (item: MaintenanceTransaction) => {
    storage.saveMaintenance(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this maintenance record?')) {
      storage.deleteMaintenance(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((m) => ({
      DATE: m.date,
      'CAR NO': m.vehicleNo,
      'SERVICE TYPE': m.serviceType,
      'PARTS / SERVICE': m.partsDescription,
      SUPPLIER: m.supplier,
      'PARTS QUANTITY': m.quantity,
      'APPROVE AMOUNT': m.approvedAmount,
      'BILL NO': m.billNo,
      AMOUNT: m.amount,
      DUE: m.dueAmount,
      PAID: m.paidAmount,
      'PAID DATE': m.paidDate || '',
      STATUS: m.paymentStatus,
      REMARKS: m.remarks || '',
    }));

    ExcelService.exportToExcel(
      [{ sheetName: 'Maintenance', data: sheetData }],
      'Maintenance_Expenses'
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-600" />
            <span>Maintenance &amp; Workshop Expenses</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track repairs, parts replacements, supplier invoices, payment balances and multi-vehicle shared allocations.
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
            <span>Add Maintenance Bill</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Total Expense
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(stats.totalAmount)}
          </span>
          <span className="text-[11px] text-slate-400">
            Across {filteredItems.length} workshop bills
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Disbursed / Paid Amount
          </span>
          <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
            {formatBDT(stats.totalPaid)}
          </span>
          <span className="text-[11px] text-slate-400">
            {stats.totalAmount > 0
              ? `${Math.round((stats.totalPaid / stats.totalAmount) * 100)}% settled`
              : '0% settled'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
            Outstanding Due Balance
          </span>
          <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
            {formatBDT(stats.totalDue)}
          </span>
          <span className="text-[11px] text-slate-400">Payable to suppliers</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, bill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Vehicle */}
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

          {/* Service Type */}
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Service Types</option>
            <option value="General Servicing">General Servicing</option>
            <option value="Brake System">Brake System</option>
            <option value="Tyre">Tyre</option>
            <option value="Battery">Battery</option>
            <option value="Engine">Engine</option>
            <option value="Suspension">Suspension</option>
            <option value="Electrical System">Electrical System</option>
            <option value="Transmission Parts">Transmission Parts</option>
            <option value="AC">AC</option>
            <option value="Other">Other</option>
          </select>

          {/* Year */}
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

          {/* Payment Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        <div className="text-slate-500 text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> records
        </div>
      </div>

      {/* Maintenance Table (Based on Company Excel Structure) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Car No</th>
                <th className="py-2.5 px-3">Service Type</th>
                <th className="py-2.5 px-3">Parts / Service</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {m.vehicleNo === 'SHARED' ? (
                        <span
                          className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]"
                          title={`Shared across ${m.allocatedVehicles?.length || 'all'} vehicles`}
                        >
                          <Users className="w-3 h-3" />
                          <span>SHARED ({m.allocatedVehicles?.length})</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenVehicleDetail(m.vehicleNo)}
                          className="hover:text-emerald-700 hover:underline"
                        >
                          {m.vehicleNo}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{m.serviceType}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={m.partsDescription}>
                      {m.partsDescription}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{m.supplier}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">{m.quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.billNo}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(m.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(m.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {m.dueAmount > 0 ? formatBDT(m.dueAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant={
                          m.paymentStatus === 'Paid'
                            ? 'success'
                            : m.paymentStatus === 'Partial'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {m.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(m);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
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

      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
