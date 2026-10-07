import React, { useState, useMemo } from 'react';
import { Vehicle } from '../../types';
import { Badge } from '../common/Badge';
import { VehicleModal } from './VehicleModal';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import {
  Truck,
  Plus,
  Edit2,
  Power,
  Search,
  ExternalLink,
  Download,
  AlertCircle,
} from 'lucide-react';

interface VehicleMasterProps {
  vehicles: Vehicle[];
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const VehicleMaster: React.FC<VehicleMasterProps> = ({
  vehicles,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          v.vehicleNo.toLowerCase().includes(q) ||
          v.driverName.toLowerCase().includes(q) ||
          v.vehicleModel.toLowerCase().includes(q) ||
          v.vehicleType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const handleSave = (vehicle: Vehicle) => {
    const res = storage.saveVehicle(vehicle);
    if (res.success) {
      onRefresh();
    }
    return res;
  };

  const handleToggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.toggleVehicleStatus(id);
    onRefresh();
  };

  const handleExport = () => {
    const sheetData = filteredVehicles.map((v) => ({
      'Vehicle ID': v.id,
      'Vehicle No': v.vehicleNo,
      'Type': v.vehicleType,
      'Model': v.vehicleModel,
      'Driver Name': v.driverName,
      'Driver ID': v.driverId || '',
      'Purchase Date': v.purchaseDate,
      'Status': v.status,
      'Remarks': v.remarks || '',
    }));
    ExcelService.exportToExcel(
      [{ sheetName: 'Vehicles', data: sheetData }],
      'Fleet_Vehicle_Master'
    );
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Vehicle Master Directory</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage factory fleet vehicles. Historical expense records remain preserved even if deactivated.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export List</span>
          </button>

          <button
            onClick={() => {
              setEditingVehicle(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle no, driver, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active ({vehicles.filter((v) => v.status === 'Active').length})</option>
              <option value="Inactive">Inactive ({vehicles.filter((v) => v.status === 'Inactive').length})</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          Total registered vehicles: <span className="font-bold text-slate-800">{vehicles.length}</span>
        </div>
      </div>

      {/* Vehicle Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Vehicle No</th>
                <th className="py-3 px-3">Type &amp; Model</th>
                <th className="py-3 px-3">Assigned Driver</th>
                <th className="py-3 px-3">Purchase Date</th>
                <th className="py-3 px-3">Route / Remarks</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No vehicles found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onOpenVehicleDetail(v.vehicleNo)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="group-hover:text-emerald-700 transition-colors">
                          {v.vehicleNo}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      <div className="font-semibold">{v.vehicleModel}</div>
                      <div className="text-[10px] text-slate-400">{v.vehicleType}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-medium">{v.driverName}</div>
                      {v.driverId && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {v.driverId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {v.purchaseDate || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {v.remarks || '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={v.status === 'Active' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {v.status}
                      </Badge>
                    </td>
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenVehicleDetail(v.vehicleNo)}
                          title="View 5-Year Cost Analytics & All Transactions"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingVehicle(v);
                            setIsModalOpen(true);
                          }}
                          title="Edit Vehicle Master"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleToggleStatus(v.id, e)}
                          title={v.status === 'Active' ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                          className={`p-1.5 rounded-md transition-colors ${
                            v.status === 'Active'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
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

      {/* Vehicle Form Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingVehicle}
      />
    </div>
  );
};
