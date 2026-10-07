import React, { useState, useMemo } from 'react';
import {
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
} from '../../types';
import {
  formatBDT,
  CostCalculationService,
  ComprehensiveDataset,
  parseYearFromDate,
} from '../../services/costCalculations';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import {
  ArrowLeft,
  Truck,
  Wrench,
  Fuel,
  Wallet,
  FileCheck,
  ShieldAlert,
  Receipt,
  Download,
  Calendar,
  Filter,
  DollarSign,
} from 'lucide-react';

interface VehicleDetailPageProps {
  vehicleNo: string;
  dataset: ComprehensiveDataset;
  onBack: () => void;
}

interface UnifiedTransactionItem {
  id: string;
  category: 'Maintenance' | 'Fuel' | 'Driver Salary' | 'Paper Renewal' | 'Police Fine' | 'Other';
  date: string;
  year: number;
  description: string;
  supplier: string;
  billOrSlip: string;
  amount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
}

export const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({
  vehicleNo,
  dataset,
  onBack,
}) => {
  const vehicle = dataset.vehicles.find(
    (v) => v.vehicleNo.trim().toUpperCase() === vehicleNo.trim().toUpperCase()
  );

  const availableYears = useMemo(() => {
    return CostCalculationService.getAllAvailableYears(dataset);
  }, [dataset]);

  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[availableYears.length - 1] || 2026
  );

  // Filters for unified transaction history
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Yearly costs for this vehicle across all years
  const yearlyCosts = useMemo(() => {
    const map: Record<number, number> = {};
    let lifetime = 0;
    availableYears.forEach((yr) => {
      const breakdown = CostCalculationService.getVehicleYearlyBreakdown(
        vehicleNo,
        yr,
        dataset
      );
      map[yr] = breakdown.total;
      lifetime += breakdown.total;
    });
    return { map, lifetime };
  }, [vehicleNo, availableYears, dataset]);

  // 2. Cost Breakdown for the selected year
  const currentYearBreakdown = useMemo(() => {
    return CostCalculationService.getVehicleYearlyBreakdown(
      vehicleNo,
      selectedYear,
      dataset
    );
  }, [vehicleNo, selectedYear, dataset]);

  // 3. Compile Unified Transaction History for this vehicle
  const allTransactions: UnifiedTransactionItem[] = useMemo(() => {
    const list: UnifiedTransactionItem[] = [];
    const targetNo = vehicleNo.trim().toUpperCase();

    // Maintenance
    dataset.maintenance.forEach((m) => {
      const cost = CostCalculationService.getMaintenanceAllocatedCostForVehicle(m, targetNo);
      if (cost > 0) {
        list.push({
          id: m.id,
          category: 'Maintenance',
          date: m.date,
          year: parseYearFromDate(m.date),
          description: `${m.serviceType}: ${m.partsDescription}`,
          supplier: m.supplier || 'Workshop',
          billOrSlip: m.billNo || 'N/A',
          amount: cost,
          paidAmount: m.paidAmount,
          balance: m.dueAmount,
          paymentStatus: m.paymentStatus,
        });
      }
    });

    // Fuel
    dataset.fuel.forEach((f) => {
      if (f.vehicleNo.trim().toUpperCase() === targetNo) {
        list.push({
          id: f.id,
          category: 'Fuel',
          date: f.date,
          year: parseYearFromDate(f.date),
          description: `${f.quantity}L ${f.fuelType} @ ৳${f.unitPrice}/L`,
          supplier: f.supplier || 'Fuel Pump',
          billOrSlip: f.slipNo || 'N/A',
          amount: f.totalAmount,
          paidAmount: f.paymentStatus === 'Paid' ? f.totalAmount : 0,
          balance: f.paymentStatus === 'Paid' ? 0 : f.totalAmount,
          paymentStatus: f.paymentStatus,
        });
      }
    });

    // Salary
    dataset.salaries.forEach((s) => {
      if (s.vehicleNo.trim().toUpperCase() === targetNo) {
        const dateStr = `${s.year}-${s.month.toString().padStart(2, '0')}-01`;
        list.push({
          id: s.id,
          category: 'Driver Salary',
          date: dateStr,
          year: s.year,
          description: `Salary for Month ${s.month}/${s.year} (${s.driverName})`,
          supplier: 'Factory Payroll',
          billOrSlip: `PAY-${s.year}-${s.month}`,
          amount: s.netSalary,
          paidAmount: s.netSalary,
          balance: 0,
          paymentStatus: s.paymentStatus,
        });
      }
    });

    // Paper renewals
    dataset.renewals.forEach((r) => {
      if (r.vehicleNo.trim().toUpperCase() === targetNo) {
        list.push({
          id: r.id,
          category: 'Paper Renewal',
          date: r.renewalDate,
          year: parseYearFromDate(r.renewalDate),
          description: `${r.documentType} renewal (Expires: ${r.expiryDate})`,
          supplier: r.supplier || 'BRTA',
          billOrSlip: r.documentNumber || 'N/A',
          amount: r.renewalCost,
          paidAmount: r.paymentStatus === 'Paid' ? r.renewalCost : 0,
          balance: r.paymentStatus === 'Paid' ? 0 : r.renewalCost,
          paymentStatus: r.paymentStatus,
        });
      }
    });

    // Police Fines
    dataset.fines.forEach((f) => {
      if (f.vehicleNo.trim().toUpperCase() === targetNo) {
        list.push({
          id: f.id,
          category: 'Police Fine',
          date: f.date,
          year: parseYearFromDate(f.date),
          description: `${f.caseType}: ${f.description}`,
          supplier: 'Traffic Police',
          billOrSlip: f.caseNumber || 'N/A',
          amount: f.amount,
          paidAmount: f.paidAmount,
          balance: f.dueAmount,
          paymentStatus: f.paymentStatus,
        });
      }
    });

    // Other Expenses
    dataset.other.forEach((o) => {
      const cost = CostCalculationService.getOtherExpenseAllocatedCostForVehicle(o, targetNo);
      if (cost > 0) {
        list.push({
          id: o.id,
          category: 'Other',
          date: o.date,
          year: parseYearFromDate(o.date),
          description: `${o.expenseType}: ${o.description}`,
          supplier: o.supplier || 'Vendor',
          billOrSlip: o.billNo || 'N/A',
          amount: cost,
          paidAmount: o.paidAmount,
          balance: o.dueAmount,
          paymentStatus: o.paymentStatus,
        });
      }
    });

    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [vehicleNo, dataset]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (yearFilter !== 'ALL' && item.year.toString() !== yearFilter) return false;
      if (statusFilter !== 'ALL' && item.paymentStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.description.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.billOrSlip.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTransactions, categoryFilter, yearFilter, statusFilter, searchQuery]);

  const handleExportVehicleReport = () => {
    const summarySheet = availableYears.map((yr) => {
      const brk = CostCalculationService.getVehicleYearlyBreakdown(vehicleNo, yr, dataset);
      return {
        'Vehicle No': vehicleNo,
        'Year': yr,
        'Maintenance (BDT)': brk.maintenance,
        'Fuel (BDT)': brk.fuel,
        'Driver Salary (BDT)': brk.salary,
        'Paper Renewal (BDT)': brk.paperRenewal,
        'Police Fine (BDT)': brk.policeFine,
        'Other Expenses (BDT)': brk.other,
        'Annual Total Cost (BDT)': brk.total,
      };
    });

    const txSheet = filteredTransactions.map((tx) => ({
      'Date': tx.date,
      'Year': tx.year,
      'Category': tx.category,
      'Description': tx.description,
      'Supplier / Authority': tx.supplier,
      'Bill / Slip No': tx.billOrSlip,
      'Amount (BDT)': tx.amount,
      'Paid (BDT)': tx.paidAmount,
      'Balance (BDT)': tx.balance,
      'Payment Status': tx.paymentStatus,
    }));

    ExcelService.exportToExcel(
      [
        { sheetName: 'Cost Summary', data: summarySheet },
        { sheetName: 'Transactions', data: txSheet },
      ],
      `Vehicle_Report_${vehicleNo.replace(/[^a-zA-Z0-9]/g, '_')}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Back button and vehicle header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Return to previous view"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  {vehicleNo}
                </h2>
                <Badge
                  variant={vehicle?.status === 'Active' ? 'success' : 'neutral'}
                  size="md"
                >
                  {vehicle?.status || 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {vehicle?.vehicleModel} &bull; {vehicle?.vehicleType} &bull; Driver:{' '}
                <span className="font-semibold text-slate-700">
                  {vehicle?.driverName}
                </span>{' '}
                {vehicle?.driverId && `(ID: ${vehicle.driverId})`}
              </p>
            </div>
          </div>

          <button
            onClick={handleExportVehicleReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Vehicle History (.xlsx)</span>
          </button>
        </div>

        {/* Vehicle Metadata quick banner */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Induction Date
            </span>
            <span className="font-semibold text-slate-800 font-mono">
              {vehicle?.purchaseDate || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Assigned Route
            </span>
            <span className="font-semibold text-slate-800 truncate block">
              {vehicle?.remarks || 'Factory Transit'}
            </span>
          </div>

          <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
            <span className="text-emerald-700 block text-[10px] uppercase font-bold">
              Multi-Year Total Cost
            </span>
            <span className="font-black text-emerald-800 font-mono text-sm">
              {formatBDT(yearlyCosts.lifetime)}
            </span>
          </div>

          <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
            <span className="text-blue-700 block text-[10px] uppercase font-bold">
              Total Recorded Events
            </span>
            <span className="font-black text-blue-900 font-mono text-sm">
              {allTransactions.length} records
            </span>
          </div>
        </div>
      </div>

      {/* Yearly Cost Matrix for this specific vehicle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Yearly Cost Evolution ({vehicleNo})</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Lifetime Grand Total: {formatBDT(yearlyCosts.lifetime)}
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {availableYears.map((yr) => {
            const amount = yearlyCosts.map[yr] || 0;
            const isSelected = selectedYear === yr;
            return (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div
                  className={`text-[11px] font-bold ${
                    isSelected ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  Year {yr}
                </div>
                <div className="text-sm font-black font-mono mt-1">
                  {formatBDT(amount)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost Breakdown for Selected Year */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cost Breakdown — Year {selectedYear}
            </h3>
            <Badge variant="purple" size="sm">
              Total: {formatBDT(currentYearBreakdown.total)}
            </Badge>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Vehicle: <span className="font-mono font-bold">{vehicleNo}</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance</span>
            </div>
            <div className="text-sm font-black text-amber-900 font-mono">
              {formatBDT(currentYearBreakdown.maintenance)}
            </div>
          </div>

          <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold mb-1">
              <Fuel className="w-3.5 h-3.5" />
              <span>Fuel Cost</span>
            </div>
            <div className="text-sm font-black text-sky-900 font-mono">
              {formatBDT(currentYearBreakdown.fuel)}
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>Driver Salary</span>
            </div>
            <div className="text-sm font-black text-emerald-900 font-mono">
              {formatBDT(currentYearBreakdown.salary)}
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold mb-1">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Paper Renewal</span>
            </div>
            <div className="text-sm font-black text-indigo-900 font-mono">
              {formatBDT(currentYearBreakdown.paperRenewal)}
            </div>
          </div>

          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Police / Fine</span>
            </div>
            <div className="text-sm font-black text-rose-900 font-mono">
              {formatBDT(currentYearBreakdown.policeFine)}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold mb-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>Other Expense</span>
            </div>
            <div className="text-sm font-black text-slate-900 font-mono">
              {formatBDT(currentYearBreakdown.other)}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Transaction History for this Vehicle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            All Vehicle Transactions ({filteredTransactions.length})
          </h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <input
              type="text"
              placeholder="Search description, bill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
            />

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Fuel">Fuel</option>
              <option value="Driver Salary">Driver Salary</option>
              <option value="Paper Renewal">Paper Renewal</option>
              <option value="Police Fine">Police Fine</option>
              <option value="Other">Other</option>
            </select>

            {/* Year */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Payment Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid / Due</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Supplier / Bill</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{tx.category}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-sm truncate">
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{tx.supplier}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {tx.billOrSlip}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatBDT(tx.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {tx.balance > 0 ? formatBDT(tx.balance) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant={
                          tx.paymentStatus === 'Paid'
                            ? 'success'
                            : tx.paymentStatus === 'Partial'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {tx.paymentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
