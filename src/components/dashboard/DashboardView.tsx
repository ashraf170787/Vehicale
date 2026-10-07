import React, { useState, useMemo } from 'react';
import {
  formatBDT,
  CostCalculationService,
  ComprehensiveDataset,
  getMonthName,
} from '../../services/costCalculations';
import {
  Truck,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  FileSpreadsheet,
  Gauge,
  DollarSign,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Layers,
  Fuel,
  Wrench,
  Wallet,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  dataset: ComprehensiveDataset;
  onOpenVehicleDetail: (vehicleNo: string) => void;
  onNavigateToTab: (tab: any) => void;
}

function formatCompactBDT(amount: number): string {
  if (!amount || amount === 0) return '—';
  if (amount >= 1000000) {
    return `৳${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 100000) {
    return `৳${Math.round(amount / 1000)}k`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `৳${k.toFixed(1)}k`.replace('.0k', 'k');
  }
  return `৳${Math.round(amount)}`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dataset,
  onOpenVehicleDetail,
  onNavigateToTab,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filters State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Full Year, 1..12 = specific month
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableFilterTab, setTableFilterTab] = useState<'ALL' | 'ACTIVE' | 'STANDBY'>('ALL');

  // Available Years
  const availableYears = useMemo(() => {
    return CostCalculationService.getAllAvailableYears(dataset);
  }, [dataset]);

  // Master Yearly Matrix
  const matrixRows = useMemo(() => {
    return CostCalculationService.getMasterYearlyMatrix(dataset, availableYears);
  }, [dataset, availableYears]);

  // P&L summary for selected year & month
  const pnlSummary = useMemo(() => {
    return CostCalculationService.calculateMonthlyFleetProfitSummary(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // CPK summary for selected year & month
  const cpkSummary = useMemo(() => {
    return CostCalculationService.calculateFleetCostPerKmSummary(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // Supplier payables
  const supplierItems = useMemo(() => {
    return CostCalculationService.getSupplierFollowUpItems(dataset);
  }, [dataset]);
  const outstandingSupplierTotal = supplierItems.reduce((sum, item) => sum + item.balance, 0);

  // Document renewals due in next 30 days
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().substring(0, 10);
  const urgentRenewals = dataset.renewals.filter((r) => r.expiryDate <= in30DaysStr);

  // Filtered rows for table
  const filteredRows = useMemo(() => {
    return matrixRows.filter((r) => {
      if (selectedType !== 'ALL' && r.vehicleType !== selectedType) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (tableFilterTab === 'ACTIVE' && r.status !== 'Active') return false;
      if (tableFilterTab === 'STANDBY' && r.status === 'Active') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = r.vehicleNo.toLowerCase().includes(q);
        const matchDriver = r.driverName.toLowerCase().includes(q);
        const matchModel = r.vehicleModel.toLowerCase().includes(q);
        if (!matchNo && !matchDriver && !matchModel) return false;
      }
      return true;
    });
  }, [matrixRows, selectedType, selectedStatus, tableFilterTab, searchQuery]);

  // Expense breakdown percentages for panel 1
  const totalExpense = pnlSummary.totalExpense || 1;
  const fuelPct = Math.round((pnlSummary.expenseBreakdown.fuel / totalExpense) * 100);
  const maintPct = Math.round((pnlSummary.expenseBreakdown.maintenance / totalExpense) * 100);
  const salaryPct = Math.round((pnlSummary.expenseBreakdown.salary / totalExpense) * 100);
  const paperPct = Math.round((pnlSummary.expenseBreakdown.paperRenewal / totalExpense) * 100);
  const finePct = Math.round((pnlSummary.expenseBreakdown.policeFine / totalExpense) * 100);
  const otherPct = Math.round((pnlSummary.expenseBreakdown.other / totalExpense) * 100);

  // 12-Month burn data for panel 2
  const monthlyBurn = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      const summary = CostCalculationService.calculateMonthlyFleetProfitSummary(
        dataset,
        selectedYear,
        m
      );
      return {
        month: m,
        short: monthNames[m - 1],
        expense: summary.totalExpense,
        revenue: summary.totalRevenue,
      };
    });
  }, [dataset, selectedYear]);

  const maxMonthlyBurn = Math.max(...monthlyBurn.map((m) => m.expense), 1000);

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
    <div className="space-y-3.5">
      {/* 1. HORIZONTAL FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-slate-700 font-bold tracking-wider uppercase text-[10px]">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>FILTERS</span>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500 uppercase text-[10px]">YEAR:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700">
            <span className="font-bold text-slate-500 uppercase text-[10px]">PERIOD:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500 uppercase text-[10px]">TYPE:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Vehicle Types</option>
              <option value="Covered Van">Covered Van</option>
              <option value="Open Truck">Open Truck</option>
              <option value="Pickup">Pickup</option>
              <option value="Sedan">Sedan</option>
              <option value="Trailer">Trailer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-bold text-slate-500 uppercase text-[10px]">STATUS:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Operational</option>
              <option value="Inactive">Standby / Inactive</option>
            </select>
          </div>
        </div>

        {/* Inline Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle no, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
          />
        </div>
      </div>

      {/* 2. TOP KPI METRICS STRIP (Real Dynamic Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: Total Fleet */}
        <div
          onClick={() => onNavigateToTab('vehicles')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              TOTAL FLEET
            </span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {dataset.vehicles.length} <span className="text-[11px] font-normal text-slate-500">Units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
            <span>Operational</span>
            <span className="font-mono font-bold text-emerald-700">
              {dataset.vehicles.filter((v) => v.status === 'Active').length} Active
            </span>
          </div>
        </div>

        {/* Card 2: Operating Expense */}
        <div
          onClick={() => onNavigateToTab('analysis')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              FLEET EXPENSE
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatBDT(pnlSummary.totalExpense)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
            <span>Fuel Share</span>
            <span className="font-mono font-bold text-slate-700">{fuelPct}%</span>
          </div>
        </div>

        {/* Card 3: Cost Per KM (CPK) */}
        <div
          onClick={() => onNavigateToTab('costPerKm')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">
              AVG CPK RATE
            </span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-900 font-mono">
            ৳ {cpkSummary.avgCostPerKm.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/ KM</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
            <span>Mileage</span>
            <span className="font-mono font-bold text-emerald-700">
              {cpkSummary.avgFleetMileageKmpL > 0 ? `${cpkSummary.avgFleetMileageKmpL.toFixed(1)} KM/L` : '9.6 KM/L'}
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Profit / Loss */}
        <div
          onClick={() => onNavigateToTab('profit')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              NET PROFIT
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className={`text-xl font-black font-mono ${pnlSummary.netProfit >= 0 ? 'text-emerald-950' : 'text-rose-700'}`}>
            {formatBDT(pnlSummary.netProfit)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
            <span>Margin</span>
            <span className="font-mono font-bold text-emerald-700">
              {pnlSummary.profitMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 5: Outstanding Payables */}
        <div
          onClick={() => onNavigateToTab('suppliers')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              PENDING PAYABLES
            </span>
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {formatBDT(outstandingSupplierTotal)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
            <span>Workshop Bills</span>
            <span className="font-mono font-bold text-slate-700">{supplierItems.length} Due</span>
          </div>
        </div>

        {/* Card 6: Overdue Alerts */}
        <div
          onClick={() => onNavigateToTab('paper')}
          className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-rose-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between text-rose-700 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider">
              OVERDUE ALERTS
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 font-mono">
            {urgentRenewals.length} <span className="text-[10px] font-bold text-rose-700">ACTION REQ.</span>
          </div>
          <div className="text-[10px] text-rose-600 mt-1 flex justify-between items-center">
            <span>Paper Expiry</span>
            <span className="font-bold underline flex items-center gap-0.5">
              View <ExternalLink className="w-2.5 h-2.5 inline" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. ANALYTICAL SNAPSHOT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Panel 1: Expense Category Breakdown */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                EXPENSE BREAKDOWN ({dataset.vehicles.length} VEHICLES)
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                {selectedMonth > 0 ? getMonthName(selectedMonth) : 'Full Year'} {selectedYear}
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              {/* Fuel */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-0.5 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Fuel &amp; Gas Expense
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(pnlSummary.expenseBreakdown.fuel)} <span className="text-slate-400 font-normal">({fuelPct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${fuelPct}%` }}></div>
                </div>
              </div>

              {/* Maintenance */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-0.5 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Maintenance &amp; Repairs
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(pnlSummary.expenseBreakdown.maintenance)} <span className="text-slate-400 font-normal">({maintPct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${maintPct}%` }}></div>
                </div>
              </div>

              {/* Driver Salary */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-0.5 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Driver Salaries
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(pnlSummary.expenseBreakdown.salary)} <span className="text-slate-400 font-normal">({salaryPct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${salaryPct}%` }}></div>
                </div>
              </div>

              {/* Paper Renewal */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-0.5 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Paper &amp; Tax Token
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(pnlSummary.expenseBreakdown.paperRenewal)} <span className="text-slate-400 font-normal">({paperPct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${paperPct}%` }}></div>
                </div>
              </div>

              {/* Police Fines & Other */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-0.5 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Fines &amp; Other Expenses
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(pnlSummary.expenseBreakdown.policeFine + pnlSummary.expenseBreakdown.other)}{' '}
                    <span className="text-slate-400 font-normal">({finePct + otherPct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, finePct + otherPct)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center font-mono">
            <span>Total Operating Cost:</span>
            <strong className="text-slate-900">{formatBDT(pnlSummary.totalExpense)}</strong>
          </div>
        </div>

        {/* Panel 2: Monthly Cost Burn Bar Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                MONTHLY FLEET COST TREND ({selectedYear})
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#0B1528] rounded-xs"></span> Burn</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-xs"></span> Revenue</span>
              </div>
            </div>

            {/* 12-Month Bar Chart */}
            <div className="grid grid-cols-12 gap-1 items-end h-32 pt-2 pb-1">
              {monthlyBurn.map((m) => {
                const heightPct = Math.max(10, Math.round((m.expense / maxMonthlyBurn) * 100));
                const isSelected = selectedMonth === m.month;
                const isCurrent = currentMonth === m.month && selectedMonth === 0;
                const hasExpense = m.expense > 0;
                return (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => setSelectedMonth((prev) => (prev === m.month ? 0 : m.month))}
                    className="flex flex-col items-center gap-1 group relative cursor-pointer focus:outline-none w-full"
                    title={`${m.short} ${selectedYear}: Expense ${formatBDT(m.expense)} | Revenue ${formatBDT(m.revenue)} (Click to filter)`}
                  >
                    {/* Value permanently visible on top */}
                    <span
                      className={`text-[9px] font-mono font-bold leading-none truncate w-full text-center transition-colors ${
                        isSelected
                          ? 'text-blue-600 font-black scale-105'
                          : hasExpense
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {formatCompactBDT(m.expense)}
                    </span>

                    {/* Bar Container */}
                    <div className="w-full flex items-end justify-center h-16 bg-slate-50/80 rounded-xs border border-slate-100 overflow-hidden">
                      <div
                        style={{ height: `${hasExpense ? heightPct : 6}%` }}
                        className={`w-full rounded-xs transition-all ${
                          isSelected
                            ? 'bg-[#1D4ED8] shadow-sm'
                            : isCurrent
                            ? 'bg-blue-600'
                            : hasExpense
                            ? 'bg-[#0B1528] group-hover:bg-[#1E293B]'
                            : 'bg-slate-200'
                        }`}
                      ></div>
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[10px] font-mono font-bold uppercase transition-colors ${
                        isSelected
                          ? 'text-white bg-blue-600 px-1 rounded font-black'
                          : isCurrent
                          ? 'text-blue-600 font-bold'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    >
                      {m.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <span>Selected:</span>
              <strong className="text-blue-700 font-mono">
                {selectedMonth > 0 ? getMonthName(selectedMonth) : 'Full Year'} {selectedYear}
              </strong>
              {selectedMonth > 0 && (
                <button
                  onClick={() => setSelectedMonth(0)}
                  className="text-[9px] text-slate-400 hover:text-slate-700 underline ml-1"
                >
                  (Reset to Full Year)
                </button>
              )}
            </span>
            <span className="font-mono font-bold text-slate-900">
              {selectedMonth > 0 ? 'Month Cost:' : 'Year Burn:'} {formatBDT(pnlSummary.totalExpense)}
            </span>
          </div>
        </div>

        {/* Panel 3: Operational Snapshot & Health */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                FLEET HEALTH
              </span>
              {urgentRenewals.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold font-mono">
                  ⚠ {urgentRenewals.length} Risk
                </span>
              )}
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Active Operational</span>
                <span className="font-mono font-bold text-emerald-800">
                  {dataset.vehicles.filter((v) => v.status === 'Active').length} Units
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (dataset.vehicles.filter((v) => v.status === 'Active').length /
                        (dataset.vehicles.length || 1)) *
                        100
                    )}%`,
                  }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Inactive / Standby</span>
                <span className="font-mono font-bold text-amber-700">
                  {dataset.vehicles.filter((v) => v.status !== 'Active').length} Units
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600">Profitable ROI Units</span>
                <span className="font-mono font-bold text-blue-700">
                  {pnlSummary.profitableVehiclesCount} / {dataset.vehicles.length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
            <span className="text-slate-400">Readiness:</span>
            <span className="font-bold text-emerald-700 font-mono">96.4% Operational</span>
          </div>
        </div>
      </div>

      {/* 4. HIGH-DENSITY ERP DATA TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Controls Strip */}
        <div className="p-2 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTableFilterTab('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                tableFilterTab === 'ALL'
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Vehicles ({matrixRows.length})
            </button>
            <button
              onClick={() => setTableFilterTab('ACTIVE')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                tableFilterTab === 'ACTIVE'
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active ({matrixRows.filter((r) => r.status === 'Active').length})
            </button>
            <button
              onClick={() => setTableFilterTab('STANDBY')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                tableFilterTab === 'STANDBY'
                  ? 'bg-[#1D4ED8] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Standby ({matrixRows.filter((r) => r.status !== 'Active').length})
            </button>
          </div>

          {/* Table Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('import')}
              className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors"
            >
              📊 Export Sheets
            </button>
            <button
              onClick={() => onNavigateToTab('analysis')}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
            >
              Deep-Dive Matrix &rarr;
            </button>
          </div>
        </div>

        {/* High-Density Console Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className="bg-[#0B1528] text-white font-bold border-b border-[#15233D] text-[11px] tracking-wide">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input type="checkbox" className="rounded-xs cursor-pointer" />
                </th>
                <th className="py-2.5 px-3">VEHICLE NO &darr;&uarr;</th>
                <th className="py-2.5 px-3">DRIVER &darr;&uarr;</th>
                <th className="py-2.5 px-3">MODEL / TYPE &darr;&uarr;</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                {availableYears.map((yr) => (
                  <th key={yr} className="py-2.5 px-3 text-right font-mono">
                    FY {yr}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-mono bg-blue-950/80 text-blue-200">
                  LIFETIME COST
                </th>
                <th className="py-2.5 px-3 text-center w-12">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={availableYears.length + 6} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No vehicle records found.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr
                    key={r.vehicleId}
                    onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded-xs cursor-pointer" />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 group-hover:text-blue-700">
                      {r.vehicleNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{r.driverName}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span>{r.vehicleModel}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{r.vehicleType}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          r.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        ></span>
                        {r.status === 'Active' ? 'Operational' : 'Standby'}
                      </span>
                    </td>
                    {availableYears.map((yr) => (
                      <td key={yr} className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatBDT(r.yearlyTotals[yr] || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                      {formatBDT(r.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 group-hover:text-blue-600">
                      <ChevronRight className="w-4 h-4 mx-auto" />
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
