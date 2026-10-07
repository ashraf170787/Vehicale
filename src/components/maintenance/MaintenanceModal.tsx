import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { MaintenanceTransaction, Vehicle, ServiceType, AllocationType } from '../../types';
import { formatBDT } from '../../services/costCalculations';
import { SupplierDropdown } from '../common/SupplierDropdown';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MaintenanceTransaction) => void;
  vehicles: Vehicle[];
  initialData?: MaintenanceTransaction | null;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
}) => {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [allocationType, setAllocationType] = useState<AllocationType>('Single');
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicles[0]?.vehicleNo || '');
  const [selectedMultiVehicles, setSelectedMultiVehicles] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>('General Servicing');
  const [partsDescription, setPartsDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidDate, setPaidDate] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dueAmount = Math.max(0, amount - paidAmount);
  const paymentStatus = dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setAllocationType(initialData.allocationType || 'Single');
      setSelectedVehicle(initialData.vehicleNo === 'SHARED' ? (vehicles[0]?.vehicleNo || '') : initialData.vehicleNo);
      setSelectedMultiVehicles(initialData.allocatedVehicles || []);
      setServiceType(initialData.serviceType);
      setPartsDescription(initialData.partsDescription);
      setSupplier(initialData.supplier);
      setQuantity(initialData.quantity);
      setApprovedAmount(initialData.approvedAmount);
      setBillNo(initialData.billNo);
      setAmount(initialData.amount);
      setPaidAmount(initialData.paidAmount);
      setPaidDate(initialData.paidDate || '');
      setRemarks(initialData.remarks || '');
    } else {
      setDate(new Date().toISOString().substring(0, 10));
      setAllocationType('Single');
      setSelectedVehicle(vehicles[0]?.vehicleNo || '');
      setSelectedMultiVehicles(vehicles.map((v) => v.vehicleNo));
      setServiceType('General Servicing');
      setPartsDescription('');
      setSupplier('');
      setQuantity(1);
      setApprovedAmount(0);
      setBillNo(`INV-${Date.now().toString().slice(-6)}`);
      setAmount(0);
      setPaidAmount(0);
      setPaidDate('');
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partsDescription.trim()) {
      setError('Parts / Service description is required.');
      return;
    }
    if (amount <= 0) {
      setError('Bill Amount must be greater than 0.');
      return;
    }
    if (paidAmount > amount) {
      setError(`Paid amount cannot exceed total bill amount (${formatBDT(amount)}).`);
      return;
    }

    let finalVehicleNo = selectedVehicle;
    let allocatedVehiclesList: string[] | undefined = undefined;
    let allocatedSharesMap: Record<string, number> | undefined = undefined;

    if (allocationType === 'All') {
      finalVehicleNo = 'SHARED';
      allocatedVehiclesList = vehicles.filter((v) => v.status === 'Active').map((v) => v.vehicleNo);
      const perVehicle = Math.round(amount / allocatedVehiclesList.length);
      allocatedSharesMap = {};
      allocatedVehiclesList.forEach((v) => {
        allocatedSharesMap![v] = perVehicle;
      });
    } else if (allocationType === 'Multiple') {
      if (selectedMultiVehicles.length === 0) {
        setError('Please select at least one vehicle for multi-vehicle allocation.');
        return;
      }
      finalVehicleNo = 'SHARED';
      allocatedVehiclesList = selectedMultiVehicles;
      const perVehicle = Math.round(amount / allocatedVehiclesList.length);
      allocatedSharesMap = {};
      allocatedVehiclesList.forEach((v) => {
        allocatedSharesMap![v] = perVehicle;
      });
    }

    const payload: MaintenanceTransaction = {
      id: initialData?.id || `maint-${Date.now()}`,
      date,
      vehicleNo: finalVehicleNo,
      serviceType,
      partsDescription: partsDescription.trim(),
      supplier: supplier.trim() || 'General Workshop',
      quantity: Number(quantity) || 1,
      approvedAmount: Number(approvedAmount) || amount,
      billNo: billNo.trim() || `BILL-${Date.now()}`,
      amount: Number(amount),
      paidAmount: Number(paidAmount),
      dueAmount,
      paidDate: paidAmount > 0 ? (paidDate || date) : undefined,
      paymentStatus,
      remarks: remarks.trim(),
      allocationType,
      allocatedVehicles: allocatedVehiclesList,
      allocatedShares: allocatedSharesMap,
      createdBy: initialData?.createdBy || 'Fleet Manager',
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  const toggleMultiVehicle = (no: string) => {
    if (selectedMultiVehicles.includes(no)) {
      setSelectedMultiVehicles(selectedMultiVehicles.filter((v) => v !== no));
    } else {
      setSelectedMultiVehicles([...selectedMultiVehicles, no]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Maintenance Record' : 'Record Maintenance Expense'}
      subtitle="Enter workshop service, parts replacement, bill and payment details."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Date and Allocation Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Service Date *
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
              Vehicle Allocation Type
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
              {(['Single', 'Multiple', 'All'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setAllocationType(t)}
                  className={`py-1 text-center font-semibold rounded-md transition-all ${
                    allocationType === t
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'Single' ? 'Single' : t === 'Multiple' ? 'Selected' : 'All Fleet'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Selection based on allocation type */}
        {allocationType === 'Single' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Vehicle *
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo} — {v.vehicleModel} ({v.driverName})
                </option>
              ))}
            </select>
          </div>
        )}

        {allocationType === 'Multiple' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Allocated Vehicles ({selectedMultiVehicles.length} selected)
            </label>
            <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 max-h-32 overflow-y-auto grid grid-cols-2 gap-1.5">
              {vehicles.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded text-xs cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMultiVehicles.includes(v.vehicleNo)}
                    onChange={() => toggleMultiVehicle(v.vehicleNo)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-mono font-bold text-slate-800">{v.vehicleNo}</span>
                </label>
              ))}
            </div>
            {amount > 0 && selectedMultiVehicles.length > 0 && (
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Equal split: {formatBDT(amount / selectedMultiVehicles.length)} per vehicle.
              </p>
            )}
          </div>
        )}

        {allocationType === 'All' && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
            <span className="font-bold">Allocated across all active fleet vehicles.</span>
            {amount > 0 && (
              <span className="block text-[11px] text-emerald-700 mt-0.5 font-medium">
                Split: {formatBDT(amount / vehicles.filter((v) => v.status === 'Active').length)} per vehicle.
              </span>
            )}
          </div>
        )}

        {/* Service Type and Parts Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Service Type *
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="General Servicing">General Servicing</option>
              <option value="Brake System">Brake System</option>
              <option value="Engine">Engine</option>
              <option value="Drive Train">Drive Train</option>
              <option value="Electrical System">Electrical System</option>
              <option value="Transmission Parts">Transmission Parts</option>
              <option value="Suspension">Suspension</option>
              <option value="Tyre">Tyre</option>
              <option value="Battery">Battery</option>
              <option value="AC">AC</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Parts / Service Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Brake pad, Mobil change, Tubeless tyre"
              value={partsDescription}
              onChange={(e) => setPartsDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Supplier, Bill No, Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <SupplierDropdown
              value={supplier}
              onChange={(name) => setSupplier(name)}
              defaultCategory="Workshop / Garage"
              label="Supplier / Workshop"
              placeholder="Select workshop supplier..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Bill / Invoice No
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2024-912"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Parts Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Amounts and Payment Calculation */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bill Amount (BDT) *
              </label>
              <input
                type="number"
                min="0"
                value={amount || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAmount(val);
                  if (approvedAmount === 0 || approvedAmount === amount) {
                    setApprovedAmount(val);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved Amount (BDT)
              </label>
              <input
                type="number"
                min="0"
                value={approvedAmount || ''}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Paid Amount (BDT)
              </label>
              <input
                type="number"
                min="0"
                max={amount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-emerald-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic Balance Calculation bar */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-200">
            <div>
              <span className="text-slate-500">Calculated Balance Due: </span>
              <span
                className={`font-mono font-black ${
                  dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatBDT(dueAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status: </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : paymentStatus === 'Partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {paymentStatus}
              </span>
            </div>

            {paidAmount > 0 && (
              <div>
                <label className="text-slate-500 mr-1.5">Paid Date:</label>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Remarks / Supervisor Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Approved by transport in-charge"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
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
            {initialData ? 'Update Record' : 'Save Maintenance Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
