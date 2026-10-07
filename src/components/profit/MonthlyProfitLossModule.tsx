import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Download,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  VehicleMonthlyIncome,
  MonthlyProfitLossRow,
} from '../../types';
import {
  ComprehensiveDataset,
  CostCalculationService,
  formatBDT,
  getMonthName,
} from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { MonthlyIncomeModal } from './MonthlyIncomeModal';
import { Badge } from '../common/Badge';

interface MonthlyProfitLossModuleProps {
  dataset: ComprehensiveDataset;
  onRefresh: () => void;
  onOpenVehicleDetail?: (vehicleNo: string) => void;
}

export const MonthlyProfitLossModule: React.FC<MonthlyProfitLossModuleProps> = ({
  dataset,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); // 0 = All Months
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'statement' | 'incomes' | 'yearlyTrend'>('statement');

  // Income Modal State
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<VehicleMonthlyIncome | null>(null);

  // Calculate Monthly P&L Rows
  const profitRows = useMemo(() => {
    return CostCalculationService.calculateMonthlyProfitLossRows(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // Calculate Fleet Summary
  const fleetSummary = useMemo(() => {
    return CostCalculationService.calculateMonthlyFleetProfitSummary(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // Filtered Rows for table
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return profitRows;
    const term = searchTerm.toLowerCase();
    return profitRows.filter(
      (r) =>
        r.vehicleNo.toLowerCase().includes(term) ||
        r.driverName.toLowerCase().includes(term) ||
        r.vehicleModel.toLowerCase().includes(term) ||
        r.vehicleType.toLowerCase().includes(term)
    );
  }, [profitRows, searchTerm]);

  // Incomes list for the selected year & month
  const incomesList = useMemo(() => {
    const all = dataset.incomes || [];
    return all
      .filter((inc: VehicleMonthlyIncome) => {
        if (inc.year !== selectedYear) return false;
        if (selectedMonth > 0 && inc.month !== selectedMonth) return false;
        if (searchTerm.trim()) {
          const t = searchTerm.toLowerCase();
          return (
            inc.vehicleNo.toLowerCase().includes(t) ||
            inc.clientName.toLowerCase().includes(t) ||
            (inc.invoiceNo && inc.invoiceNo.toLowerCase().includes(t))
          );
        }
        return true;
      })
      .sort((a: VehicleMonthlyIncome, b: VehicleMonthlyIncome) => b.month - a.month);
  }, [dataset.incomes, selectedYear, selectedMonth, searchTerm]);

  // 12-Month Trend Data for the selected year
  const monthlyTrendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map((m) => {
      const summary = CostCalculationService.calculateMonthlyFleetProfitSummary(
        dataset,
        selectedYear,
        m
      );
      return {
        month: m,
        monthName: getMonthName(m),
        revenue: summary.totalRevenue,
        receivedRevenue: summary.receivedRevenue,
        dueRevenue: summary.dueRevenue,
        fuel: summary.expenseBreakdown.fuel,
        maintenance: summary.expenseBreakdown.maintenance,
        salary: summary.expenseBreakdown.salary,
        other:
          summary.expenseBreakdown.paperRenewal +
          summary.expenseBreakdown.policeFine +
          summary.expenseBreakdown.other,
        totalExpense: summary.totalExpense,
        netProfit: summary.netProfit,
        profitMargin: summary.profitMarginPercent,
      };
    });
  }, [dataset, selectedYear]);

  // Handle Save Income
  const handleSaveIncome = (item: VehicleMonthlyIncome) => {
    storage.saveIncome(item);
    onRefresh();
  };

  // Handle Delete Income
  const handleDeleteIncome = (id: string) => {
    if (window.confirm('Are you sure you want to delete this income entry?')) {
      storage.deleteIncome(id);
      onRefresh();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const periodName =
      selectedMonth > 0
        ? `${getMonthName(selectedMonth)}_${selectedYear}`
        : `Full_Year_${selectedYear}`;

    const statementData = profitRows.map((r, idx) => ({
      'SL NO': idx + 1,
      'VEHICLE NO': r.vehicleNo,
      'MODEL': r.vehicleModel,
      'DRIVER': r.driverName,
      'MONTH': selectedMonth > 0 ? getMonthName(selectedMonth) : 'All Months',
      'YEAR': selectedYear,
      'TOTAL REVENUE (BDT)': r.totalRevenue,
      'RECEIVED REVENUE (BDT)': r.receivedRevenue,
      'DUE REVENUE (BDT)': r.dueRevenue,
      'FUEL EXPENSE (BDT)': r.fuelCost,
      'MAINTENANCE (BDT)': r.maintenanceCost,
      'DRIVER SALARY (BDT)': r.salaryCost,
      'PAPER & FINES (BDT)': r.paperCost + r.fineCost,
      'OTHER EXPENSE (BDT)': r.otherCost,
      'TOTAL EXPENSE (BDT)': r.totalExpense,
      'NET PROFIT (BDT)': r.netProfit,
      'PROFIT MARGIN (%)': `${r.profitMarginPercent.toFixed(1)}%`,
      'STATUS': r.profitStatus,
    }));

    const incomeSheetData = (dataset.incomes || []).map((inc: VehicleMonthlyIncome, idx: number) => ({
      'SL NO': idx + 1,
      'MONTH': getMonthName(inc.month),
      'YEAR': inc.year,
      'VEHICLE NO': inc.vehicleNo,
      'CLIENT / CONTRACT': inc.clientName,
      'BILLING TYPE': inc.billingType,
      'CONTRACT AMOUNT (BDT)': inc.contractAmount,
      'EXTRA / OVERTIME (BDT)': inc.bonusOrExtraAmount,
      'TOTAL INCOME (BDT)': inc.totalIncome,
      'RECEIVED AMOUNT (BDT)': inc.receivedAmount,
      'DUE AMOUNT (BDT)': inc.dueAmount,
      'STATUS': inc.paymentStatus,
      'RECEIVED DATE': inc.receivedDate || '',
      'INVOICE NO': inc.invoiceNo || '',
      'REMARKS': inc.remarks || '',
    }));

    ExcelService.exportToExcel(
      [
        { sheetName: 'Monthly_Profit_Loss', data: statementData },
        { sheetName: 'Income_Ledger', data: incomeSheetData },
      ],
      `Vehicle_Profit_Loss_Statement_${periodName}`
    );
  };

  const MONTHS = [
    { num: 0, name: 'Full Year' },
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              <span>Monthly Profit & Loss (P&L)</span>
            </h1>
            <Badge variant={fleetSummary.netProfit >= 0 ? 'success' : 'danger'}>
              {fleetSummary.netProfit >= 0 ? 'Net Profitable' : 'Net Loss'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare monthly revenue vs all operating expenses (Fuel, Maintenance, Driver Salary) per vehicle.
          </p>
        </div>

        {/* Year, Month and Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export P&L</span>
          </button>

          {/* Record Income Button */}
          <button
            onClick={() => {
              setEditingIncome(null);
              setIsIncomeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Income</span>
          </button>
        </div>
      </div>

      {/* Top 4 Executive KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>TOTAL REVENUE</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {formatBDT(fleetSummary.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>
              Received: <strong className="text-emerald-700">{formatBDT(fleetSummary.receivedRevenue)}</strong>
            </span>
            <span>
              Due: <strong className="text-amber-700">{formatBDT(fleetSummary.dueRevenue)}</strong>
            </span>
          </div>
        </div>

        {/* 2. Total Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>TOTAL FLEET EXPENSE</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono mt-1">
            {formatBDT(fleetSummary.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Fuel: {formatBDT(fleetSummary.expenseBreakdown.fuel)}</span>
            <span>Salary: {formatBDT(fleetSummary.expenseBreakdown.salary)}</span>
          </div>
        </div>

        {/* 3. Net Profit / Loss */}
        <div
          className={`p-4 rounded-xl border shadow-xs relative overflow-hidden ${
            fleetSummary.netProfit >= 0
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-rose-50/70 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span
              className={
                fleetSummary.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
              }
            >
              NET PROFIT / LOSS
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                fleetSummary.netProfit >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {fleetSummary.netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              fleetSummary.netProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'
            }`}
          >
            {formatBDT(fleetSummary.netProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-200/60 font-semibold">
            <span
              className={
                fleetSummary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }
            >
              Margin: {fleetSummary.profitMarginPercent.toFixed(1)}%
            </span>
            <span className="text-slate-600 text-[10px]">
              {selectedMonth > 0 ? getMonthName(selectedMonth) : 'Yearly Total'}
            </span>
          </div>
        </div>

        {/* 4. Fleet Performance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>FLEET VEHICLE ROI</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            <span className="text-emerald-600">{fleetSummary.profitableVehiclesCount}</span>
            <span className="text-slate-400 text-base font-normal"> / </span>
            <span className="text-slate-700">{fleetSummary.totalVehiclesCount}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 font-medium">
              {fleetSummary.profitableVehiclesCount} Profitable
            </span>
            <span className="text-rose-600 font-medium">
              {fleetSummary.lossVehiclesCount} In Loss
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border-b border-slate-100 gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'statement'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Vehicle P&L Statement
            </button>
            <button
              onClick={() => setActiveTab('incomes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'incomes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Income Ledger ({dataset.incomes?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('yearlyTrend')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'yearlyTrend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. 12-Month Profit Trend
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle, driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* TAB 1: VEHICLE P&L STATEMENT */}
        {activeTab === 'statement' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0B1528] text-white font-bold border-b border-[#15233D] text-[11px] tracking-wide">
                  <th className="py-2.5 px-3">VEHICLE NO &darr;&uarr;</th>
                  <th className="py-2.5 px-3">BILLING PERIOD</th>
                  <th className="py-2.5 px-3">DRIVER / MODEL &darr;&uarr;</th>
                  <th className="py-2.5 px-3 text-right bg-blue-950/80 text-blue-200">
                    REVENUE
                  </th>
                  <th className="py-2.5 px-3 text-right">FUEL</th>
                  <th className="py-2.5 px-3 text-right">MAINTENANCE</th>
                  <th className="py-2.5 px-3 text-right">SALARY</th>
                  <th className="py-2.5 px-3 text-right">OTHER / FINE</th>
                  <th className="py-2.5 px-3 text-right bg-rose-950/80 text-rose-200">
                    TOTAL EXPENSE
                  </th>
                  <th className="py-2.5 px-3 text-right bg-emerald-950 text-emerald-200 font-black">
                    NET PROFIT
                  </th>
                  <th className="py-2.5 px-3 text-center">MARGIN %</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No vehicle data found.</p>
                        <p className="text-slate-400 text-xs">
                          Click "+ Record Income" above to record monthly contract earnings.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isProfit = r.netProfit >= 0;
                    return (
                      <tr key={r.vehicleId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {onOpenVehicleDetail ? (
                            <button
                              onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                              className="text-emerald-700 hover:underline font-bold"
                            >
                              {r.vehicleNo}
                            </button>
                          ) : (
                            r.vehicleNo
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded font-bold text-[11px]">
                            {selectedMonth > 0
                              ? `${getMonthName(selectedMonth)} ${selectedYear}`
                              : `Year ${selectedYear}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800 block">{r.driverName}</span>
                          <span className="text-[10px] text-slate-400">{r.vehicleModel}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-blue-50/30 text-blue-900">
                          {formatBDT(r.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatBDT(r.fuelCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatBDT(r.maintenanceCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatBDT(r.salaryCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatBDT(r.paperCost + r.fineCost + r.otherCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-rose-50/30 text-rose-800">
                          {formatBDT(r.totalExpense)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-black text-sm ${
                            isProfit
                              ? 'bg-emerald-50/80 text-emerald-800'
                              : 'bg-rose-50/80 text-rose-800'
                          }`}
                        >
                          {formatBDT(r.netProfit)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              isProfit
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.totalRevenue > 0 ? `${r.profitMarginPercent.toFixed(1)}%` : '0%'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={isProfit ? 'success' : 'danger'}>
                            {r.profitStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setEditingIncome({
                                id: `inc-${Date.now()}`,
                                month: selectedMonth > 0 ? selectedMonth : currentMonth,
                                year: selectedYear,
                                vehicleNo: r.vehicleNo,
                                clientName: '',
                                billingType: 'Monthly Contract',
                                contractAmount: 75000,
                                bonusOrExtraAmount: 0,
                                totalIncome: 75000,
                                receivedAmount: 75000,
                                dueAmount: 0,
                                paymentStatus: 'Paid',
                                createdAt: new Date().toISOString(),
                              });
                              setIsIncomeModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                          >
                            + Income
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-slate-800 uppercase text-xs">
                      Fleet Total ({filteredRows.length} Vehicles)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-950 text-sm bg-blue-100/40">
                      {formatBDT(fleetSummary.totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatBDT(fleetSummary.expenseBreakdown.fuel)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatBDT(fleetSummary.expenseBreakdown.maintenance)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatBDT(fleetSummary.expenseBreakdown.salary)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(
                        fleetSummary.expenseBreakdown.paperRenewal +
                          fleetSummary.expenseBreakdown.policeFine +
                          fleetSummary.expenseBreakdown.other
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-900 text-sm bg-rose-100/40">
                      {formatBDT(fleetSummary.totalExpense)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-black text-base ${
                        fleetSummary.netProfit >= 0
                          ? 'bg-emerald-100/80 text-emerald-950'
                          : 'bg-rose-100/80 text-rose-950'
                      }`}
                    >
                      {formatBDT(fleetSummary.netProfit)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-xs">
                      {fleetSummary.profitMarginPercent.toFixed(1)}%
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-xs">
                      <span className="text-emerald-700 font-bold">
                        {fleetSummary.profitableVehiclesCount} Profitable
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 2: INCOME LEDGER */}
        {activeTab === 'incomes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Month / Year</th>
                  <th className="py-2.5 px-3">Vehicle No</th>
                  <th className="py-2.5 px-3">Client / Contract</th>
                  <th className="py-2.5 px-3">Billing Type</th>
                  <th className="py-2.5 px-3 text-right">Contract Amount</th>
                  <th className="py-2.5 px-3 text-right">Extra / Overtime</th>
                  <th className="py-2.5 px-3 text-right font-black text-slate-900">Total Income</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">Received</th>
                  <th className="py-2.5 px-3 text-right text-amber-700 font-bold">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomesList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Plus className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No income entries recorded.</p>
                        <button
                          onClick={() => {
                            setEditingIncome(null);
                            setIsIncomeModalOpen(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-xs hover:bg-emerald-700 transition-colors"
                        >
                          + Record First Income
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incomesList.map((inc: VehicleMonthlyIncome) => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {getMonthName(inc.month)}, {inc.year}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {inc.vehicleNo}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {inc.clientName}
                        {inc.invoiceNo && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            Inv: {inc.invoiceNo}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{inc.billingType}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatBDT(inc.contractAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatBDT(inc.bonusOrExtraAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {formatBDT(inc.totalIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatBDT(inc.receivedAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                        {formatBDT(inc.dueAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={
                            inc.paymentStatus === 'Paid'
                              ? 'success'
                              : inc.paymentStatus === 'Partial'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {inc.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingIncome(inc);
                              setIsIncomeModalOpen(true);
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
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
        )}

        {/* TAB 3: 12-MONTH PROFIT TREND */}
        {activeTab === 'yearlyTrend' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Month ({selectedYear})</th>
                  <th className="py-2.5 px-3 text-right text-blue-900 bg-blue-50/50">
                    Revenue
                  </th>
                  <th className="py-2.5 px-3 text-right">Fuel</th>
                  <th className="py-2.5 px-3 text-right">Maintenance</th>
                  <th className="py-2.5 px-3 text-right">Driver Salary</th>
                  <th className="py-2.5 px-3 text-right">Other Expenses</th>
                  <th className="py-2.5 px-3 text-right text-rose-900 bg-rose-50/50">
                    Total Expense
                  </th>
                  <th className="py-2.5 px-3 text-right font-black bg-emerald-50/80 text-emerald-950">
                    Net Profit / Loss
                  </th>
                  <th className="py-2.5 px-3 text-center">Profit Margin</th>
                  <th className="py-2.5 px-3 text-center">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTrendData.map((t) => {
                  const isProfit = t.netProfit >= 0;
                  return (
                    <tr key={t.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {t.monthName} ({t.month})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {formatBDT(t.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatBDT(t.fuel)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatBDT(t.maintenance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatBDT(t.salary)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatBDT(t.other)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-800 bg-rose-50/20">
                        {formatBDT(t.totalExpense)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-black ${
                          isProfit
                            ? 'text-emerald-800 bg-emerald-50/50'
                            : 'text-rose-800 bg-rose-50/50'
                        }`}
                      >
                        {formatBDT(t.netProfit)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            isProfit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.revenue > 0 ? `${t.profitMargin.toFixed(1)}%` : '0%'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={isProfit ? 'success' : 'danger'}>
                          {isProfit ? 'Profit' : 'Loss'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Income Add / Edit Modal */}
      {isIncomeModalOpen && (
        <MonthlyIncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setEditingIncome(null);
          }}
          onSave={handleSaveIncome}
          vehicles={dataset.vehicles}
          initialData={editingIncome}
          defaultYear={selectedYear}
          defaultMonth={selectedMonth > 0 ? selectedMonth : currentMonth}
        />
      )}
    </div>
  );
};
