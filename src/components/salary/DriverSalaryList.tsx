import React, { useState, useMemo } from 'react';
import { DriverSalaryTransaction, Vehicle } from '../../types';
import { formatBDT, getMonthName } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { DriverSalaryModal } from './DriverSalaryModal';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Calendar,
} from 'lucide-react';

interface DriverSalaryListProps {
  salaries: DriverSalaryTransaction[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const DriverSalaryList: React.FC<DriverSalaryListProps> = ({
  salaries,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DriverSalaryTransaction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');

  const years = useMemo(() => {
    const set = new Set<number>();
    salaries.forEach((s) => set.add(s.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [salaries]);

  const filteredItems = useMemo(() => {
    return salaries.filter((s) => {
      if (vehicleFilter !== 'ALL' && s.vehicleNo !== vehicleFilter) return false;
      if (yearFilter !== 'ALL' && s.year.toString() !== yearFilter) return false;
      if (monthFilter !== 'ALL' && s.month.toString() !== monthFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          s.vehicleNo.toLowerCase().includes(q) ||
          s.driverName.toLowerCase().includes(q) ||
          (s.driverId && s.driverId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [salaries, vehicleFilter, yearFilter, monthFilter, searchQuery]);

  const totalPayroll = useMemo(() => {
    return filteredItems.reduce((sum, x) => sum + x.netSalary, 0);
  }, [filteredItems]);

  const handleSave = (item: DriverSalaryTransaction) => {
    storage.saveSalary(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this salary payroll record?')) {
      storage.deleteSalary(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((s) => ({
      MONTH: s.month,
      YEAR: s.year,
      'DRIVER NAME': s.driverName,
      'DRIVER ID': s.driverId || '',
      'VEHICLE NO': s.vehicleNo,
      'BASIC SALARY': s.basicSalary,
      ALLOWANCE: s.allowance,
      OVERTIME: s.overtime,
      'OTHER PAYMENT': s.otherPayment,
      DEDUCTION: s.deduction,
      'NET SALARY': s.netSalary,
      STATUS: s.paymentStatus,
      'PAYMENT DATE': s.paymentDate || '',
      REMARKS: s.remarks || '',
    }));

    ExcelService.exportToExcel([{ sheetName: 'Salary', data: sheetData }], 'Driver_Salaries');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Driver Monthly Salary Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Driver compensation is linked directly to vehicles as a monthly fixed operating expense.
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
            <span>Add Monthly Salary</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Total Driver Payroll
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(totalPayroll)}
          </span>
          <span className="text-[11px] text-slate-400">
            Across {filteredItems.length} monthly payroll entries
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Average Monthly Net Salary
          </span>
          <span className="text-lg font-black text-emerald-800 font-mono mt-0.5 block">
            {filteredItems.length > 0
              ? formatBDT(Math.round(totalPayroll / filteredItems.length))
              : '৳ 0'}
          </span>
          <span className="text-[11px] text-slate-400">Per driver / vehicle month</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Vehicle Association Rule
          </span>
          <span className="text-xs font-semibold text-slate-700 mt-1 block">
            Historical link retained
          </span>
          <span className="text-[11px] text-slate-400">
            Salary remains attached to the assigned vehicle of that period.
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search driver, vehicle..."
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

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Months</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m.toString()}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> records
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Vehicle No</th>
                <th className="py-2.5 px-3">Driver Name</th>
                <th className="py-2.5 px-3 text-right">Basic</th>
                <th className="py-2.5 px-3 text-right">Allowance</th>
                <th className="py-2.5 px-3 text-right">OT</th>
                <th className="py-2.5 px-3 text-right">Bonus/Other</th>
                <th className="py-2.5 px-3 text-right">Deduction</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-100">Net Salary</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No salary records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {getMonthName(s.month)} {s.year}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => onOpenVehicleDetail(s.vehicleNo)}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {s.vehicleNo}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      <div>{s.driverName}</div>
                      {s.driverId && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {s.driverId}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(s.basicSalary)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(s.allowance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(s.overtime)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(s.otherPayment)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                      {s.deduction > 0 ? `-${formatBDT(s.deduction)}` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                      {formatBDT(s.netSalary)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={s.paymentStatus === 'Paid' ? 'success' : 'danger'}>
                        {s.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(s);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
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

      <DriverSalaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
