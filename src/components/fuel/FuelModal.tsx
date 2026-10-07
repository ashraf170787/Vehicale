import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { FuelTransaction, Vehicle, FuelType } from '../../types';
import { formatBDT } from '../../services/costCalculations';
import { SupplierDropdown } from '../common/SupplierDropdown';

interface FuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: FuelTransaction) => void;
  vehicles: Vehicle[];
  initialData?: FuelTransaction | null;
}

export const FuelModal: React.FC<FuelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
}) => {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [vehicleNo, setVehicleNo] = useState(vehicles[0]?.vehicleNo || '');
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [quantity, setQuantity] = useState<number>(50);
  const [unitPrice, setUnitPrice] = useState<number>(108.5);
  const [slipNo, setSlipNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [odometerReading, setOdometerReading] = useState<number | undefined>(undefined);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const totalAmount = Math.round(Number(quantity || 0) * Number(unitPrice || 0));

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setVehicleNo(initialData.vehicleNo);
      setFuelType(initialData.fuelType);
      setQuantity(initialData.quantity);
      setUnitPrice(initialData.unitPrice);
      setSlipNo(initialData.slipNo);
      setSupplier(initialData.supplier);
      setOdometerReading(initialData.odometerReading);
      setPaymentStatus(initialData.paymentStatus === 'Unpaid' ? 'Unpaid' : 'Paid');
      setPaymentDate(initialData.paymentDate || initialData.date);
      setRemarks(initialData.remarks || '');
    } else {
      setDate(new Date().toISOString().substring(0, 10));
      setVehicleNo(vehicles[0]?.vehicleNo || '');
      setFuelType('Diesel');
      setQuantity(50);
      setUnitPrice(108.5);
      setSlipNo(`SLP-${Date.now().toString().slice(-6)}`);
      setSupplier('Trust Filling Station, Tejgaon');
      setOdometerReading(undefined);
      setPaymentStatus('Paid');
      setPaymentDate(new Date().toISOString().substring(0, 10));
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo) {
      setError('Please select a vehicle.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity / Litres must be greater than 0.');
      return;
    }
    if (unitPrice <= 0) {
      setError('Unit price must be greater than 0.');
      return;
    }

    const payload: FuelTransaction = {
      id: initialData?.id || `fuel-${Date.now()}`,
      date,
      vehicleNo,
      fuelType,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount,
      slipNo: slipNo.trim() || `SLP-${Date.now()}`,
      supplier: supplier.trim() || 'Filling Station',
      paymentStatus,
      paymentDate: paymentStatus === 'Paid' ? paymentDate : undefined,
      odometerReading: odometerReading ? Number(odometerReading) : undefined,
      remarks: remarks.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Fuel Expense Slip' : 'Record Fuel Refill Slip'}
      subtitle="Enter pump receipt, litres, unit rate and odometer reading."
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
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vehicle No *
            </label>
            <select
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo} ({v.vehicleModel})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Fuel Type
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Diesel">Diesel</option>
              <option value="Octane">Octane</option>
              <option value="Petrol">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Quantity (Litres) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Unit Price (BDT/L) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={unitPrice || ''}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Calculated Total Box */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
              Auto-Calculated Total (Qty × Rate)
            </span>
            <span className="text-xl font-black text-emerald-900 font-mono">
              {formatBDT(totalAmount)}
            </span>
          </div>
          <span className="text-xs text-emerald-700 font-medium">
            {quantity} L @ ৳{unitPrice}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <SupplierDropdown
              value={supplier}
              onChange={(name) => setSupplier(name)}
              defaultCategory="Fuel Station / Pump"
              label="Pump / Filling Station"
              placeholder="Select fuel station..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Slip / Voucher No
            </label>
            <input
              type="text"
              placeholder="e.g. SLP-2024-401"
              value={slipNo}
              onChange={(e) => setSlipNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Unpaid')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Paid">Paid (Cash / Card)</option>
              <option value="Unpaid">Unpaid / Pump Credit</option>
            </select>
          </div>

          {paymentStatus === 'Paid' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}
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
            {initialData ? 'Update Slip' : 'Save Fuel Slip'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
