import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Supplier, SupplierCategory } from '../../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => { success: boolean; error?: string };
  initialData?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('Workshop / Garage');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setContactPerson(initialData.contactPerson || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      setRemarks(initialData.remarks || '');
    } else {
      setName('');
      setCategory('Workshop / Garage');
      setContactPerson('');
      setPhone('');
      setAddress('');
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Supplier name is required.');
      return;
    }

    const payload: Supplier = {
      id: initialData?.id || `sup-${Date.now()}`,
      name: cleanName,
      category,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      remarks: remarks.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    const res = onSave(payload);
    if (!res.success) {
      setError(res.error || 'Failed to save supplier.');
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Supplier' : 'Register New Supplier in Master Directory'}
      subtitle="Once registered, this supplier will appear in dropdowns across all vehicle expense modules."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Supplier / Vendor Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Rahimafrooz Workshop / Trust Filling Station"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Supplier Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupplierCategory)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="Workshop / Garage">Workshop / Garage</option>
            <option value="Fuel Station / Pump">Fuel Station / Pump</option>
            <option value="Spare Parts & Tyres">Spare Parts &amp; Tyres</option>
            <option value="Authority / Insurance">Authority / Insurance</option>
            <option value="Petty Cash / Internal">Petty Cash / Internal</option>
            <option value="General">General Vendor</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
            <input
              type="text"
              placeholder="e.g. Engr. Masud / Manager"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. +880 1711-XXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Address / Location</label>
          <input
            type="text"
            placeholder="e.g. Tejgaon Industrial Area, Dhaka"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
          <input
            type="text"
            placeholder="e.g. Authorized vendor for factory vehicle fleet"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
            {initialData ? 'Update Supplier' : 'Save Supplier to Directory'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
