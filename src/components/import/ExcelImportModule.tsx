import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileCheck,
  BookOpen,
  Info,
  Check,
} from 'lucide-react';
import { ExcelService } from '../../services/excelService';
import { storage } from '../../services/storage';
import { Modal } from '../common/Modal';
import {
  ImportModuleType,
  ImportPreviewResult,
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
} from '../../types';
import { formatBDT } from '../../services/costCalculations';

interface ExcelImportModuleProps {
  vehicles: Vehicle[];
  onRefreshData: () => void;
  initialModule?: ImportModuleType;
}

export const MODULE_COLUMN_GUIDES: Record<
  string,
  {
    moduleTitle: string;
    descriptionBn: string;
    templateFileName: string;
    columns: {
      name: string;
      required: boolean;
      example: string;
      descriptionBn: string;
    }[];
  }
> = {
  maintenance: {
    moduleTitle: 'Maintenance & Repairs (রক্ষণাবেক্ষণ ও পার্টস)',
    descriptionBn: 'গাড়ির যাবতীয় সার্ভিসিং, মেরামত, পার্টস বদল, মেকানিক বিল ও পেমেন্ট রেকর্ড।',
    templateFileName: 'Maintenance_Import_Template.xlsx',
    columns: [
      { name: 'DATE', required: true, example: '2024-05-15', descriptionBn: 'খরচের তারিখ (YYYY-MM-DD বা DD/MM/YYYY ফরম্যাটে হতে হবে)' },
      { name: 'CAR NO', required: true, example: 'DM-MA-11-52-39', descriptionBn: 'গাড়ির নম্বর (Vehicle Master-এ থাকতে হবে, বা একাধিক গাড়ির খরচে ALL)' },
      { name: 'SERVICE TYPE', required: false, example: 'Brake System', descriptionBn: 'সার্ভিসের ধরন (Brake, Tyre, Engine, General Servicing ইত্যাদি)' },
      { name: 'PARTS / SERVICE', required: true, example: 'Brake shoe replace & Mobil', descriptionBn: 'পার্টস বা কাজের বিবরণ' },
      { name: 'AMOUNT', required: true, example: '9500', descriptionBn: 'মোট বিলের পরিমাণ (টাকা/BDT, ধনাত্মক সংখ্যা)' },
      { name: 'PAID', required: false, example: '9500', descriptionBn: 'পরিশোধিত টাকা (কম পরিশোধ করলে বাকি টাকা Due হিসেবে থাকবে)' },
      { name: 'SUPPLIER', required: false, example: 'Rahimafrooz Workshop', descriptionBn: 'ওয়ার্কশপ বা ভেন্ডরের নাম' },
      { name: 'BILL NO', required: false, example: 'INV-2024-102', descriptionBn: 'বিল বা ইনভয়েস নম্বর' },
      { name: 'PARTS QUANTITY', required: false, example: '1', descriptionBn: 'পার্টসের সংখ্যা বা পরিমাণ (ডিফল্ট ১)' },
      { name: 'APPROVE AMOUNT', required: false, example: '9500', descriptionBn: 'অনুমোদিত বাজেট' },
      { name: 'STATUS', required: false, example: 'Paid', descriptionBn: 'পেমেন্ট স্ট্যাটাস (Paid, Partial, Unpaid)' },
      { name: 'PAID DATE', required: false, example: '2024-05-20', descriptionBn: 'টাকা পরিশোধের তারিখ' },
      { name: 'REMARKS', required: false, example: 'Approved by factory officer', descriptionBn: 'অতিরিক্ত মন্তব্য' },
    ],
  },
  fuel: {
    moduleTitle: 'Fuel Expense (জ্বালানি খরচ)',
    descriptionBn: 'ডিজেল, পেট্রোল, সিএনজি বা অকটেন ক্রয়ের স্লিপ, লিটার ও টাকার পরিমাণ।',
    templateFileName: 'Fuel_Import_Template.xlsx',
    columns: [
      { name: 'DATE', required: true, example: '2024-06-01', descriptionBn: 'জ্বালানি ক্রয়ের তারিখ' },
      { name: 'CAR NO', required: true, example: 'DM-MA-11-52-39', descriptionBn: 'গাড়ির রেজিস্ট্রেশন নম্বর' },
      { name: 'ITEM', required: false, example: 'Diesel', descriptionBn: 'জ্বালানির ধরন (Diesel, Petrol, Octane, CNG)' },
      { name: 'QUANTITY', required: true, example: '50', descriptionBn: 'লিটার বা ইউনিটের সংখ্যা (দশমিক গ্রহণযোগ্য)' },
      { name: 'UNIT PRICE', required: true, example: '105', descriptionBn: 'প্রতি লিটারের দর (টাকা)' },
      { name: 'TOTAL PRICE', required: false, example: '5250', descriptionBn: 'মোট টাকা (ফাঁকা রাখলে Quantity × Unit Price নিজে নিজেই গুণ হবে)' },
      { name: 'SLIP NO', required: false, example: 'SLP-2024-401', descriptionBn: 'রিসিট বা ক্যাশ স্লিপ ভাউচার নম্বর' },
      { name: 'SUPPLIER', required: false, example: 'Trust Filling Station, Tejgaon', descriptionBn: 'তেল পাম্প বা ফিলিং স্টেশনের নাম' },
      { name: 'STATUS', required: false, example: 'Paid', descriptionBn: 'পেমেন্ট স্ট্যাটাস (Paid বা Unpaid)' },
      { name: 'PAYMENT DATE', required: false, example: '2024-06-01', descriptionBn: 'বিল পরিশোধের তারিখ' },
    ],
  },
  salary: {
    moduleTitle: 'Driver Monthly Salary (ড্রাইভার মাসিক বেতন)',
    descriptionBn: 'ড্রাইভারের প্রতি মাসের মূল বেতন, খোরাকি, ওভারটাইম এবং কর্তন।',
    templateFileName: 'Driver_Salary_Import_Template.xlsx',
    columns: [
      { name: 'MONTH', required: true, example: '6', descriptionBn: 'মাসের সংখ্যা (১ থেকে ১২, যেমন ৬ = June)' },
      { name: 'YEAR', required: true, example: '2024', descriptionBn: 'বেতনের সাল (যেমন 2024)' },
      { name: 'VEHICLE NO', required: true, example: 'DM-MA-11-52-39', descriptionBn: 'যে গাড়ির জন্য ড্রাইভার অ্যাসাইন ছিলেন' },
      { name: 'DRIVER NAME', required: true, example: 'Mohammad Rafiqul Islam', descriptionBn: 'ড্রাইভারের নাম' },
      { name: 'BASIC SALARY', required: true, example: '20000', descriptionBn: 'মূল বেতন (টাকা)' },
      { name: 'ALLOWANCE', required: false, example: '3500', descriptionBn: 'খোরাকি বা দৈনিক যাতায়াত ভাতা' },
      { name: 'OVERTIME', required: false, example: '2500', descriptionBn: 'ওভারটাইম ভাতা' },
      { name: 'OTHER PAYMENT', required: false, example: '2000', descriptionBn: 'বোনাস বা উৎসব ভাতা' },
      { name: 'DEDUCTION', required: false, example: '500', descriptionBn: 'অগ্রিম বা অনুপস্থিতি কর্তন (-)' },
      { name: 'STATUS', required: false, example: 'Paid', descriptionBn: 'Paid বা Unpaid' },
      { name: 'REMARKS', required: false, example: 'June payroll with bonus', descriptionBn: 'মন্তব্য' },
    ],
  },
  paper: {
    moduleTitle: 'Paper Renewal (কাগজপত্র নবায়ন)',
    descriptionBn: 'ফিটনেস, ট্যাক্স টোকেন, রুট পারমিট, বীমা ও রেজিস্ট্রেশন নবায়ন।',
    templateFileName: 'Document_Renewal_Import_Template.xlsx',
    columns: [
      { name: 'VEHICLE NO', required: true, example: 'DM-MA-11-52-39', descriptionBn: 'গাড়ির নম্বর' },
      { name: 'DOCUMENT TYPE', required: true, example: 'Fitness', descriptionBn: 'কাগজের ধরন (Fitness, Tax Token, Route Permit, Insurance)' },
      { name: 'DOCUMENT NUMBER', required: true, example: 'BRTA-FIT-2024-912', descriptionBn: 'সনদ বা চালান নম্বর' },
      { name: 'RENEWAL DATE', required: true, example: '2024-04-10', descriptionBn: 'রিনিউ বা খরচের তারিখ' },
      { name: 'EXPIRY DATE', required: true, example: '2025-04-10', descriptionBn: 'মেয়াদ উত্তীর্ণের তারিখ' },
      { name: 'COST', required: true, example: '7500', descriptionBn: 'নবায়ন ফি বাবদ খরচ (টাকা)' },
      { name: 'AUTHORITY', required: false, example: 'BRTA Mirpur Circle', descriptionBn: 'বিআরটিএ অফিস বা বীমা কোম্পানি' },
      { name: 'STATUS', required: false, example: 'Paid', descriptionBn: 'পরিশোধের স্ট্যাটাস' },
      { name: 'REMARKS', required: false, example: 'Annual fitness certificate', descriptionBn: 'মন্তব্য' },
    ],
  },
  vehicles: {
    moduleTitle: 'Vehicle Master (গাড়ির তালিকা)',
    descriptionBn: 'ফ্যাক্টরির সব গাড়ির প্রাথমিক তালিকা ও তথ্য।',
    templateFileName: 'Vehicle_Master_Import_Template.xlsx',
    columns: [
      { name: 'VEHICLE NO', required: true, example: 'DM-MA-11-52-39', descriptionBn: 'গাড়ির ইউনিক নম্বর (আবশ্যক)' },
      { name: 'VEHICLE TYPE', required: true, example: 'Delivery Van', descriptionBn: 'গাড়ির ধরন (Van, Pickup, Cargo, Sedan ইত্যাদি)' },
      { name: 'VEHICLE MODEL', required: false, example: 'Tata 407 LPT', descriptionBn: 'গাড়ির মডেল' },
      { name: 'DRIVER NAME', required: false, example: 'Mohammad Rafiqul Islam', descriptionBn: 'ড্রাইভারের নাম' },
      { name: 'DRIVER ID', required: false, example: 'DRV-101', descriptionBn: 'ড্রাইভার আইডি' },
      { name: 'PURCHASE DATE', required: false, example: '2021-06-15', descriptionBn: 'ক্রয় বা বহরে যুক্ত হওয়ার তারিখ' },
      { name: 'STATUS', required: false, example: 'Active', descriptionBn: 'Active বা Inactive' },
      { name: 'REMARKS', required: false, example: 'Zone-1 North Dhaka Factory', descriptionBn: 'মন্তব্য' },
    ],
  },
};

export const ExcelImportModule: React.FC<ExcelImportModuleProps> = ({
  vehicles,
  onRefreshData,
  initialModule = 'fuel',
}) => {
  const [selectedModule, setSelectedModule] = useState<ImportModuleType>(initialModule);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid' | 'duplicate'>('valid');
  const [showColumnGuideModal, setShowColumnGuideModal] = useState(false);
  const [guideModule, setGuideModule] = useState<ImportModuleType>(initialModule);

  React.useEffect(() => {
    if (initialModule) {
      setSelectedModule(initialModule);
      setGuideModule(initialModule);
    }
  }, [initialModule]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setImportStatusMessage(null);

    try {
      const rawRows = await ExcelService.readWorkbookRows(file);

      if (rawRows.length === 0) {
        alert('Uploaded spreadsheet appears to be empty.');
        setIsProcessing(false);
        return;
      }

      let result: ImportPreviewResult;

      if (selectedModule === 'maintenance') {
        const existing = storage.getMaintenance();
        result = ExcelService.validateMaintenanceData(rawRows, existing, vehicles);
      } else if (selectedModule === 'fuel') {
        const existing = storage.getFuel();
        result = ExcelService.validateFuelData(rawRows, existing, vehicles);
      } else if (selectedModule === 'salary') {
        const existing = storage.getSalaries();
        result = ExcelService.validateSalaryData(rawRows, existing, vehicles);
      } else if (selectedModule === 'paper') {
        const existing = storage.getRenewals();
        result = ExcelService.validatePaperRenewalData(rawRows, existing, vehicles);
      } else if (selectedModule === 'vehicles') {
        const existing = storage.getVehicles();
        result = ExcelService.validateVehicleData(rawRows, existing);
      } else {
        throw new Error('Unsupported module type');
      }

      setPreviewResult(result);
      if (result.invalidRows.length > 0) {
        setActiveTab('invalid');
      } else if (result.duplicateRows.length > 0) {
        setActiveTab('duplicate');
      } else {
        setActiveTab('valid');
      }
    } catch (err: any) {
      alert(`Failed to parse Excel file: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!previewResult || previewResult.validRows.length === 0) {
      alert('No valid records to import.');
      return;
    }

    let insertedCount = 0;

    if (previewResult.moduleType === 'maintenance') {
      insertedCount = storage.bulkInsertMaintenance(
        previewResult.validRows as MaintenanceTransaction[]
      );
    } else if (previewResult.moduleType === 'fuel') {
      insertedCount = storage.bulkInsertFuel(
        previewResult.validRows as FuelTransaction[]
      );
    } else if (previewResult.moduleType === 'salary') {
      insertedCount = storage.bulkInsertSalaries(
        previewResult.validRows as DriverSalaryTransaction[]
      );
    } else if (previewResult.moduleType === 'paper') {
      insertedCount = storage.bulkInsertRenewals(
        previewResult.validRows as DocumentRenewal[]
      );
    } else if (previewResult.moduleType === 'vehicles') {
      insertedCount = storage.bulkInsertVehicles(
        previewResult.validRows as Vehicle[]
      );
    }

    setImportStatusMessage(
      `Successfully imported ${insertedCount} ${previewResult.moduleType} records into the system.`
    );
    setPreviewResult(null);
    onRefreshData();
  };

  const handleDownloadErrorReport = () => {
    if (!previewResult) return;
    ExcelService.exportValidationErrorReport(
      previewResult.moduleType,
      previewResult.invalidRows,
      previewResult.duplicateRows
    );
  };

  const handleDownloadTemplate = () => {
    ExcelService.downloadTemplate(selectedModule);
  };

  return (
    <div className="space-y-5">
      {/* Module Selection & Template Downloader */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Excel Historical &amp; Batch Data Import</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select module type, upload .xlsx or .xls files, review strict validation checks, and import clean data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGuideModule(selectedModule);
                setShowColumnGuideModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>📋 এক্সেল কলাম গাইড (Required Columns)</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {selectedModule.toUpperCase()} Template (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Module Picker */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'maintenance', label: '1. Maintenance Expenses' },
              { id: 'fuel', label: '2. Fuel Expenses' },
              { id: 'salary', label: '3. Driver Salaries' },
              { id: 'paper', label: '4. Paper Renewals' },
              { id: 'vehicles', label: '5. Vehicle Master' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModule(m.id);
                setPreviewResult(null);
                setImportStatusMessage(null);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedModule === m.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Required Columns Reference Box */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>📋 Required Excel Columns for {selectedModule.toUpperCase()}:</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Tip: Click "Download Template (.xlsx)" above to get a ready-made Excel file.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 text-[11px]">
            {selectedModule === 'maintenance' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DATE *</span>
                  <span className="text-slate-500 text-[10px]">YYYY-MM-DD</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">CAR NO *</span>
                  <span className="text-slate-500 text-[10px]">Vehicle No / "ALL"</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">SERVICE TYPE *</span>
                  <span className="text-slate-500 text-[10px]">Brake, Tyre, Engine...</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">PARTS / SERVICE *</span>
                  <span className="text-slate-500 text-[10px]">Description</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">AMOUNT *</span>
                  <span className="text-slate-500 text-[10px]">Bill amount in BDT</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">PAID</span>
                  <span className="text-slate-400 text-[10px]">Paid amount</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">SUPPLIER</span>
                  <span className="text-slate-400 text-[10px]">Workshop / Vendor</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">BILL NO</span>
                  <span className="text-slate-400 text-[10px]">Invoice / Bill No</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">PARTS QUANTITY</span>
                  <span className="text-slate-400 text-[10px]">Quantity</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">APPROVE AMOUNT</span>
                  <span className="text-slate-400 text-[10px]">Approved budget</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">STATUS</span>
                  <span className="text-slate-400 text-[10px]">Paid / Partial / Unpaid</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">PAID DATE</span>
                  <span className="text-slate-400 text-[10px]">Payment date</span>
                </div>
              </>
            )}

            {selectedModule === 'fuel' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DATE *</span>
                  <span className="text-slate-500 text-[10px]">YYYY-MM-DD</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">CAR NO *</span>
                  <span className="text-slate-500 text-[10px]">Vehicle No</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">ITEM *</span>
                  <span className="text-slate-500 text-[10px]">Diesel / Octane / CNG</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">QUANTITY *</span>
                  <span className="text-slate-500 text-[10px]">Litres</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">UNIT PRICE *</span>
                  <span className="text-slate-500 text-[10px]">Per litre rate</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">TOTAL PRICE</span>
                  <span className="text-slate-400 text-[10px]">Auto (Qty × Rate)</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">SLIP NO</span>
                  <span className="text-slate-400 text-[10px]">Receipt voucher no</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">SUPPLIER</span>
                  <span className="text-slate-400 text-[10px]">Pump / Fuel station</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">STATUS</span>
                  <span className="text-slate-400 text-[10px]">Paid / Unpaid</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">PAYMENT DATE</span>
                  <span className="text-slate-400 text-[10px]">Paid date</span>
                </div>
              </>
            )}

            {selectedModule === 'salary' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">MONTH *</span>
                  <span className="text-slate-500 text-[10px]">1 - 12 / Jan - Dec</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">YEAR *</span>
                  <span className="text-slate-500 text-[10px]">e.g. 2024</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">VEHICLE NO *</span>
                  <span className="text-slate-500 text-[10px]">Assigned car</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DRIVER NAME *</span>
                  <span className="text-slate-500 text-[10px]">Full name</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">BASIC SALARY *</span>
                  <span className="text-slate-500 text-[10px]">Basic amount</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">ALLOWANCE</span>
                  <span className="text-slate-400 text-[10px]">House/food/daily</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">OVERTIME</span>
                  <span className="text-slate-400 text-[10px]">OT amount</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">OTHER PAYMENT</span>
                  <span className="text-slate-400 text-[10px]">Bonus / festival</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">DEDUCTION</span>
                  <span className="text-slate-400 text-[10px]">Deduction (-)</span>
                </div>
              </>
            )}

            {selectedModule === 'paper' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">VEHICLE NO *</span>
                  <span className="text-slate-500 text-[10px]">Car registration no</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DOCUMENT TYPE *</span>
                  <span className="text-slate-500 text-[10px]">Fitness, Tax Token...</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DOCUMENT NUMBER *</span>
                  <span className="text-slate-500 text-[10px]">Certificate number</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">RENEWAL DATE *</span>
                  <span className="text-slate-500 text-[10px]">Expense date</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">EXPIRY DATE *</span>
                  <span className="text-slate-500 text-[10px]">Valid until date</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">COST *</span>
                  <span className="text-slate-500 text-[10px]">Renewal fee in BDT</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">AUTHORITY</span>
                  <span className="text-slate-400 text-[10px]">BRTA / Insurance</span>
                </div>
              </>
            )}

            {selectedModule === 'vehicles' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">VEHICLE NO *</span>
                  <span className="text-slate-500 text-[10px]">Unique (e.g. DM-MA-11-52-39)</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">VEHICLE TYPE *</span>
                  <span className="text-slate-500 text-[10px]">Delivery Van, Truck...</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">VEHICLE MODEL *</span>
                  <span className="text-slate-500 text-[10px]">Tata 407, Isuzu NPR...</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded">
                  <span className="font-bold text-emerald-900 block">DRIVER NAME *</span>
                  <span className="text-slate-500 text-[10px]">Assigned driver</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">PURCHASE DATE</span>
                  <span className="text-slate-400 text-[10px]">Induction date</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                  <span className="font-semibold text-slate-700 block">STATUS</span>
                  <span className="text-slate-400 text-[10px]">Active / Inactive</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {importStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{importStatusMessage}</span>
          </div>
          <button
            onClick={() => setImportStatusMessage(null)}
            className="text-xs text-emerald-700 hover:underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!previewResult && (
        <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors text-center shadow-xs">
          <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">
            Upload Excel File for {selectedModule.toUpperCase()}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Supports standard company Excel sheets (.xlsx, .xls, .csv). Columns will be detected and validated automatically against the Vehicle Master.
          </p>

          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Select Excel File (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-emerald-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing columns and validating rows...</span>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW AND VALIDATION SCREEN */}
      {previewResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">
                  Import Preview: {fileName}
                </span>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {previewResult.totalRows} total rows
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Carefully inspect valid rows, duplicates, and validation errors before importing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewResult(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel / Choose Another File
              </button>

              {(previewResult.invalidRows.length > 0 ||
                previewResult.duplicateRows.length > 0) && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Error Report (.xlsx)</span>
                </button>
              )}

              <button
                onClick={handleConfirmImport}
                disabled={previewResult.validRows.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Import {previewResult.validRows.length} Valid Records</span>
              </button>
            </div>
          </div>

          {/* Validation Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveTab('valid')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'valid'
                  ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Valid Records</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {previewResult.validRows.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Ready for insertion</p>
            </button>

            <button
              onClick={() => setActiveTab('invalid')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'invalid'
                  ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Invalid Records</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-bold text-rose-700 mt-1">
                {previewResult.invalidRows.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Errors found (will be skipped)</p>
            </button>

            <button
              onClick={() => setActiveTab('duplicate')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeTab === 'duplicate'
                  ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Duplicate Records</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-700 mt-1">
                {previewResult.duplicateRows.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Already in database (skipped)</p>
            </button>
          </div>

          {/* Table display for active tab */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-96">
            {activeTab === 'valid' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Vehicle No</th>
                    <th className="p-2.5">Date / Period</th>
                    <th className="p-2.5">Details</th>
                    <th className="p-2.5 text-right">Amount (BDT)</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.validRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No valid records found in this file.
                      </td>
                    </tr>
                  ) : (
                    previewResult.validRows.slice(0, 50).map((r: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-800">
                          {r.vehicleNo || r.carno}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {r.date || (r.month ? `${r.month}/${r.year}` : r.renewalDate)}
                        </td>
                        <td className="p-2.5 text-slate-700 max-w-xs truncate">
                          {r.fuelType
                            ? `${r.fuelType} — ${r.quantity} L @ ৳${r.unitPrice} (${r.supplier || 'Pump'})`
                            : r.partsDescription ||
                              r.serviceType ||
                              r.documentType ||
                              r.driverName ||
                              r.vehicleType ||
                              '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                          {formatBDT(
                            r.amount ||
                              r.totalAmount ||
                              r.netSalary ||
                              r.renewalCost ||
                              0
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800">
                            Valid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'invalid' && (
              <div className="p-4 space-y-3">
                {previewResult.invalidRows.length === 0 ? (
                  <div className="p-6 text-center text-emerald-600 font-semibold">
                    Great! There are no validation errors in this sheet.
                  </div>
                ) : (
                  previewResult.invalidRows.map((inv, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-rose-800">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Row {inv.row}:</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 pl-6 list-disc text-rose-700">
                        {inv.errors.map((err, eIdx) => (
                          <li key={eIdx}>
                            <span className="font-semibold">{err.field}:</span> {err.message}
                            {err.rawValue !== undefined && (
                              <span className="text-slate-500 font-mono ml-1">
                                (got: "{String(err.rawValue)}")
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'duplicate' && (
              <div className="p-4 space-y-2">
                {previewResult.duplicateRows.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No duplicate entries detected.
                  </div>
                ) : (
                  previewResult.duplicateRows.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs flex items-start gap-2.5 text-amber-900"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Row {dup.row}: </span>
                        <span>{dup.reason}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Column Guide Modal */}
      {showColumnGuideModal && (
        <Modal
          isOpen={showColumnGuideModal}
          onClose={() => setShowColumnGuideModal(false)}
          title="পুরাতন এক্সেল ফাইলের কলাম তালিকা ও নিয়মাবলী (Excel Columns Guide)"
          subtitle="৫ বছরের পুরনো এক্সেল ডেটা সফটওয়্যারে ইমপোর্ট করার জন্য নিচের কলামগুলো আপনার ফাইলে থাকতে হবে।"
          maxWidth="3xl"
        >
          <div className="space-y-4 text-xs">
            {/* Module Picker in Modal */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'maintenance', label: '1. Maintenance (রক্ষণাবেক্ষণ)' },
                  { id: 'fuel', label: '2. Fuel (জ্বালানি)' },
                  { id: 'salary', label: '3. Driver Salary (বেতন)' },
                  { id: 'paper', label: '4. Paper Renewal (কাগজপত্র)' },
                  { id: 'vehicles', label: '5. Vehicle Master (গাড়ি তালিকা)' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGuideModule(m.id)}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                    guideModule === m.id
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Current Module Description & Action */}
            {MODULE_COLUMN_GUIDES[guideModule] && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    {MODULE_COLUMN_GUIDES[guideModule].moduleTitle}
                  </h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    {MODULE_COLUMN_GUIDES[guideModule].descriptionBn}
                  </p>
                </div>
                <button
                  onClick={() => ExcelService.downloadTemplate(guideModule)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>রেডি এক্সেল টেমপ্লেট ডাউনলোড করুন (.xlsx)</span>
                </button>
              </div>
            )}

            {/* Columns Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-36">কলামের নাম (Excel Header)</th>
                      <th className="py-2.5 px-2.5 w-24">প্রয়োজনীয়তা</th>
                      <th className="py-2.5 px-3 w-36">উদাহরন (Example)</th>
                      <th className="py-2.5 px-3">বর্ণনা ও নিয়মাবলী (Rules)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {MODULE_COLUMN_GUIDES[guideModule]?.columns.map((col, cIdx) => (
                      <tr key={cIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {col.name}
                        </td>
                        <td className="py-2 px-2.5">
                          {col.required ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              আবশ্যক *
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              ঐচ্ছিক
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-700 font-semibold bg-slate-50/50">
                          {col.example}
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px]">
                          {col.descriptionBn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-blue-900 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-blue-950">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>জরুরি এক্সেল নিয়মাবলী:</span>
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-blue-800">
                <li>
                  <span className="font-semibold">কলামের নাম:</span> প্রথম সারিতে (Row 1) উপরের মতো কলামের হেডার থাকতে হবে। বড় বা ছোট হাতের অক্ষরে কোনো সমস্যা নেই (যেমন <code>CAR NO</code>, <code>Car No</code>, বা <code>car_no</code> একই কাজ করবে)।
                </li>
                <li>
                  <span className="font-semibold">গাড়ির অস্তিত্ব:</span> কোনো গাড়ির খরচ (মেইন্টেন্যান্স, জ্বালানি বা বেতন) আপলোড করার আগে নিশ্চিত করুন যে গাড়িটি <b>Vehicle Master</b>-এ আগে থেকেই আছে। সবার যৌথ খরচে <code>ALL</code> লিখবেন।
                </li>
                <li>
                  <span className="font-semibold">তারিখের ফরম্যাট:</span> <code>YYYY-MM-DD</code> (যেমন: 2024-05-20) অথবা <code>DD/MM/YYYY</code> দিন।
                </li>
                <li>
                  <span className="font-semibold">টাকার পরিমাণ:</span> AMOUNT, PAID, QUANTITY, RATE ইত্যাদি ঘরে কেবল সংখ্যা লিখবেন। কোনো কমা (,), টাকা চিহ্ন (৳) বা টেক্সট লিখবেন না।
                </li>
              </ul>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowColumnGuideModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
