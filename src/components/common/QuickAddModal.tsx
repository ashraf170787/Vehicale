import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  Wrench,
  Fuel,
  Wallet,
  FileCheck,
  ShieldAlert,
  Receipt,
  Truck,
  Store,
  DollarSign,
  Gauge,
} from 'lucide-react';
import { Vehicle } from '../../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (
    action:
      | 'maintenance'
      | 'fuel'
      | 'salary'
      | 'paper'
      | 'fines'
      | 'other'
      | 'vehicle'
      | 'supplier'
      | 'income'
      | 'mileage'
  ) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const options = [
    {
      id: 'mileage' as const,
      title: 'Log Vehicle KM Reading',
      desc: 'Enter monthly start and end odometer readings for Cost Per KM analysis',
      icon: <Gauge className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50/90 border-sky-300 hover:border-sky-500 ring-1 ring-sky-500/20',
    },
    {
      id: 'income' as const,
      title: 'Vehicle Monthly Income',
      desc: 'Record monthly contract revenue, trip fare or delivery billing',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-500 ring-1 ring-emerald-500/20',
    },
    {
      id: 'maintenance' as const,
      title: 'Maintenance & Servicing',
      desc: 'Workshop repairs, spare parts bills, labor costs',
      icon: <Wrench className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    },
    {
      id: 'fuel' as const,
      title: 'Fuel Refill Slip',
      desc: 'Diesel, petrol, CNG refuel receipts with odometer reading',
      icon: <Fuel className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50 border-sky-200 hover:border-sky-400',
    },
    {
      id: 'salary' as const,
      title: 'Driver Monthly Salary',
      desc: 'Basic, allowances, overtime and deductions for assigned vehicle',
      icon: <Wallet className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    },
    {
      id: 'paper' as const,
      title: 'Paper / Document Renewal',
      desc: 'Fitness, Tax Token, Route Permit, Insurance with expiry tracking',
      icon: <FileCheck className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    },
    {
      id: 'fines' as const,
      title: 'Police Case / Traffic Fine',
      desc: 'Traffic violation citations, e-challans and penalty tracking',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50 border-rose-200 hover:border-rose-400',
    },
    {
      id: 'other' as const,
      title: 'Other Operating Expense',
      desc: 'Washing, parking, tolls, accessories, emergency towing',
      icon: <Receipt className="w-5 h-5 text-slate-600" />,
      bg: 'bg-slate-50 border-slate-200 hover:border-slate-400',
    },
    {
      id: 'vehicle' as const,
      title: 'Register New Fleet Vehicle',
      desc: 'Add vehicle number, model, assigned driver to master directory',
      icon: <Truck className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    },
    {
      id: 'supplier' as const,
      title: 'Register New Supplier in Dropdown',
      desc: 'Add workshop or vendor once so it appears in all dropdowns',
      icon: <Store className="w-5 h-5 text-emerald-700" />,
      bg: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Entry"
      subtitle="Select the type of transaction or record you want to add"
      maxWidth="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              onClose();
              onSelectAction(opt.id);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${opt.bg} flex items-start gap-3`}
          >
            <div className="p-2 rounded-lg bg-white shadow-2xs shrink-0">
              {opt.icon}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-xs">{opt.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {opt.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
