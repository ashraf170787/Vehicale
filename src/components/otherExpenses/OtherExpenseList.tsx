import React, { useState, useMemo } from 'react';
import { OtherExpense, Vehicle } from '../../types';
import { formatBDT, parseYearFromDate } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { OtherExpenseModal } from './OtherExpenseModal';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Users,
} from 'lucide-react';

interface OtherExpenseListProps {
  expenses: OtherExpense[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const OtherExpenseList: React.FC<OtherExpenseListProps> = ({
  expenses,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherExpense | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const years = useMemo(() => {
    const set = new Set<number>();
    expenses.forEach((e) => set.add(parseYearFromDate(e.date)));
    return Array.from(set).sort((a, b) => b - a);
  }, [expenses]);

  const filteredItems = useMemo(() => {
    return expenses.filter((e) => {
      if (vehicleFilter !== 'ALL') {
        if (e.vehicleNo === 'SHARED') {
          if (!e.allocatedVehicles?.includes(vehicleFilter)) return false;
        } else if (e.vehicleNo !== vehicleFilter) {
          return false;
        }
      }
      if (typeFilter !== 'ALL' && e.expenseType !== typeFilter) return false;
      if (yearFilter !== 'ALL' && parseYearFromDate(e.date).toString() !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          e.vehicleNo.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.supplier.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, vehicleFilter, typeFilter, yearFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalAmount = filteredItems.reduce((s, x) => s + x.amount, 0);
    const totalDue = filteredItems.reduce((s, x) => s + x.dueAmount, 0);
    return { totalAmount, totalDue };
  }, [filteredItems]);

  const handleSave = (item: OtherExpense) => {
    storage.saveOtherExpense(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this expense record?')) {
      storage.deleteOtherExpense(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((e) => ({
      DATE: e.date,
      'VEHICLE NO': e.vehicleNo,
      'EXPENSE TYPE': e.expenseType,
      DESCRIPTION: e.description,
      SUPPLIER: e.supplier,
      'BILL NO': e.billNo || '',
      AMOUNT: e.amount,
      'PAID AMOUNT': e.paidAmount,
      'DUE AMOUNT': e.dueAmount,
      STATUS: e.paymentStatus,
      'PAID DATE': e.paidDate || '',
      REMARKS: e.remarks || '',
    }));

    ExcelService.exportToExcel([{ sheetName: 'Other Expenses', data: sheetData }], 'Other_Vehicle_Expenses');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Other Operational Vehicle Expenses</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Washing, parking, toll taxes, accessories, emergency towing and miscellaneous expenditures.
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
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Filtered Total Other Expenses
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(stats.totalAmount)}
          </span>
          <span className="text-[11px] text-slate-400">
            Across {filteredItems.length} petty cash &amp; voucher entries
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
            Unpaid / Due Balance
          </span>
          <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
            {formatBDT(stats.totalDue)}
          </span>
          <span className="text-[11px] text-slate-400">Pending reimbursement / voucher settlement</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, supplier..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Expense Types</option>
            <option value="Washing">Washing</option>
            <option value="Parking">Parking</option>
            <option value="Toll">Toll</option>
            <option value="Accessories">Accessories</option>
            <option value="Towing">Towing</option>
            <option value="Miscellaneous">Miscellaneous</option>
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
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> records
        </div>
      </div>

      {/* Other Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Vehicle No</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Supplier / Vendor</th>
                <th className="py-2.5 px-3">Bill / Voucher</th>
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
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {e.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {e.vehicleNo === 'SHARED' ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                          <Users className="w-3 h-3" />
                          <span>SHARED ({e.allocatedVehicles?.length})</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenVehicleDetail(e.vehicleNo)}
                          className="hover:text-emerald-700 hover:underline"
                        >
                          {e.vehicleNo}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {e.expenseType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{e.supplier}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{e.billNo || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(e.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(e.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {e.dueAmount > 0 ? formatBDT(e.dueAmount) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={e.paymentStatus === 'Paid' ? 'success' : 'danger'}>
                        {e.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(e);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
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

      <OtherExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
