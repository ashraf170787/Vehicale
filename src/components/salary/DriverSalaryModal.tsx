import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DriverSalaryTransaction, Vehicle, PaymentStatus } from '../../types';
import { formatBDT, getMonthName } from '../../services/costCalculations';

interface DriverSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: DriverSalaryTransaction) => void;
  vehicles: Vehicle[];
  initialData?: DriverSalaryTransaction | null;
}

export const DriverSalaryModal: React.FC<DriverSalaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
}) => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [vehicleNo, setVehicleNo] = useState(vehicles[0]?.vehicleNo || '');
  const [driverName, setDriverName] = useState(vehicles[0]?.driverName || '');
  const [driverId, setDriverId] = useState(vehicles[0]?.driverId || '');
  const [basicSalary, setBasicSalary] = useState<number>(20000);
  const [allowance, setAllowance] = useState<number>(3500);
  const [overtime, setOvertime] = useState<number>(1500);
  const [otherPayment, setOtherPayment] = useState<number>(0);
  const [deduction, setDeduction] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const netSalary =
    Number(basicSalary || 0) +
    Number(allowance || 0) +
    Number(overtime || 0) +
    Number(otherPayment || 0) -
    Number(deduction || 0);

  useEffect(() => {
    if (initialData) {
      setMonth(initialData.month);
      setYear(initialData.year);
      setVehicleNo(initialData.vehicleNo);
      setDriverName(initialData.driverName);
      setDriverId(initialData.driverId || '');
      setBasicSalary(initialData.basicSalary);
      setAllowance(initialData.allowance);
      setOvertime(initialData.overtime);
      setOtherPayment(initialData.otherPayment);
      setDeduction(initialData.deduction);
      setPaymentStatus(initialData.paymentStatus);
      setPaymentDate(initialData.paymentDate || '');
      setRemarks(initialData.remarks || '');
    } else {
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
      const firstVeh = vehicles[0];
      setVehicleNo(firstVeh?.vehicleNo || '');
      setDriverName(firstVeh?.driverName || '');
      setDriverId(firstVeh?.driverId || '');
      setBasicSalary(20000);
      setAllowance(3500);
      setOvertime(1500);
      setOtherPayment(0);
      setDeduction(0);
      setPaymentStatus('Paid');
      setPaymentDate(new Date().toISOString().substring(0, 10));
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles]);

  // When vehicle selection changes, auto-fill current assigned driver
  const handleVehicleChange = (vNo: string) => {
    setVehicleNo(vNo);
    const target = vehicles.find((v) => v.vehicleNo === vNo);
    if (target && !initialData) {
      setDriverName(target.driverName);
      setDriverId(target.driverId || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo) {
      setError('Vehicle selection is required for cost association.');
      return;
    }
    if (!driverName.trim()) {
      setError('Driver name is required.');
      return;
    }
    if (basicSalary <= 0) {
      setError('Basic Salary must be greater than 0.');
      return;
    }

    const payload: DriverSalaryTransaction = {
      id: initialData?.id || `sal-${Date.now()}`,
      month: Number(month),
      year: Number(year),
      driverName: driverName.trim(),
      driverId: driverId.trim(),
      vehicleNo,
      basicSalary: Number(basicSalary),
      allowance: Number(allowance || 0),
      overtime: Number(overtime || 0),
      otherPayment: Number(otherPayment || 0),
      deduction: Number(deduction || 0),
      netSalary,
      paymentStatus,
      paymentDate: paymentStatus === 'Paid' ? (paymentDate || undefined) : undefined,
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
      title={initialData ? 'Edit Driver Salary Record' : 'Process Monthly Driver Salary'}
      subtitle="Monthly salary cost is linked directly to the designated vehicle for analysis."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Month, Year and Associated Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Month *</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Year *</label>
            <input
              type="number"
              min="2018"
              max="2035"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Associated Vehicle *</label>
            <select
              value={vehicleNo}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Driver Name & ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver Name *</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver ID</label>
            <input
              type="text"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Salary Components */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Basic Salary *</label>
              <input
                type="number"
                min="0"
                value={basicSalary || ''}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Allowance</label>
              <input
                type="number"
                min="0"
                value={allowance}
                onChange={(e) => setAllowance(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Overtime (OT)</label>
              <input
                type="number"
                min="0"
                value={overtime}
                onChange={(e) => setOvertime(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Festival / Bonus</label>
              <input
                type="number"
                min="0"
                value={otherPayment}
                onChange={(e) => setOtherPayment(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deduction (-)</label>
              <input
                type="number"
                min="0"
                value={deduction}
                onChange={(e) => setDeduction(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="bg-emerald-100/70 p-2 rounded-lg border border-emerald-300">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase">
                Net Salary
              </span>
              <span className="text-base font-black text-emerald-950 font-mono">
                {formatBDT(netSalary)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Formula: Basic (৳{basicSalary}) + Allowance (৳{allowance}) + OT (৳{overtime}) + Other (৳{otherPayment}) - Deduction (৳{deduction})
          </p>
        </div>

        {/* Payment Status & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Paid">Paid / Disbursed</option>
              <option value="Unpaid">Unpaid / Accrued</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
          <input
            type="text"
            placeholder="e.g. Monthly salary voucher cleared"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
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
            {initialData ? 'Update Salary' : 'Save Salary Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
