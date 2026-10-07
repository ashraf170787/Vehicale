import React, { useState, useMemo } from 'react';
import {
  formatBDT,
  CostCalculationService,
  ComprehensiveDataset,
} from '../../services/costCalculations';
import { ExcelService } from '../../services/excelService';
import { VehicleYearlyCostRow } from '../../types';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Eye,
  Layers,
  TrendingUp,
  Table as TableIcon,
  PieChart as PieIcon,
  Search,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface VehicleCostAnalysisProps {
  dataset: ComprehensiveDataset;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const VehicleCostAnalysis: React.FC<VehicleCostAnalysisProps> = ({
  dataset,
  onOpenVehicleDetail,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'breakdown' | 'monthly'>('matrix');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedVehicleForMonthly, setSelectedVehicleForMonthly] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamically extract all available years
  const availableYears = useMemo(() => {
    return CostCalculationService.getAllAvailableYears(dataset);
  }, [dataset]);

  // Master Yearly Matrix rows
  const matrixRows: VehicleYearlyCostRow[] = useMemo(() => {
    return CostCalculationService.getMasterYearlyMatrix(dataset, availableYears);
  }, [dataset, availableYears]);

  // Filtered rows
  const filteredMatrixRows = useMemo(() => {
    return matrixRows.filter((row) => {
      if (typeFilter !== 'ALL' && row.vehicleType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = row.vehicleNo.toLowerCase().includes(q);
        const matchDriver = row.driverName.toLowerCase().includes(q);
        const matchModel = row.vehicleModel.toLowerCase().includes(q);
        if (!matchNo && !matchDriver && !matchModel) return false;
      }
      return true;
    });
  }, [matrixRows, typeFilter, statusFilter, searchQuery]);

  // Overall totals per year for footer
  const yearTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    availableYears.forEach((yr) => {
      totals[yr] = filteredMatrixRows.reduce((sum, r) => sum + (r.yearlyTotals[yr] || 0), 0);
    });
    const grand = filteredMatrixRows.reduce((sum, r) => sum + r.grandTotal, 0);
    return { yearly: totals, grand };
  }, [filteredMatrixRows, availableYears]);

  // Category breakdown for selected year across vehicles
  const breakdownRows = useMemo(() => {
    return filteredMatrixRows.map((v) => {
      const breakdown = CostCalculationService.getVehicleYearlyBreakdown(
        v.vehicleNo,
        selectedYear,
        dataset
      );
      return {
        vehicleNo: v.vehicleNo,
        vehicleModel: v.vehicleModel,
        vehicleType: v.vehicleType,
        driverName: v.driverName,
        status: v.status,
        ...breakdown,
      };
    });
  }, [filteredMatrixRows, selectedYear, dataset]);

  // Monthly breakdown for selected year
  const monthlyRows = useMemo(() => {
    return CostCalculationService.getMonthlyCostBreakdown(
      selectedYear,
      selectedVehicleForMonthly,
      dataset
    );
  }, [selectedYear, selectedVehicleForMonthly, dataset]);

  // Unique vehicle types for filter
  const vehicleTypes = useMemo(() => {
    const set = new Set(dataset.vehicles.map((v) => v.vehicleType));
    return Array.from(set);
  }, [dataset.vehicles]);

  // Export to Excel
  const handleExportYearlyMatrix = () => {
    const sheetData = filteredMatrixRows.map((r) => {
      const rowObj: any = {
        'Vehicle No': r.vehicleNo,
        'Type': r.vehicleType,
        'Model': r.vehicleModel,
        'Driver': r.driverName,
        'Status': r.status,
      };
      availableYears.forEach((yr) => {
        rowObj[`Year ${yr} (BDT)`] = r.yearlyTotals[yr] || 0;
      });
      rowObj['Total Cost (BDT)'] = r.grandTotal;
      return rowObj;
    });

    ExcelService.exportToExcel(
      [{ sheetName: 'Yearly Vehicle Costs', data: sheetData }],
      'Vehicle_Yearly_Cost_Analysis'
    );
  };

  const handleExportCategoryBreakdown = () => {
    const sheetData = breakdownRows.map((b) => ({
      'Vehicle No': b.vehicleNo,
      'Model': b.vehicleModel,
      'Type': b.vehicleType,
      'Year': selectedYear,
      'Maintenance (BDT)': b.maintenance,
      'Fuel (BDT)': b.fuel,
      'Driver Salary (BDT)': b.salary,
      'Paper Renewal (BDT)': b.paperRenewal,
      'Police Fine (BDT)': b.policeFine,
      'Other Expenses (BDT)': b.other,
      'Total Cost (BDT)': b.total,
    }));

    ExcelService.exportToExcel(
      [{ sheetName: `Breakdown ${selectedYear}`, data: sheetData }],
      `Vehicle_Category_Cost_${selectedYear}`
    );
  };

  const handleExportMonthlyAnalysis = () => {
    const sheetData = monthlyRows.map((m) => ({
      'Month': m.monthName,
      'Year': selectedYear,
      'Vehicle': selectedVehicleForMonthly === 'ALL' ? 'All Vehicles' : selectedVehicleForMonthly,
      'Maintenance (BDT)': m.maintenance,
      'Fuel (BDT)': m.fuel,
      'Driver Salary (BDT)': m.salary,
      'Paper Renewal (BDT)': m.paperRenewal,
      'Police Fine (BDT)': m.policeFine,
      'Other Expenses (BDT)': m.other,
      'Total Cost (BDT)': m.total,
    }));

    ExcelService.exportToExcel(
      [{ sheetName: `Monthly ${selectedYear}`, data: sheetData }],
      `Monthly_Cost_Analysis_${selectedYear}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with View Mode Toggles and Action Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'matrix'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Yearly Cost Matrix ({availableYears.length} Years)</span>
          </button>

          <button
            onClick={() => setViewMode('breakdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'breakdown'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cost Category Breakdown</span>
          </button>

          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Monthly Cost Analysis</span>
          </button>
        </div>

        {/* Export & Context Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'matrix' && (
            <button
              onClick={handleExportYearlyMatrix}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Yearly Excel</span>
            </button>
          )}

          {viewMode === 'breakdown' && (
            <button
              onClick={handleExportCategoryBreakdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Breakdown Excel</span>
            </button>
          )}

          {viewMode === 'monthly' && (
            <button
              onClick={handleExportMonthlyAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Monthly Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle no, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Types</option>
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Year Selector for Breakdown & Monthly modes */}
          {(viewMode === 'breakdown' || viewMode === 'monthly') && (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="text-emerald-900 font-bold">Analysis Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-emerald-300 rounded px-2 py-0.5 font-bold text-emerald-900 focus:outline-none"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle Selector for Monthly mode */}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              <span className="text-blue-900 font-bold">Vehicle:</span>
              <select
                value={selectedVehicleForMonthly}
                onChange={(e) => setSelectedVehicleForMonthly(e.target.value)}
                className="bg-white border border-blue-300 rounded px-2 py-0.5 font-medium text-blue-900 focus:outline-none"
              >
                <option value="ALL">All Factory Vehicles (Consolidated)</option>
                {dataset.vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNo}>
                    {v.vehicleNo} ({v.vehicleModel})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-slate-500 font-medium text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredMatrixRows.length}</span> of{' '}
          {dataset.vehicles.length} vehicles
        </div>
      </div>

      {/* VIEW 1: MASTER YEARLY COST MATRIX TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">
                Yearly Vehicle Cost Master Matrix
              </h3>
              <Badge variant="purple" size="sm">
                Multi-Year Analysis
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Formula: Maintenance + Fuel + Driver Salary + Paper + Fine + Other
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100/95 z-10 w-48">
                    Vehicle No
                  </th>
                  <th className="py-3 px-3">Model / Type</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  {availableYears.map((yr) => (
                    <th key={yr} className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      {yr}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/70">
                    5-Year / Total
                  </th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatrixRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={availableYears.length + 6}
                      className="py-10 text-center text-slate-400 font-medium"
                    >
                      No vehicles matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMatrixRows.map((r) => (
                    <tr
                      key={r.vehicleId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                    >
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/95 z-10 font-bold text-slate-900 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{r.vehicleNo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-medium text-slate-800">{r.vehicleModel}</div>
                        <div className="text-[10px] text-slate-400">{r.vehicleType}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{r.driverName}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={r.status === 'Active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>

                      {/* Yearly amounts */}
                      {availableYears.map((yr) => {
                        const amount = r.yearlyTotals[yr] || 0;
                        return (
                          <td
                            key={yr}
                            className="py-3 px-3 text-right font-mono font-medium text-slate-700"
                          >
                            {amount > 0 ? (
                              formatBDT(amount)
                            ) : (
                              <span className="text-slate-300 font-sans">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 text-xs">
                        {formatBDT(r.grandTotal)}
                      </td>

                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Master Totals Footer */}
              {filteredMatrixRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td
                      colSpan={4}
                      className="py-3.5 px-4 sticky left-0 bg-slate-100 text-xs uppercase tracking-wider"
                    >
                      Fleet Total Cost
                    </td>
                    {availableYears.map((yr) => (
                      <td key={yr} className="py-3.5 px-3 text-right font-mono text-xs">
                        {formatBDT(yearTotals.yearly[yr] || 0)}
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-800 bg-emerald-100/60 font-black">
                      {formatBDT(yearTotals.grand)}
                    </td>
                    <td className="py-3.5 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CATEGORY COST BREAKDOWN FOR SELECTED YEAR */}
      {viewMode === 'breakdown' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">
                Expense Category Breakdown — Year {selectedYear}
              </h3>
              <Badge variant="info" size="sm">
                ৳ BDT
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Breakdown across Maintenance, Fuel, Driver Salary, Renewals, Fines &amp; Others
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-44">Vehicle No</th>
                  <th className="py-3 px-3 text-right">Maintenance</th>
                  <th className="py-3 px-3 text-right">Fuel</th>
                  <th className="py-3 px-3 text-right">Driver Salary</th>
                  <th className="py-3 px-3 text-right">Paper Renewal</th>
                  <th className="py-3 px-3 text-right">Police / Fine</th>
                  <th className="py-3 px-3 text-right">Other</th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/70">
                    Total Cost ({selectedYear})
                  </th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdownRows.map((b) => (
                  <tr
                    key={b.vehicleNo}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      <div>{b.vehicleNo}</div>
                      <div className="text-[10px] text-slate-400 font-normal font-sans">
                        {b.vehicleModel}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.maintenance)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.fuel)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.salary)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.paperRenewal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.policeFine)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatBDT(b.other)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {formatBDT(b.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onOpenVehicleDetail(b.vehicleNo)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4 text-xs uppercase">Fleet Total</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.maintenance, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.fuel, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.salary, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.paperRenewal, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.policeFine, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.other, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 bg-emerald-100/60">
                    {formatBDT(breakdownRows.reduce((s, x) => s + x.total, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY COST ANALYSIS TABLE */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-800">
                Monthly Cost Analysis — Year {selectedYear} (
                {selectedVehicleForMonthly === 'ALL'
                  ? 'All Vehicles'
                  : selectedVehicleForMonthly}
                )
              </h3>
              <Badge variant="info" size="sm">
                Monthly Breakdown
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              January to December expense distribution
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-32">Month</th>
                  <th className="py-3 px-3 text-right">Maintenance</th>
                  <th className="py-3 px-3 text-right">Fuel</th>
                  <th className="py-3 px-3 text-right">Driver Salary</th>
                  <th className="py-3 px-3 text-right">Paper Renewal</th>
                  <th className="py-3 px-3 text-right">Police / Fine</th>
                  <th className="py-3 px-3 text-right">Other</th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/70">
                    Month Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRows.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {m.monthName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.maintenance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.fuel)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.salary)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.paperRenewal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.policeFine)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatBDT(m.other)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {formatBDT(m.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4 text-xs uppercase">Annual Total</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.maintenance, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.fuel, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.salary, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.paperRenewal, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.policeFine, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.other, 0))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 bg-emerald-100/60">
                    {formatBDT(monthlyRows.reduce((s, x) => s + x.total, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
