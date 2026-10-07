import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle } from '../../types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => { success: boolean; error?: string };
  initialData?: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicleNo: '',
    vehicleType: 'Delivery Van',
    vehicleModel: '',
    driverName: '',
    driverId: '',
    purchaseDate: new Date().toISOString().substring(0, 10),
    status: 'Active',
    remarks: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        vehicleNo: '',
        vehicleType: 'Delivery Van',
        vehicleModel: '',
        driverName: '',
        driverId: '',
        purchaseDate: new Date().toISOString().substring(0, 10),
        status: 'Active',
        remarks: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNo?.trim()) {
      setError('Vehicle Number is required (e.g. DM-MA-11-52-39).');
      return;
    }
    if (!formData.vehicleModel?.trim()) {
      setError('Vehicle Model is required.');
      return;
    }
    if (!formData.driverName?.trim()) {
      setError('Driver Name is required.');
      return;
    }

    const payload: Vehicle = {
      id: initialData?.id || `veh-${Date.now()}`,
      vehicleNo: formData.vehicleNo.trim().toUpperCase(),
      vehicleType: formData.vehicleType || 'Delivery Van',
      vehicleModel: formData.vehicleModel.trim(),
      driverName: formData.driverName.trim(),
      driverId: formData.driverId?.trim() || `DRV-${Math.floor(100 + Math.random() * 900)}`,
      purchaseDate: formData.purchaseDate || new Date().toISOString().substring(0, 10),
      status: formData.status || 'Active',
      remarks: formData.remarks || '',
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    const res = onSave(payload);
    if (!res.success) {
      setError(res.error || 'Failed to save vehicle.');
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vehicle Master Record' : 'Register New Fleet Vehicle'}
      subtitle="Register vehicle in master. Vehicle number must be unique."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vehicle No *
            </label>
            <input
              type="text"
              placeholder="e.g. DM-MA-11-52-39"
              value={formData.vehicleNo || ''}
              onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg uppercase font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vehicle Type
            </label>
            <select
              value={formData.vehicleType || 'Delivery Van'}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Delivery Van">Delivery Van</option>
              <option value="Covered Van">Covered Van</option>
              <option value="Pickup Truck">Pickup Truck</option>
              <option value="Cargo Truck">Cargo Truck</option>
              <option value="Sedan Car">Sedan Car</option>
              <option value="Microbus">Microbus</option>
              <option value="Motorcycle">Motorcycle</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vehicle Model *
            </label>
            <input
              type="text"
              placeholder="e.g. Tata 407 LPT / Isuzu NPR"
              value={formData.vehicleModel || ''}
              onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || 'Active'}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Active">Active (Operational)</option>
              <option value="Inactive">Inactive (Decommissioned / Idle)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Driver Name *
            </label>
            <input
              type="text"
              placeholder="Driver's full name"
              value={formData.driverName || ''}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Driver ID / Badge No
            </label>
            <input
              type="text"
              placeholder="e.g. DRV-101"
              value={formData.driverId || ''}
              onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Purchase / Induction Date
          </label>
          <input
            type="date"
            value={formData.purchaseDate || ''}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Remarks / Operational Route
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Zone-1 North Dhaka Factory Line"
            value={formData.remarks || ''}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold shadow-sm transition-colors"
          >
            {initialData ? 'Update Vehicle' : 'Register Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
