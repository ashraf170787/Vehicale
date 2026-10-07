import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { OtherExpense, Vehicle, OtherExpenseType, AllocationType, PaymentStatus } from '../../types';
import { formatBDT } from '../../services/costCalculations';
import { SupplierDropdown } from '../common/SupplierDropdown';

interface OtherExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: OtherExpense) => void;
  vehicles: Vehicle[];
  initialData?: OtherExpense | null;
}

export const OtherExpenseModal: React.FC<OtherExpenseModalProps> = ({
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
  const [expenseType, setExpenseType] = useState<OtherExpenseType>('Washing');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState<number>(1200);
  const [paidAmount, setPaidAmount] = useState<number>(1200);
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dueAmount = Math.max(0, amount - paidAmount);
  const paymentStatus: PaymentStatus = dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due';

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setAllocationType(initialData.allocationType || 'Single');
      setSelectedVehicle(initialData.vehicleNo === 'SHARED' ? (vehicles[0]?.vehicleNo || '') : initialData.vehicleNo);
      setSelectedMultiVehicles(initialData.allocatedVehicles || []);
      setExpenseType(initialData.expenseType);
      setDescription(initialData.description);
      setSupplier(initialData.supplier);
      setBillNo(initialData.billNo || '');
      setAmount(initialData.amount);
      setPaidAmount(initialData.paidAmount);
      setPaidDate(initialData.paidDate || initialData.date);
      setRemarks(initialData.remarks || '');
    } else {
      setDate(new Date().toISOString().substring(0, 10));
      setAllocationType('Single');
      setSelectedVehicle(vehicles[0]?.vehicleNo || '');
      setSelectedMultiVehicles(vehicles.map((v) => v.vehicleNo));
      setExpenseType('Washing');
      setDescription('Routine washing and interior cleaning');
      setSupplier('Factory Local Petty Cash');
      setBillNo(`VCH-${Date.now().toString().slice(-6)}`);
      setAmount(1200);
      setPaidAmount(1200);
      setPaidDate(new Date().toISOString().substring(0, 10));
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (paidAmount > amount) {
      setError('Paid amount cannot exceed total bill amount.');
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
        setError('Please select at least one vehicle.');
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

    const payload: OtherExpense = {
      id: initialData?.id || `oth-${Date.now()}`,
      date,
      vehicleNo: finalVehicleNo,
      expenseType,
      description: description.trim() || `${expenseType} expense`,
      supplier: supplier.trim() || 'Vendor',
      billNo: billNo.trim() || undefined,
      amount: Number(amount),
      paidAmount: Number(paidAmount),
      dueAmount,
      paymentStatus,
      paidDate: paidAmount > 0 ? paidDate : undefined,
      remarks: remarks.trim(),
      allocationType,
      allocatedVehicles: allocatedVehiclesList,
      allocatedShares: allocatedSharesMap,
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
      title={initialData ? 'Edit Expense Record' : 'Record Other Vehicle Expense'}
      subtitle="Washing, parking, emergency towing, accessories, tolls and miscellaneous items."
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
            <label className="block font-semibold text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Allocation Type</label>
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

        {allocationType === 'Single' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Vehicle *</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.vehicleNo}>
                  {v.vehicleNo} ({v.vehicleModel})
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
          </div>
        )}

        {allocationType === 'All' && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold">
            Equal split across all active fleet vehicles.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Type *</label>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as OtherExpenseType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Washing">Washing &amp; Cleaning</option>
              <option value="Parking">Parking Fee</option>
              <option value="Toll">Highway / Bridge Toll</option>
              <option value="Accessories">Accessories</option>
              <option value="Towing">Emergency Towing</option>
              <option value="Emergency expense">Emergency Expense</option>
              <option value="Miscellaneous">Miscellaneous</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <SupplierDropdown
              value={supplier}
              onChange={(name) => setSupplier(name)}
              defaultCategory="General"
              label="Supplier / Vendor"
              placeholder="Select vendor / petty cash..."
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Description *</label>
          <input
            type="text"
            placeholder="e.g. Weekly wash & vacuuming at factory yard"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            required
          />
        </div>

        {/* Amounts and Status */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (BDT) *</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Paid Amount (BDT)</label>
              <input
                type="number"
                min="0"
                max={amount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bill / Voucher No</label>
              <input
                type="text"
                placeholder="e.g. VCH-102"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
          <input
            type="text"
            placeholder="e.g. Cleared by transport cashier"
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
            {initialData ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
