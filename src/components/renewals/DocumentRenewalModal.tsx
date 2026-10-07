import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DocumentRenewal, Vehicle, DocumentType, PaymentStatus } from '../../types';
import { SupplierDropdown } from '../common/SupplierDropdown';

interface DocumentRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: DocumentRenewal) => void;
  vehicles: Vehicle[];
  initialData?: DocumentRenewal | null;
}

export const DocumentRenewalModal: React.FC<DocumentRenewalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
}) => {
  const [vehicleNo, setVehicleNo] = useState(vehicles[0]?.vehicleNo || '');
  const [documentType, setDocumentType] = useState<DocumentType>('Fitness');
  const [documentNumber, setDocumentNumber] = useState('');
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().substring(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [renewalCost, setRenewalCost] = useState<number>(7500);
  const [supplier, setSupplier] = useState('BRTA Mirpur Circle');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setVehicleNo(initialData.vehicleNo);
      setDocumentType(initialData.documentType);
      setDocumentNumber(initialData.documentNumber);
      setRenewalDate(initialData.renewalDate);
      setExpiryDate(initialData.expiryDate);
      setRenewalCost(initialData.renewalCost);
      setSupplier(initialData.supplier);
      setPaymentStatus(initialData.paymentStatus);
      setPaidDate(initialData.paidDate || initialData.renewalDate);
      setRemarks(initialData.remarks || '');
    } else {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);

      setVehicleNo(vehicles[0]?.vehicleNo || '');
      setDocumentType('Fitness');
      setDocumentNumber(`BRTA-FIT-${Date.now().toString().slice(-6)}`);
      setRenewalDate(today.toISOString().substring(0, 10));
      setExpiryDate(nextYear.toISOString().substring(0, 10));
      setRenewalCost(7500);
      setSupplier('BRTA Mirpur Circle');
      setPaymentStatus('Paid');
      setPaidDate(today.toISOString().substring(0, 10));
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
    if (!documentNumber.trim()) {
      setError('Document Number / Certificate No is required.');
      return;
    }
    if (!expiryDate) {
      setError('Document Expiry Date is required for tracking validity.');
      return;
    }
    if (renewalCost <= 0) {
      setError('Renewal Cost must be a positive number.');
      return;
    }

    const payload: DocumentRenewal = {
      id: initialData?.id || `renew-${Date.now()}`,
      vehicleNo,
      documentType,
      documentNumber: documentNumber.trim(),
      renewalDate,
      expiryDate,
      renewalCost: Number(renewalCost),
      supplier: supplier.trim() || 'BRTA',
      paymentStatus,
      paidDate: paymentStatus === 'Paid' ? (paidDate || renewalDate) : undefined,
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
      title={initialData ? 'Edit Document Renewal' : 'Record Document / Paper Renewal'}
      subtitle="Track mandatory vehicle papers (Fitness, Tax Token, Route Permit, Insurance)."
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

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
            <select
              value={documentType}
              onChange={(e) => {
                const dt = e.target.value as DocumentType;
                setDocumentType(dt);
                if (dt === 'Insurance') {
                  setSupplier('Sadharan Bima Corp');
                  setRenewalCost(8500);
                } else if (dt === 'Tax Token') {
                  setSupplier('BRTA Mirpur Circle');
                  setRenewalCost(14500);
                } else if (dt === 'Fitness') {
                  setSupplier('BRTA Mirpur Circle');
                  setRenewalCost(7500);
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Fitness">Fitness Certificate</option>
              <option value="Tax Token">Tax Token</option>
              <option value="Route Permit">Route Permit</option>
              <option value="Insurance">Insurance</option>
              <option value="Registration">Registration</option>
              <option value="Other">Other Document</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Document / Certificate No *
            </label>
            <input
              type="text"
              placeholder="e.g. BRTA-FIT-2024-912"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-1">
            <SupplierDropdown
              value={supplier}
              onChange={(name) => setSupplier(name)}
              defaultCategory="Authority / Insurance"
              label="Issuing Authority / Agency"
              placeholder="Select authority / agency..."
            />
          </div>
        </div>

        {/* Dates & Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewal Date (Expense) *
            </label>
            <input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expiry Date *
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewal Cost (BDT) *
            </label>
            <input
              type="number"
              min="0"
              value={renewalCost || ''}
              onChange={(e) => setRenewalCost(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid / Processing</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Validated with bank challan"
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
            {initialData ? 'Update Document' : 'Save Renewal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
