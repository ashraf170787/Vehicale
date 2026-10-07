import React, { useState, useMemo } from 'react';
import { SupplierFollowUpItem, Vehicle, Supplier, SupplierCategory } from '../../types';
import {
  formatBDT,
  CostCalculationService,
  ComprehensiveDataset,
} from '../../services/costCalculations';
import { storage } from '../../services/storage';
import { ExcelService } from '../../services/excelService';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SupplierModal } from './SupplierModal';
import {
  CreditCard,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Filter,
  Store,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
} from 'lucide-react';

interface SupplierPaymentListProps {
  dataset: ComprehensiveDataset;
  onRefresh: () => void;
  onOpenVehicleDetail: (vehicleNo: string) => void;
}

export const SupplierPaymentList: React.FC<SupplierPaymentListProps> = ({
  dataset,
  onRefresh,
  onOpenVehicleDetail,
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'directory'>('invoices');

  // Settle bill modal state
  const [settleModalItem, setSettleModalItem] = useState<SupplierFollowUpItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  // Supplier Master Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Filters for invoices
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Due' | 'Partial' | 'Paid'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Supplier directory search
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirCategoryFilter, setDirCategoryFilter] = useState('ALL');

  const allItems: SupplierFollowUpItem[] = useMemo(() => {
    return CostCalculationService.getSupplierFollowUpItems(dataset);
  }, [dataset]);

  const suppliersList = useMemo(() => {
    return storage.getSuppliers();
  }, [dataset]);

  // Unique suppliers list from transactions + directory
  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    suppliersList.forEach((s) => set.add(s.name));
    allItems.forEach((i) => {
      if (i.supplier) set.add(i.supplier);
    });
    return Array.from(set).sort();
  }, [allItems, suppliersList]);

  // Invoices filtered
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (supplierFilter !== 'ALL' && item.supplier !== supplierFilter) return false;
      if (vehicleFilter !== 'ALL' && item.vehicleNo !== vehicleFilter) return false;
      if (categoryFilter !== 'ALL' && item.expenseCategory !== categoryFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Paid' && item.balance !== 0) return false;
        if (statusFilter === 'Due' && (item.balance === 0 || item.paidAmount > 0)) return false;
        if (statusFilter === 'Partial' && (item.balance === 0 || item.paidAmount === 0)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.supplier.toLowerCase().includes(q) ||
          item.billNo.toLowerCase().includes(q) ||
          item.vehicleNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allItems, supplierFilter, vehicleFilter, categoryFilter, statusFilter, searchQuery]);

  // Supplier directory filtered
  const filteredSuppliers = useMemo(() => {
    return suppliersList.filter((s) => {
      if (dirCategoryFilter !== 'ALL' && s.category !== dirCategoryFilter) return false;
      if (dirSearchQuery.trim()) {
        const q = dirSearchQuery.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [suppliersList, dirCategoryFilter, dirSearchQuery]);

  const stats = useMemo(() => {
    const totalInvoiced = filteredItems.reduce((s, x) => s + x.amount, 0);
    const totalPaid = filteredItems.reduce((s, x) => s + x.paidAmount, 0);
    const totalOutstanding = filteredItems.reduce((s, x) => s + x.balance, 0);
    const unpaidCount = filteredItems.filter((x) => x.balance > 0).length;
    return { totalInvoiced, totalPaid, totalOutstanding, unpaidCount };
  }, [filteredItems]);

  const handleOpenSettle = (item: SupplierFollowUpItem) => {
    setSettleModalItem(item);
    setPaymentAmount(item.balance);
    setPaymentDate(new Date().toISOString().substring(0, 10));
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalItem) return;
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than 0.');
      return;
    }
    if (paymentAmount > settleModalItem.balance) {
      alert(`Payment cannot exceed outstanding balance (${formatBDT(settleModalItem.balance)}).`);
      return;
    }

    storage.settleSupplierBill(
      settleModalItem.expenseCategory,
      settleModalItem.id,
      paymentAmount,
      paymentDate
    );

    setSettleModalItem(null);
    onRefresh();
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    const res = storage.saveSupplier(supplier);
    if (res.success) {
      onRefresh();
    }
    return res;
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove "${name}" from the supplier directory? Historical transaction records will not be altered.`
      )
    ) {
      storage.deleteSupplier(id);
      onRefresh();
    }
  };

  const handleExportInvoices = () => {
    const sheetData = filteredItems.map((item) => ({
      SUPPLIER: item.supplier,
      'BILL / INVOICE NO': item.billNo,
      'VEHICLE NO': item.vehicleNo,
      'EXPENSE CATEGORY': item.expenseCategory,
      DATE: item.date,
      'INVOICE AMOUNT': item.amount,
      'PAID AMOUNT': item.paidAmount,
      'OUTSTANDING BALANCE': item.balance,
      STATUS: item.status,
      'PAYMENT DATE': item.paidDate || '',
    }));

    ExcelService.exportToExcel(
      [{ sheetName: 'Supplier Outstanding', data: sheetData }],
      'Supplier_Payment_Follow_Up'
    );
  };

  const handleExportDirectory = () => {
    const sheetData = filteredSuppliers.map((s) => ({
      'SUPPLIER NAME': s.name,
      CATEGORY: s.category,
      'CONTACT PERSON': s.contactPerson || '',
      PHONE: s.phone || '',
      ADDRESS: s.address || '',
      REMARKS: s.remarks || '',
    }));

    ExcelService.exportToExcel(
      [{ sheetName: 'Supplier Directory', data: sheetData }],
      'Supplier_Master_Directory'
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header with Tab Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Supplier Management &amp; Invoices</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {suppliersList.length} suppliers in dropdown
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage vendors entered once for all dropdowns, follow up workshop bills, and settle balances.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSubTab('invoices')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              subTab === 'invoices'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Invoice Follow-up</span>
          </button>

          <button
            onClick={() => setSubTab('directory')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              subTab === 'directory'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supplier Master Directory ({suppliersList.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INVOICES & PAYMENTS */}
      {subTab === 'invoices' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Billed Invoices
              </span>
              <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                {formatBDT(stats.totalInvoiced)}
              </span>
              <span className="text-[11px] text-slate-400">
                Across {filteredItems.length} supplier invoices
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Total Settled Amount
              </span>
              <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
                {formatBDT(stats.totalPaid)}
              </span>
              <span className="text-[11px] text-slate-400">
                {stats.totalInvoiced > 0
                  ? `${Math.round((stats.totalPaid / stats.totalInvoiced) * 100)}% paid`
                  : '100% paid'}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                Outstanding Payable Balance
              </span>
              <span className="text-lg font-black text-rose-700 font-mono mt-0.5 block">
                {formatBDT(stats.totalOutstanding)}
              </span>
              <span className="text-[11px] text-rose-600 font-medium">
                {stats.unpaidCount} bills pending clearance
              </span>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search supplier, bill no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none max-w-xs"
              >
                <option value="ALL">All Suppliers (Dropdown)</option>
                {uniqueSuppliers.map((sup) => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="Due">Due / Unpaid ({allItems.filter((x) => x.balance > 0 && x.paidAmount === 0).length})</option>
                <option value="Partial">Partial ({allItems.filter((x) => x.balance > 0 && x.paidAmount > 0).length})</option>
                <option value="Paid">Fully Paid</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Fuel">Fuel</option>
                <option value="Paper Renewal">Paper Renewal</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Vehicles</option>
                {dataset.vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNo}>
                    {v.vehicleNo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInvoices}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Supplier Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Bill / Invoice No</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3 text-right">Invoice Amount</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                        No supplier invoices found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs truncate">
                          {item.supplier}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.billNo}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-700">{item.expenseCategory}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {item.vehicleNo === 'SHARED' ? (
                            <span className="text-purple-700">SHARED</span>
                          ) : (
                            <button
                              onClick={() => onOpenVehicleDetail(item.vehicleNo)}
                              className="hover:text-emerald-700 hover:underline"
                            >
                              {item.vehicleNo}
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatBDT(item.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatBDT(item.paidAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                          {item.balance > 0 ? formatBDT(item.balance) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={
                              item.status === 'Paid'
                                ? 'success'
                                : item.status === 'Partial'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.balance > 0 ? (
                            <button
                              onClick={() => handleOpenSettle(item)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            >
                              Pay / Settle
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SUPPLIER MASTER DIRECTORY */}
      {subTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold">Supplier Master Directory</span>: Add a supplier name here once, and it will automatically populate in all dropdowns for Maintenance, Fuel, Paper Renewal, and Other Expenses.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDirectory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Directory</span>
              </button>

              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register New Supplier</span>
              </button>
            </div>
          </div>

          {/* Directory Filter Toolbar */}
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search supplier name, phone, contact..."
                  value={dirSearchQuery}
                  onChange={(e) => setDirSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={dirCategoryFilter}
                onChange={(e) => setDirCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="Workshop / Garage">Workshop / Garage</option>
                <option value="Fuel Station / Pump">Fuel Station / Pump</option>
                <option value="Spare Parts & Tyres">Spare Parts &amp; Tyres</option>
                <option value="Authority / Insurance">Authority / Insurance</option>
                <option value="Petty Cash / Internal">Petty Cash / Internal</option>
                <option value="General">General Vendor</option>
              </select>
            </div>

            <div className="text-slate-500 text-[11px]">
              Showing <span className="font-bold text-slate-800">{filteredSuppliers.length}</span> suppliers in master
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">Supplier / Vendor Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Contact Person</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address / Location</th>
                    <th className="py-2.5 px-3 text-right">Invoiced History</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No suppliers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => {
                      const relatedBills = allItems.filter(
                        (i) => i.supplier.toLowerCase() === s.name.toLowerCase()
                      );
                      const billedSum = relatedBills.reduce((sum, b) => sum + b.amount, 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="purple" size="sm">
                              {s.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {s.contactPerson || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono">
                            {s.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{s.phone}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {s.address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{s.address}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-800">
                            <span className="font-bold">{formatBDT(billedSum)}</span>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {relatedBills.length} transactions
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingSupplier(s);
                                  setIsSupplierModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit Supplier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(s.id, s.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Supplier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settle Bill Modal */}
      {settleModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setSettleModalItem(null)}
          title={`Settle Bill: ${settleModalItem.billNo}`}
          subtitle={`Supplier: ${settleModalItem.supplier} &bull; Outstanding: ${formatBDT(
            settleModalItem.balance
          )}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmSettle} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bill Amount:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatBDT(settleModalItem.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-emerald-700">
                  {formatBDT(settleModalItem.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span className="text-slate-700">Remaining Balance:</span>
                <span className="font-mono text-rose-700">
                  {formatBDT(settleModalItem.balance)}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Disbursement Amount (BDT) *
              </label>
              <input
                type="number"
                min="1"
                max={settleModalItem.balance}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-black text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment / Settlement Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettleModalItem(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold shadow-sm transition-colors"
              >
                Confirm Payment ({formatBDT(paymentAmount)})
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Supplier Register / Edit Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
        initialData={editingSupplier}
      />
    </div>
  );
};
