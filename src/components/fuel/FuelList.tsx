import React, { useState, useMemo } from 'react';
import { FuelTransaction, Vehicle } from '../../types';
import { formatBDT, parseYearFromDate } from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { FuelModal } from './FuelModal';
import {
  Fuel,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  Gauge,
  FileSpreadsheet,
} from 'lucide-react';

interface FuelListProps {
  fuel: FuelTransaction[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
  onNavigateToImport?: () => void;
}

export const FuelList: React.FC<FuelListProps> = ({
  fuel,
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
  onNavigateToImport,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FuelTransaction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const years = useMemo(() => {
    const set = new Set<number>();
    fuel.forEach((f) => set.add(parseYearFromDate(f.date)));
    return Array.from(set).sort((a, b) => b - a);
  }, [fuel]);

  const filteredItems = useMemo(() => {
    return fuel.filter((item) => {
      if (vehicleFilter !== 'ALL' && item.vehicleNo !== vehicleFilter) return false;
      if (fuelTypeFilter !== 'ALL' && item.fuelType !== fuelTypeFilter) return false;
      if (yearFilter !== 'ALL' && parseYearFromDate(item.date).toString() !== yearFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.vehicleNo.toLowerCase().includes(q) ||
          item.slipNo.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [fuel, vehicleFilter, fuelTypeFilter, yearFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalCost = filteredItems.reduce((s, x) => s + x.totalAmount, 0);
    const totalLitres = filteredItems.reduce((s, x) => s + x.quantity, 0);
    const avgRate = totalLitres > 0 ? totalCost / totalLitres : 0;
    return { totalCost, totalLitres, avgRate };
  }, [filteredItems]);

  const handleSave = (item: FuelTransaction) => {
    storage.saveFuel(item);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this fuel transaction slip?')) {
      storage.deleteFuel(id);
      onRefresh();
    }
  };

  const handleExport = () => {
    const sheetData = filteredItems.map((f, idx) => ({
      'SL NO': idx + 1,
      DATE: f.date,
      'CAR NO': f.vehicleNo,
      ITEM: f.fuelType,
      QUANTITY: f.quantity,
      'SLIP NO': f.slipNo,
      'UNIT PRICE': f.unitPrice,
      'TOTAL PRICE': f.totalAmount,
      SUPPLIER: f.supplier,
      STATUS: f.paymentStatus,
      'PAYMENT DATE': f.paymentDate || '',
    }));

    ExcelService.exportToExcel([{ sheetName: 'Fuel', data: sheetData }], 'Fuel_Expenses');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-600" />
            <span>Fuel &amp; Gas Refill Tracking</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log pump receipts, unit rates, odometer mileage readings and calculate consumption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToImport && (
            <button
              onClick={onNavigateToImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
              title="Upload historical fuel excel sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Upload Fuel Excel</span>
            </button>
          )}

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
            <span>Record Fuel Slip</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Fuel Expense
          </span>
          <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
            {formatBDT(stats.totalCost)}
          </span>
          <span className="text-[11px] text-slate-400">
            Across {filteredItems.length} fuel refill slips
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider block">
            Total Volume Refilled
          </span>
          <span className="text-lg font-black text-sky-700 font-mono mt-0.5 block">
            {stats.totalLitres.toLocaleString()} Litres
          </span>
          <span className="text-[11px] text-slate-400">
            Avg Rate: ৳{stats.avgRate.toFixed(2)} / Litre
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Odometer Tracking
          </span>
          <span className="text-lg font-black text-emerald-800 font-mono mt-0.5 block flex items-center gap-1">
            <Gauge className="w-5 h-5 text-emerald-600 inline" />
            <span>Active Mileage</span>
          </span>
          <span className="text-[11px] text-slate-400">Log KM for per-KM efficiency</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search slip, pump..."
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
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Fuel Types</option>
            <option value="Diesel">Diesel</option>
            <option value="Octane">Octane</option>
            <option value="Petrol">Petrol</option>
            <option value="CNG">CNG</option>
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
          Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> slips
        </div>
      </div>

      {/* Fuel Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Car No</th>
                <th className="py-2.5 px-3">Fuel Type</th>
                <th className="py-2.5 px-3 text-right">Quantity (L)</th>
                <th className="py-2.5 px-3 text-right">Rate (BDT/L)</th>
                <th className="py-2.5 px-3 text-right">Total (BDT)</th>
                <th className="py-2.5 px-3">Slip No</th>
                <th className="py-2.5 px-3">Pump Station</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Paid Date</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No fuel transactions found.
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
                    <td className="py-2.5 px-3">
                      <Badge variant="info" size="sm">
                        {f.fuelType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {f.quantity} L
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ৳{f.unitPrice}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(f.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{f.slipNo}</td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{f.supplier}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant={f.paymentStatus === 'Paid' ? 'success' : 'danger'}>
                        {f.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {f.paymentDate || '—'}
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

      <FuelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        vehicles={vehicles}
        initialData={editingItem}
      />
    </div>
  );
};
