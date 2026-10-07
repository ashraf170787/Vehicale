import React, { useState, useEffect } from 'react';
import { Supplier, SupplierCategory } from '../../types';
import { storage } from '../../services/storage';
import { Plus, Check, Store } from 'lucide-react';

interface SupplierDropdownProps {
  value: string;
  onChange: (supplierName: string) => void;
  defaultCategory?: SupplierCategory;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export const SupplierDropdown: React.FC<SupplierDropdownProps> = ({
  value,
  onChange,
  defaultCategory = 'Workshop / Garage',
  required = false,
  label = 'Supplier / Vendor',
  placeholder = 'Select supplier...',
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState<SupplierCategory>(defaultCategory);
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const loadSuppliers = () => {
    const list = storage.getSuppliers();
    setSuppliers(list);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__ADD_NEW__') {
      setIsAddingNew(true);
      setNewSupplierName('');
      setAddError(null);
    } else {
      onChange(selected);
    }
  };

  const handleSaveNewSupplier = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clean = newSupplierName.trim();
    if (!clean) {
      setAddError('Please enter a supplier name.');
      return;
    }

    const res = storage.saveSupplier({
      id: `sup-${Date.now()}`,
      name: clean,
      category: newSupplierCategory,
      phone: newSupplierPhone.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    if (!res.success) {
      setAddError(res.error || 'Failed to save supplier.');
      return;
    }

    loadSuppliers();
    onChange(clean);
    setIsAddingNew(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
    setAddError(null);
  };

  // Ensure current value is in suppliers list if provided from existing data
  const hasValueInList = suppliers.some((s) => s.name.toLowerCase() === value.toLowerCase());

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {!isAddingNew && (
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              setNewSupplierName('');
              setAddError(null);
            }}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
          >
            <Plus className="w-3 h-3 text-emerald-700" />
            <span>+ নতুন সাপ্লায়ার যোগ করুন (+ Add Supplier)</span>
          </button>
        )}
      </div>

      {!isAddingNew ? (
        <div className="space-y-1">
          <div className="relative">
            <select
              value={value || ''}
              onChange={handleSelectChange}
              required={required}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="" disabled>
                {suppliers.length === 0 ? '-- কোনো সাপ্লায়ার নেই, "+ Add Supplier" এ ক্লিক করুন --' : placeholder}
              </option>
              {value && !hasValueInList && (
                <option value={value}>
                  {value} (Unlisted / Manual)
                </option>
              )}
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.category})
                </option>
              ))}
              <option value="__ADD_NEW__" className="text-emerald-700 font-bold bg-emerald-50">
                ➕ + নতুন সাপ্লায়ার যোগ করুন (একবার এন্ট্রি করুন)...
              </option>
            </select>
          </div>
          <p className="text-[10px] text-slate-500">
            💡 একবার এন্ট্রি করলে সবসময় ড্রপডাউনে থাকবে (Saved once in master, select anytime).
          </p>
        </div>
      ) : (
        /* Inline Quick Add Card */
        <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2 text-xs animate-in fade-in zoom-in-95 duration-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-700" />
              <span>নতুন সাপ্লায়ার এন্ট্রি (একবার এন্ট্রি করলেই ড্রপডাউনে সেভ থাকবে)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setAddError(null);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline"
            >
              Cancel
            </button>
          </div>

          {addError && (
            <div className="p-1.5 bg-rose-100 border border-rose-300 text-rose-800 rounded text-[11px] font-semibold">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Supplier / Workshop Name * (সাপ্লায়ারের নাম)
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Navana Workshop / Padma Oil Pump / উত্তরা অটো"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Category (ক্যাটাগরি)
              </label>
              <select
                value={newSupplierCategory}
                onChange={(e) => setNewSupplierCategory(e.target.value as SupplierCategory)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Workshop / Garage">Workshop / Garage (ওয়ার্কশপ)</option>
                <option value="Fuel Station / Pump">Fuel Station / Pump (জ্বালানি পাম্প)</option>
                <option value="Spare Parts & Tyres">Spare Parts &amp; Tyres (পার্টস ও টায়ার)</option>
                <option value="Authority / Insurance">Authority / Insurance (বিআরটিএ / বীমা)</option>
                <option value="Petty Cash / Internal">Petty Cash / Internal (ক্যাশ)</option>
                <option value="General">General Vendor (সাধারণ সাপ্লায়ার)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <input
              type="text"
              placeholder="মোবাইল নম্বর (ঐচ্ছিক / optional phone)"
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              className="w-1/2 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveNewSupplier}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>সেভ ও ড্রপডাউনে যুক্ত করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
