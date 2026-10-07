import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PoliceCase, Vehicle, FineType, PaymentStatus } from '../../types';
import { formatBDT } from '../../services/costCalculations';

interface PoliceFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PoliceCase) => void;
  vehicles: Vehicle[];
  initialData?: PoliceCase | null;
}

export const PoliceFineModal: React.FC<PoliceFineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
}) => {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [vehicleNo, setVehicleNo] = useState(vehicles[0]?.vehicleNo || '');
  const [caseType, setCaseType] = useState<FineType>('Signal Violation');
  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(2500);
  const [paidAmount, setPaidAmount] = useState<number>(2500);
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dueAmount = Math.max(0, amount - paidAmount);
  const paymentStatus: PaymentStatus = dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due';

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setVehicleNo(initialData.vehicleNo);
      setCaseType(initialData.caseType);
      setCaseNumber(initialData.caseNumber);
      setDescription(initialData.description);
      setAmount(initialData.amount);
      setPaidAmount(initialData.paidAmount);
      setPaidDate(initialData.paidDate || initialData.date);
      setRemarks(initialData.remarks || '');
    } else {
      setDate(new Date().toISOString().substring(0, 10));
      setVehicleNo(vehicles[0]?.vehicleNo || '');
      setCaseType('Signal Violation');
      setCaseNumber(`DMP-TRF-${Date.now().toString().slice(-6)}`);
      setDescription('Traffic police penalty e-challan');
      setAmount(2500);
      setPaidAmount(2500);
      setPaidDate(new Date().toISOString().substring(0, 10));
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
    if (!caseNumber.trim()) {
      setError('Case / E-Challan number is required.');
      return;
    }
    if (amount <= 0) {
      setError('Fine amount must be greater than 0.');
      return;
    }
    if (paidAmount > amount) {
      setError(`Paid amount cannot exceed total fine (${formatBDT(amount)}).`);
      return;
    }

    const payload: PoliceCase = {
      id: initialData?.id || `fine-${Date.now()}`,
      date,
      vehicleNo,
      caseType,
      caseNumber: caseNumber.trim(),
      description: description.trim() || `${caseType} penalty`,
      amount: Number(amount),
      paidAmount: Number(paidAmount),
      dueAmount,
      paymentStatus,
      paidDate: paidAmount > 0 ? paidDate : undefined,
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
      title={initialData ? 'Edit Police Fine Record' : 'Record Police Case / Traffic Fine'}
      subtitle="Track traffic prosecution, e-challans, and penalty payments."
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
              Case / Violation Date *
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
            <label className="block font-semibold text-slate-700 mb-1">Vehicle No *</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fine / Case Type *</label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as FineType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Signal Violation">Signal Violation</option>
              <option value="Wrong Lane">Wrong Lane / Over Taking</option>
              <option value="Speeding">Speeding</option>
              <option value="Document Issue">Document Issue / Lacking</option>
              <option value="Parking Violation">Illegal Parking</option>
              <option value="Overload">Overloading</option>
              <option value="Other">Other Violation</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              E-Challan / Case No *
            </label>
            <input
              type="text"
              placeholder="e.g. DMP-TRF-2024-991"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Violation Description / Location
          </label>
          <input
            type="text"
            placeholder="e.g. Mohakhali flyover approach road"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Amounts and Status */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fine Amount (BDT) *
              </label>
              <input
                type="number"
                min="0"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
            <div>
              <span className="text-slate-500">Balance Due: </span>
              <span
                className={`font-mono font-bold ${
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
                  className="px-2 py-0.5 border border-slate-200 rounded text-xs bg-white"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
          <input
            type="text"
            placeholder="e.g. Paid through treasury bank challan"
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
            {initialData ? 'Update Record' : 'Save Police Fine'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
