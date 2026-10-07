import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle, VehicleMonthlyIncome } from '../../types';
import { formatBDT } from '../../services/costCalculations';

interface MonthlyIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VehicleMonthlyIncome) => void;
  vehicles: Vehicle[];
  initialData?: VehicleMonthlyIncome | null;
  defaultYear?: number;
  defaultMonth?: number;
}

export const MonthlyIncomeModal: React.FC<MonthlyIncomeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
  defaultYear = new Date().getFullYear(),
  defaultMonth = new Date().getMonth() + 1,
}) => {
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [vehicleNo, setVehicleNo] = useState<string>(vehicles[0]?.vehicleNo || '');
  const [clientName, setClientName] = useState('');
  const [billingType, setBillingType] = useState<
    'Monthly Contract' | 'Trip Rental' | 'KM Billing' | 'Other Income'
  >('Monthly Contract');
  const [contractAmount, setContractAmount] = useState<number>(75000);
  const [bonusOrExtraAmount, setBonusOrExtraAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Paid');
  const [receivedAmount, setReceivedAmount] = useState<number>(75000);
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const totalIncome = Math.max(0, Number(contractAmount || 0) + Number(bonusOrExtraAmount || 0));
  const dueAmount = Math.max(0, totalIncome - Number(receivedAmount || 0));

  useEffect(() => {
    if (initialData) {
      setMonth(initialData.month);
      setYear(initialData.year);
      setVehicleNo(initialData.vehicleNo);
      setClientName(initialData.clientName);
      setBillingType(initialData.billingType || 'Monthly Contract');
      setContractAmount(initialData.contractAmount);
      setBonusOrExtraAmount(initialData.bonusOrExtraAmount || 0);
      setPaymentStatus(initialData.paymentStatus);
      setReceivedAmount(initialData.receivedAmount);
      setReceivedDate(initialData.receivedDate || new Date().toISOString().substring(0, 10));
      setInvoiceNo(initialData.invoiceNo || '');
      setRemarks(initialData.remarks || '');
    } else {
      setMonth(defaultMonth);
      setYear(defaultYear);
      setVehicleNo(vehicles[0]?.vehicleNo || '');
      setClientName('');
      setBillingType('Monthly Contract');
      setContractAmount(75000);
      setBonusOrExtraAmount(0);
      setPaymentStatus('Paid');
      setReceivedAmount(75000);
      setReceivedDate(new Date().toISOString().substring(0, 10));
      setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles, defaultYear, defaultMonth]);

  const handleStatusChange = (status: 'Paid' | 'Partial' | 'Unpaid') => {
    setPaymentStatus(status);
    if (status === 'Paid') {
      setReceivedAmount(totalIncome);
    } else if (status === 'Unpaid') {
      setReceivedAmount(0);
    }
  };

  const handleContractAmountChange = (amt: number) => {
    setContractAmount(amt);
    const newTot = Math.max(0, amt + Number(bonusOrExtraAmount || 0));
    if (paymentStatus === 'Paid') {
      setReceivedAmount(newTot);
    }
  };

  const handleExtraAmountChange = (amt: number) => {
    setBonusOrExtraAmount(amt);
    const newTot = Math.max(0, Number(contractAmount || 0) + amt);
    if (paymentStatus === 'Paid') {
      setReceivedAmount(newTot);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo) {
      setError('Please select a vehicle.');
      return;
    }
    if (!clientName.trim()) {
      setError('Please enter client or contract name.');
      return;
    }
    if (totalIncome <= 0) {
      setError('Total income must be greater than 0 BDT.');
      return;
    }

    const payload: VehicleMonthlyIncome = {
      id: initialData?.id || `inc-${Date.now()}`,
      month: Number(month),
      year: Number(year),
      vehicleNo: vehicleNo.trim(),
      clientName: clientName.trim(),
      billingType,
      contractAmount: Number(contractAmount),
      bonusOrExtraAmount: Number(bonusOrExtraAmount || 0),
      totalIncome,
      receivedAmount: Number(receivedAmount || 0),
      dueAmount,
      paymentStatus:
        receivedAmount >= totalIncome
          ? 'Paid'
          : receivedAmount > 0
          ? 'Partial'
          : 'Unpaid',
      receivedDate: receivedAmount > 0 ? receivedDate : undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vehicle Monthly Income' : 'Record Vehicle Monthly Income'}
      subtitle="Enter monthly contract revenue or trip billing for this vehicle."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Period & Vehicle Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Month *</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Year *</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vehicle *</label>
            <select
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo} ({v.vehicleModel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Client & Billing Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Client / Contract Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Factory Monthly Logistics Contract"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Type</label>
            <select
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Monthly Contract">Monthly Fixed Contract</option>
              <option value="Trip Rental">Trip / Delivery Rental</option>
              <option value="KM Billing">KM Rate Billing</option>
              <option value="Other Income">Other Income</option>
            </select>
          </div>
        </div>

        {/* Revenue Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Contract Amount (BDT) *
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={contractAmount || ''}
              onChange={(e) => handleContractAmountChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Extra Trips / Overtime / Bonus (BDT)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={bonusOrExtraAmount || ''}
              onChange={(e) => handleExtraAmountChange(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Auto-Calculated Total Income Card */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">
              Total Monthly Income
            </span>
            <span className="text-xl font-black text-emerald-950 font-mono">
              {formatBDT(totalIncome)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-emerald-700 font-medium block">
              Contract: {formatBDT(contractAmount)} + Extra: {formatBDT(bonusOrExtraAmount)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {vehicleNo}
            </span>
          </div>
        </div>

        {/* Payment Receipt Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Paid">Received (Paid)</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Due / Pending</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Received Amount (BDT)
            </label>
            <input
              type="number"
              min="0"
              max={totalIncome}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {dueAmount > 0 && (
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                Due: {formatBDT(dueAmount)}
              </span>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Received Date
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Invoice / Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice / Reference No</label>
            <input
              type="text"
              placeholder="e.g. INV-2024-051"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Factory delivery service contract"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
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
            {initialData ? 'Update Income' : 'Save Income'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
