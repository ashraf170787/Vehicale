import React, { useState, useMemo } from 'react';
import {
  Gauge,
  TrendingUp,
  Plus,
  Download,
  Search,
  Calendar,
  Fuel,
  Wrench,
  Calculator,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  VehicleMonthlyMileage,
  CostPerKmRow,
  FleetCostPerKmSummary,
} from '../../types';
import {
  ComprehensiveDataset,
  CostCalculationService,
  formatBDT,
  formatRate,
  getMonthName,
} from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { MileageModal } from './MileageModal';

interface CostPerKmModuleProps {
  dataset: ComprehensiveDataset;
  onRefresh: () => void;
  onOpenVehicleDetail?: (vehicleNo: string) => void;
}

export const CostPerKmModule: React.FC<CostPerKmModuleProps> = ({
  dataset,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); // 0 = Full Year
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'statement' | 'mileageLogs' | 'monthlyTrend'>('statement');

  // Calculator state
  const [calcDistance, setCalcDistance] = useState<number>(150);
  const [calcVehicleNo, setCalcVehicleNo] = useState<string>(dataset.vehicles[0]?.vehicleNo || 'FLEET_AVG');

  // Mileage Modal State
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [editingMileage, setEditingMileage] = useState<VehicleMonthlyMileage | null>(null);

  // Calculate Cost Per KM Rows
  const cpkRows = useMemo(() => {
    return CostCalculationService.calculateCostPerKmRows(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // Calculate Fleet Summary
  const fleetSummary = useMemo(() => {
    return CostCalculationService.calculateFleetCostPerKmSummary(
      dataset,
      selectedYear,
      selectedMonth > 0 ? selectedMonth : undefined
    );
  }, [dataset, selectedYear, selectedMonth]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return cpkRows;
    const term = searchTerm.toLowerCase();
    return cpkRows.filter(
      (r) =>
        r.vehicleNo.toLowerCase().includes(term) ||
        r.driverName.toLowerCase().includes(term) ||
        r.vehicleModel.toLowerCase().includes(term)
    );
  }, [cpkRows, searchTerm]);

  // Mileage Logs List
  const mileageLogs = useMemo(() => {
    const all = dataset.mileages || [];
    return all
      .filter((ml: VehicleMonthlyMileage) => {
        if (ml.year !== selectedYear) return false;
        if (selectedMonth > 0 && ml.month !== selectedMonth) return false;
        if (searchTerm.trim()) {
          return ml.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .sort((a: VehicleMonthlyMileage, b: VehicleMonthlyMileage) => b.month - a.month);
  }, [dataset.mileages, selectedYear, selectedMonth, searchTerm]);

  // 12-Month CPK Trend for selected year
  const monthlyTrendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map((m) => {
      const summary = CostCalculationService.calculateFleetCostPerKmSummary(
        dataset,
        selectedYear,
        m
      );
      return {
        month: m,
        monthName: getMonthName(m),
        totalKm: summary.totalFleetKmRun,
        totalFuelLitres: summary.totalFleetFuelLitres,
        mileageKmpL: summary.avgFleetMileageKmpL,
        fuelCpk: summary.avgFuelCostPerKm,
        maintCpk: summary.avgMaintenanceCostPerKm,
        salaryCpk: summary.avgSalaryCostPerKm,
        otherCpk: summary.avgOtherCostPerKm,
        totalCpk: summary.avgCostPerKm,
        revenueCpk: summary.avgRevenuePerKm,
        profitCpk: summary.avgNetProfitPerKm,
      };
    });
  }, [dataset, selectedYear]);

  // Trip Calculator Estimation
  const tripEstimate = useMemo(() => {
    const targetRow = cpkRows.find((r) => r.vehicleNo === calcVehicleNo);
    const fuelRatePerKm = targetRow && targetRow.totalKmRun > 0 ? targetRow.fuelCostPerKm : fleetSummary.avgFuelCostPerKm || 10.5;
    const maintRatePerKm = targetRow && targetRow.totalKmRun > 0 ? targetRow.maintenanceCostPerKm : fleetSummary.avgMaintenanceCostPerKm || 3.5;
    const salaryRatePerKm = targetRow && targetRow.totalKmRun > 0 ? targetRow.salaryCostPerKm : fleetSummary.avgSalaryCostPerKm || 6.5;
    const otherRatePerKm = targetRow && targetRow.totalKmRun > 0 ? targetRow.otherCostPerKm : fleetSummary.avgOtherCostPerKm || 2.0;

    const totalRatePerKm = fuelRatePerKm + maintRatePerKm + salaryRatePerKm + otherRatePerKm;
    const estTripCost = Math.round(calcDistance * totalRatePerKm);
    const estFuelCost = Math.round(calcDistance * fuelRatePerKm);
    const estMaintShare = Math.round(calcDistance * maintRatePerKm);
    const estSalaryShare = Math.round(calcDistance * salaryRatePerKm);
    const recommendedFare = Math.round(estTripCost * 1.35); // 35% target margin

    return {
      fuelRatePerKm,
      totalRatePerKm,
      estTripCost,
      estFuelCost,
      estMaintShare,
      estSalaryShare,
      recommendedFare,
    };
  }, [calcDistance, calcVehicleNo, cpkRows, fleetSummary]);

  // Handle Save Mileage
  const handleSaveMileage = (item: VehicleMonthlyMileage) => {
    storage.saveMileage(item);
    onRefresh();
  };

  // Handle Delete Mileage
  const handleDeleteMileage = (id: string) => {
    if (window.confirm('Are you sure you want to delete this KM log entry?')) {
      storage.deleteMileage(id);
      onRefresh();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const periodName =
      selectedMonth > 0
        ? `${getMonthName(selectedMonth)}_${selectedYear}`
        : `Full_Year_${selectedYear}`;

    const statementData = cpkRows.map((r, idx) => ({
      'SL NO': idx + 1,
      'VEHICLE NO': r.vehicleNo,
      'MODEL': r.vehicleModel,
      'DRIVER': r.driverName,
      'PERIOD': selectedMonth > 0 ? `${getMonthName(selectedMonth)} ${selectedYear}` : `Year ${selectedYear}`,
      'TOTAL KM RUN': r.totalKmRun,
      'FUEL LITRES': r.totalFuelLitres,
      'MILEAGE (KM/L)': r.fuelMileageKmpL > 0 ? r.fuelMileageKmpL.toFixed(2) : 'N/A',
      'FUEL COST (BDT)': r.fuelCost,
      'FUEL CPK (BDT/KM)': r.fuelCostPerKm.toFixed(2),
      'MAINTENANCE CPK (BDT/KM)': r.maintenanceCostPerKm.toFixed(2),
      'SALARY CPK (BDT/KM)': r.salaryCostPerKm.toFixed(2),
      'OTHER CPK (BDT/KM)': r.otherCostPerKm.toFixed(2),
      'TOTAL COST PER KM (BDT/KM)': r.totalCostPerKm.toFixed(2),
      'TOTAL EXPENSE (BDT)': r.totalCost,
      'TOTAL REVENUE (BDT)': r.totalRevenue,
      'REVENUE PER KM (BDT/KM)': r.revenuePerKm.toFixed(2),
      'NET PROFIT PER KM (BDT/KM)': r.netProfitPerKm.toFixed(2),
      'RATING': r.efficiencyRating,
    }));

    const logSheetData = (dataset.mileages || []).map((ml: VehicleMonthlyMileage, idx: number) => ({
      'SL NO': idx + 1,
      'MONTH': getMonthName(ml.month),
      'YEAR': ml.year,
      'VEHICLE NO': ml.vehicleNo,
      'START ODOMETER': ml.startOdometer || '',
      'END ODOMETER': ml.endOdometer || '',
      'TOTAL KM RUN': ml.totalKmRun,
      'TRIPS COUNT': ml.totalTrips || '',
      'REMARKS': ml.remarks || '',
    }));

    ExcelService.exportToExcel(
      [
        { sheetName: 'Cost_Per_KM_Analysis', data: statementData },
        { sheetName: 'KM_Distance_Logs', data: logSheetData },
      ],
      `Vehicle_Cost_Per_KM_Report_${periodName}`
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
              <Gauge className="w-6 h-6 text-sky-600" />
              <span>Cost Per Kilometer (CPK) Analysis</span>
            </h1>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-xs">
              Operating Rate
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track precise cost per kilometer (Fuel, Maintenance, Driver Salary, Total CPK) for each vehicle.
          </p>
        </div>

        {/* Filters and Actions */}
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
            <span>Export Excel</span>
          </button>

          {/* Log KM Button */}
          <button
            onClick={() => {
              setEditingMileage(null);
              setIsMileageModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Vehicle KM</span>
          </button>
        </div>
      </div>

      {/* Top 4 Executive KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Fleet Average Cost Per KM */}
        <div className="bg-white p-4 rounded-xl border-2 border-sky-400 bg-sky-50/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-sky-950">
            <span>FLEET AVG COST PER KM</span>
            <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-950 font-mono mt-1">
            {formatRate(fleetSummary.avgCostPerKm)} <span className="text-xs font-bold text-slate-500">/ KM</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-sky-200/60 font-semibold">
            <span>Total Distance: <strong className="font-mono">{fleetSummary.totalFleetKmRun.toLocaleString()} KM</strong></span>
            <span className="text-sky-800">All Expenses Included</span>
          </div>
        </div>

        {/* 2. Fuel Cost Per KM & Mileage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>FUEL COST / KM & MILEAGE</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">
            {formatRate(fleetSummary.avgFuelCostPerKm)} <span className="text-xs font-bold text-slate-500">/ KM</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-semibold">
            <span>Avg Mileage: <strong className="text-emerald-700 font-mono">{fleetSummary.avgFleetMileageKmpL > 0 ? `${fleetSummary.avgFleetMileageKmpL.toFixed(1)} KM/L` : 'N/A'}</strong></span>
            <span>Fuel Litres: {fleetSummary.totalFleetFuelLitres.toLocaleString()} L</span>
          </div>
        </div>

        {/* 3. Maintenance Cost Per KM */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>MAINTENANCE COST / KM</span>
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-700 font-mono mt-1">
            {formatRate(fleetSummary.avgMaintenanceCostPerKm)} <span className="text-xs font-bold text-slate-500">/ KM</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-semibold">
            <span>Salary Rate: <strong className="font-mono">{formatRate(fleetSummary.avgSalaryCostPerKm)}/KM</strong></span>
            <span>Other: <strong className="font-mono">{formatRate(fleetSummary.avgOtherCostPerKm)}/KM</strong></span>
          </div>
        </div>

        {/* 4. Profit Per KM */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>NET PROFIT / KM RATE</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono mt-1 ${fleetSummary.avgNetProfitPerKm >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatRate(fleetSummary.avgNetProfitPerKm)} <span className="text-xs font-bold text-slate-500">/ KM</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-semibold">
            <span>Revenue Rate: <strong className="font-mono text-blue-700">{formatRate(fleetSummary.avgRevenuePerKm)}/KM</strong></span>
            <span className={fleetSummary.avgNetProfitPerKm >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
              {fleetSummary.avgNetProfitPerKm >= 0 ? 'Profitable' : 'Loss'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Trip Cost Calculator */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-xl text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-black tracking-wide uppercase text-amber-400">
                Trip Cost & Minimum Fare Estimator
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Calculate projected fuel expense, maintenance reserve, total trip cost and suggested billing fare.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                Select Vehicle
              </label>
              <select
                value={calcVehicleNo}
                onChange={(e) => setCalcVehicleNo(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none"
              >
                <option value="FLEET_AVG">Fleet Average Rate</option>
                {dataset.vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNo}>
                    {v.vehicleNo} ({v.vehicleModel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                Trip Distance (KM)
              </label>
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="1"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(Math.max(1, Number(e.target.value)))}
                  className="w-20 bg-transparent text-sm font-mono font-black text-amber-400 focus:outline-none text-right"
                />
                <span className="text-xs font-bold text-slate-400">KM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Result Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fuel Expense</span>
            <span className="text-base font-black font-mono text-amber-400">{formatBDT(tripEstimate.estFuelCost)}</span>
            <span className="text-[10px] text-slate-400 block font-mono">@{formatRate(tripEstimate.fuelRatePerKm)}/km</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Maintenance Share</span>
            <span className="text-base font-black font-mono text-orange-400">{formatBDT(tripEstimate.estMaintShare)}</span>
            <span className="text-[10px] text-slate-400 block">Wear & Tear Reserve</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Driver & Fixed Costs</span>
            <span className="text-base font-black font-mono text-indigo-300">{formatBDT(tripEstimate.estSalaryShare)}</span>
            <span className="text-[10px] text-slate-400 block">Salary / Paper Share</span>
          </div>

          <div className="bg-slate-800/90 p-2.5 rounded-lg border-2 border-rose-500/80 bg-rose-950/20">
            <span className="text-[10px] text-rose-300 uppercase font-black block">Total Operating Cost</span>
            <span className="text-lg font-black font-mono text-white">{formatBDT(tripEstimate.estTripCost)}</span>
            <span className="text-[10px] text-rose-300 block font-mono">@{formatRate(tripEstimate.totalRatePerKm)}/km</span>
          </div>

          <div className="bg-slate-800/90 p-2.5 rounded-lg border-2 border-emerald-500/80 bg-emerald-950/20">
            <span className="text-[10px] text-emerald-300 uppercase font-black block">Recommended Fare</span>
            <span className="text-lg font-black font-mono text-emerald-400">{formatBDT(tripEstimate.recommendedFare)}</span>
            <span className="text-[10px] text-emerald-300 block font-semibold">+35% Target Margin</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
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
              1. Vehicle CPK Breakdown Table
            </button>
            <button
              onClick={() => setActiveTab('mileageLogs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'mileageLogs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Mileage Logs ({dataset.mileages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('monthlyTrend')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'monthlyTrend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. 12-Month CPK Trend
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
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* TAB 1: VEHICLE COST PER KM STATEMENT */}
        {activeTab === 'statement' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0B1528] text-white font-bold border-b border-[#15233D] text-[11px] tracking-wide">
                  <th className="py-2.5 px-3">VEHICLE NO &darr;&uarr;</th>
                  <th className="py-2.5 px-3">PERIOD</th>
                  <th className="py-2.5 px-3">DRIVER / MODEL &darr;&uarr;</th>
                  <th className="py-2.5 px-3 text-right bg-blue-950/80 text-blue-200">
                    TOTAL KM RUN
                  </th>
                  <th className="py-2.5 px-3 text-center bg-amber-950/60 text-amber-200">
                    MILEAGE (KM/L)
                  </th>
                  <th className="py-2.5 px-3 text-right">FUEL CPK</th>
                  <th className="py-2.5 px-3 text-right">MAINT CPK</th>
                  <th className="py-2.5 px-3 text-right">SALARY CPK</th>
                  <th className="py-2.5 px-3 text-right">OTHER CPK</th>
                  <th className="py-2.5 px-3 text-right bg-sky-900 text-sky-100 font-black">
                    TOTAL CPK
                  </th>
                  <th className="py-2.5 px-3 text-right text-emerald-300">
                    REVENUE / KM
                  </th>
                  <th className="py-2.5 px-3 text-center">RATING</th>
                  <th className="py-2.5 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No vehicle KM readings logged yet.</p>
                        <p className="text-slate-400 text-xs">
                          Click "+ Log Vehicle KM" to enter odometer readings.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const hasKm = r.totalKmRun > 0;
                    return (
                      <tr key={r.vehicleId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {onOpenVehicleDetail ? (
                            <button
                              onClick={() => onOpenVehicleDetail(r.vehicleNo)}
                              className="text-sky-700 hover:underline font-bold"
                            >
                              {r.vehicleNo}
                            </button>
                          ) : (
                            r.vehicleNo
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold text-[11px]">
                            {selectedMonth > 0
                              ? `${getMonthName(selectedMonth)} ${selectedYear}`
                              : `Year ${selectedYear}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800 block">{r.driverName}</span>
                          <span className="text-[10px] text-slate-400">{r.vehicleModel}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-blue-50/30 text-blue-950">
                          {hasKm ? `${r.totalKmRun.toLocaleString()} KM` : <span className="text-slate-400 font-normal">Not Logged</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold bg-amber-50/30 text-amber-900">
                          {r.fuelMileageKmpL > 0 ? (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[11px]">
                              {r.fuelMileageKmpL.toFixed(1)} KM/L
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[10px]">N/A</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {hasKm ? formatRate(r.fuelCostPerKm) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {hasKm ? formatRate(r.maintenanceCostPerKm) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {hasKm ? formatRate(r.salaryCostPerKm) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {hasKm ? formatRate(r.otherCostPerKm) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm bg-sky-50/80 text-sky-950">
                          {hasKm ? `${formatRate(r.totalCostPerKm)} / KM` : <span className="text-slate-400 text-xs font-normal">Log KM</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {hasKm && r.totalRevenue > 0 ? `${formatRate(r.revenuePerKm)} / KM` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.efficiencyRating === 'Excellent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.efficiencyRating === 'Good'
                                ? 'bg-blue-100 text-blue-800'
                                : r.efficiencyRating === 'Moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : r.efficiencyRating === 'High Cost'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.efficiencyRating}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              const existingMl = dataset.mileages?.find(
                                (ml: VehicleMonthlyMileage) =>
                                  ml.vehicleNo === r.vehicleNo &&
                                  ml.year === selectedYear &&
                                  ml.month === (selectedMonth > 0 ? selectedMonth : currentMonth)
                              );
                              if (existingMl) {
                                setEditingMileage(existingMl);
                              } else {
                                setEditingMileage({
                                  id: `km-${Date.now()}`,
                                  vehicleNo: r.vehicleNo,
                                  month: selectedMonth > 0 ? selectedMonth : currentMonth,
                                  year: selectedYear,
                                  totalKmRun: 2500,
                                  createdAt: new Date().toISOString(),
                                });
                              }
                              setIsMileageModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
                          >
                            {hasKm ? 'Edit KM' : '+ Log KM'}
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
                      Fleet Average ({filteredRows.length} Vehicles)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-950 text-sm bg-blue-100/40">
                      {fleetSummary.totalFleetKmRun.toLocaleString()} KM
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-950 bg-amber-100/40">
                      {fleetSummary.avgFleetMileageKmpL > 0 ? `${fleetSummary.avgFleetMileageKmpL.toFixed(1)} KM/L` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatRate(fleetSummary.avgFuelCostPerKm)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatRate(fleetSummary.avgMaintenanceCostPerKm)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {formatRate(fleetSummary.avgSalaryCostPerKm)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatRate(fleetSummary.avgOtherCostPerKm)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-base bg-sky-100/80 text-sky-950">
                      {formatRate(fleetSummary.avgCostPerKm)} / KM
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatRate(fleetSummary.avgRevenuePerKm)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-xs text-sky-900 font-bold">
                      Average CPK Rate
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 2: MILEAGE DISTANCE LOGS */}
        {activeTab === 'mileageLogs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Month / Year</th>
                  <th className="py-2.5 px-3">Vehicle No</th>
                  <th className="py-2.5 px-3 text-right">Start Odometer</th>
                  <th className="py-2.5 px-3 text-right">End Odometer</th>
                  <th className="py-2.5 px-3 text-right font-black text-blue-950 bg-blue-50/50">
                    Total KM Run
                  </th>
                  <th className="py-2.5 px-3 text-center">Trips Count</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mileageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No mileage logs recorded.</p>
                        <button
                          onClick={() => {
                            setEditingMileage(null);
                            setIsMileageModalOpen(true);
                          }}
                          className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold shadow-xs hover:bg-sky-700 transition-colors"
                        >
                          + Log First Reading
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mileageLogs.map((ml: VehicleMonthlyMileage) => (
                    <tr key={ml.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {getMonthName(ml.month)}, {ml.year}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {ml.vehicleNo}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {ml.startOdometer ? ml.startOdometer.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {ml.endOdometer ? ml.endOdometer.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-950 bg-blue-50/30">
                        {ml.totalKmRun.toLocaleString()} KM
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {ml.totalTrips ? `${ml.totalTrips} trips` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {ml.remarks || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingMileage(ml);
                              setIsMileageModalOpen(true);
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMileage(ml.id)}
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

        {/* TAB 3: MONTHLY CPK TREND */}
        {activeTab === 'monthlyTrend' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Month ({selectedYear})</th>
                  <th className="py-2.5 px-3 text-right text-blue-950 bg-blue-50/50">
                    Fleet Total KM
                  </th>
                  <th className="py-2.5 px-3 text-center">Avg Mileage (KM/L)</th>
                  <th className="py-2.5 px-3 text-right">Fuel CPK</th>
                  <th className="py-2.5 px-3 text-right">Maint CPK</th>
                  <th className="py-2.5 px-3 text-right">Salary CPK</th>
                  <th className="py-2.5 px-3 text-right">Other CPK</th>
                  <th className="py-2.5 px-3 text-right font-black bg-sky-100/80 text-sky-950">
                    TOTAL CPK (BDT/KM)
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">
                    Revenue CPK
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">
                    Net Profit CPK
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTrendData.map((t) => (
                  <tr key={t.month} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {t.monthName} ({t.month})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-950 bg-blue-50/20">
                      {t.totalKm > 0 ? `${t.totalKm.toLocaleString()} KM` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-amber-900">
                      {t.mileageKmpL > 0 ? `${t.mileageKmpL.toFixed(1)} KM/L` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {t.totalKm > 0 ? formatRate(t.fuelCpk) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {t.totalKm > 0 ? formatRate(t.maintCpk) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {t.totalKm > 0 ? formatRate(t.salaryCpk) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {t.totalKm > 0 ? formatRate(t.otherCpk) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sky-950 bg-sky-50/50">
                      {t.totalKm > 0 ? `${formatRate(t.totalCpk)} / KM` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      {t.totalKm > 0 && t.revenueCpk > 0 ? formatRate(t.revenueCpk) : '—'}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${t.profitCpk >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                      {t.totalKm > 0 ? formatRate(t.profitCpk) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mileage Modal */}
      {isMileageModalOpen && (
        <MileageModal
          isOpen={isMileageModalOpen}
          onClose={() => {
            setIsMileageModalOpen(false);
            setEditingMileage(null);
          }}
          onSave={handleSaveMileage}
          vehicles={dataset.vehicles}
          initialData={editingMileage}
          defaultYear={selectedYear}
          defaultMonth={selectedMonth > 0 ? selectedMonth : currentMonth}
        />
      )}
    </div>
  );
};
