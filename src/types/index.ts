export type VehicleStatus = 'Active' | 'Inactive';

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Due' | 'Overdue';

export type AllocationType = 'Single' | 'Multiple' | 'All';

export type ServiceType =
  | 'Drive Train'
  | 'Brake System'
  | 'Electrical System'
  | 'Transmission Parts'
  | 'General Servicing'
  | 'Engine'
  | 'Suspension'
  | 'Tyre'
  | 'Battery'
  | 'AC'
  | 'Other';

export type FuelType = 'Diesel' | 'Petrol' | 'CNG' | 'Octane' | 'Other';

export type DocumentType =
  | 'Fitness'
  | 'Tax Token'
  | 'Route Permit'
  | 'Insurance'
  | 'Registration'
  | 'Other';

export type FineType =
  | 'Speeding'
  | 'Wrong Lane'
  | 'Signal Violation'
  | 'Document Issue'
  | 'Parking Violation'
  | 'Overload'
  | 'Other';

export type OtherExpenseType =
  | 'Washing'
  | 'Parking'
  | 'Emergency expense'
  | 'Accessories'
  | 'Towing'
  | 'Toll'
  | 'Miscellaneous'
  | 'Other';

// --- Relational Entities ---

export interface Vehicle {
  id: string; // e.g. "veh-001"
  vehicleNo: string; // e.g. "DM-MA-11-52-39" (Unique)
  vehicleType: string; // "Delivery Van", "Pickup Truck", "Cargo Truck", "Sedan", "Microbus"
  vehicleModel: string; // "Tata 407", "Toyota HiAce", "Mahindra Bolero", etc.
  driverName: string;
  driverId?: string;
  purchaseDate: string; // YYYY-MM-DD
  status: VehicleStatus;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  licenseNo?: string;
  assignedVehicleNo?: string;
  status: 'Active' | 'Inactive';
}

export type SupplierCategory =
  | 'Workshop / Garage'
  | 'Fuel Station / Pump'
  | 'Authority / Insurance'
  | 'Spare Parts & Tyres'
  | 'Petty Cash / Internal'
  | 'General';

export interface Supplier {
  id: string;
  name: string; // Unique
  category: SupplierCategory;
  contactPerson?: string;
  phone?: string;
  address?: string;
  remarks?: string;
  createdAt: string;
}

export interface MaintenanceTransaction {
  id: string;
  date: string; // YYYY-MM-DD (Expense Date determines the accounting year)
  vehicleNo: string; // Vehicle No or "SHARED" if multi-vehicle
  serviceType: ServiceType;
  partsDescription: string;
  supplier: string;
  quantity: number;
  approvedAmount: number;
  billNo: string;
  amount: number;
  paidAmount: number;
  dueAmount: number; // calculated: amount - paidAmount
  paidDate?: string;
  paymentStatus: PaymentStatus;
  remarks?: string;
  allocationType?: AllocationType;
  allocatedVehicles?: string[]; // list of vehicle numbers if shared
  allocatedShares?: Record<string, number>; // vehicleNo -> allocated amount
  createdBy?: string;
  createdAt: string;
}

export interface FuelTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleNo: string;
  fuelType: FuelType;
  quantity: number; // Litres
  unitPrice: number;
  totalAmount: number; // Quantity * UnitPrice
  slipNo: string;
  supplier: string; // Fuel station name
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  odometerReading?: number;
  remarks?: string;
  createdAt: string;
}

export interface DriverSalaryTransaction {
  id: string;
  month: number; // 1-12
  year: number; // e.g. 2024
  driverName: string;
  driverId?: string;
  vehicleNo: string; // associated vehicle for this salary record
  basicSalary: number;
  allowance: number;
  overtime: number;
  otherPayment: number;
  deduction: number;
  netSalary: number; // basic + allowance + overtime + otherPayment - deduction
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface DocumentRenewal {
  id: string;
  vehicleNo: string;
  documentType: DocumentType;
  documentNumber: string;
  expiryDate: string; // YYYY-MM-DD
  renewalDate: string; // YYYY-MM-DD (Expense Date)
  renewalCost: number;
  supplier: string; // Authority e.g. BRTA, Sadharan Bima
  paymentStatus: PaymentStatus;
  paidDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface PoliceCase {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleNo: string;
  caseType: FineType;
  caseNumber: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueAmount: number; // amount - paidAmount
  paymentStatus: PaymentStatus;
  paidDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface OtherExpense {
  id: string;
  date: string; // YYYY-MM-DD
  vehicleNo: string;
  expenseType: OtherExpenseType;
  description: string;
  supplier: string;
  billNo?: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  paidDate?: string;
  remarks?: string;
  allocationType?: AllocationType;
  allocatedVehicles?: string[];
  allocatedShares?: Record<string, number>;
  createdAt: string;
}

// Supplier Follow-up Item
export interface SupplierFollowUpItem {
  id: string;
  supplier: string;
  billNo: string;
  vehicleNo: string;
  expenseCategory: 'Maintenance' | 'Fuel' | 'Paper Renewal' | 'Other';
  date: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: PaymentStatus;
  paidDate?: string;
}

// Cost Summary structures
export interface VehicleCategoryCost {
  maintenance: number;
  fuel: number;
  salary: number;
  paperRenewal: number;
  policeFine: number;
  other: number;
  total: number;
}

export interface VehicleYearlyCostRow {
  vehicleId: string;
  vehicleNo: string;
  vehicleType: string;
  vehicleModel: string;
  status: VehicleStatus;
  driverName: string;
  yearlyTotals: Record<number, number>; // year -> total amount
  grandTotal: number;
}

export interface MonthCostBreakdown {
  month: number;
  monthName: string;
  maintenance: number;
  fuel: number;
  salary: number;
  paperRenewal: number;
  policeFine: number;
  other: number;
  total: number;
}

// Vehicle Monthly Income & Revenue
export interface VehicleMonthlyIncome {
  id: string;
  month: number; // 1-12
  year: number; // e.g. 2024
  vehicleNo: string; // Vehicle No or "FLEET"
  clientName: string; // Client / Factory / Project Name
  billingType: 'Monthly Contract' | 'Trip Rental' | 'KM Billing' | 'Other Income';
  contractAmount: number; // Base monthly revenue (BDT)
  bonusOrExtraAmount: number; // Extra trips / overtime earnings (BDT)
  totalIncome: number; // contractAmount + bonusOrExtraAmount
  receivedAmount: number; // Received BDT
  dueAmount: number; // totalIncome - receivedAmount
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  receivedDate?: string;
  invoiceNo?: string;
  remarks?: string;
  createdAt: string;
}

export interface MonthlyProfitLossRow {
  vehicleId: string;
  vehicleNo: string;
  vehicleType: string;
  vehicleModel: string;
  driverName: string;
  status: VehicleStatus;
  month: number;
  year: number;
  totalRevenue: number;
  receivedRevenue: number;
  dueRevenue: number;
  fuelCost: number;
  maintenanceCost: number;
  salaryCost: number;
  paperCost: number;
  fineCost: number;
  otherCost: number;
  totalExpense: number;
  netProfit: number; // totalRevenue - totalExpense
  profitMarginPercent: number; // (netProfit / totalRevenue) * 100
  profitStatus: 'Profit' | 'Loss' | 'Break-Even';
}

export interface MonthlyFleetProfitSummary {
  month: number;
  year: number;
  totalRevenue: number;
  receivedRevenue: number;
  dueRevenue: number;
  totalExpense: number;
  expenseBreakdown: {
    fuel: number;
    maintenance: number;
    salary: number;
    paperRenewal: number;
    policeFine: number;
    other: number;
  };
  netProfit: number;
  profitMarginPercent: number;
  profitableVehiclesCount: number;
  lossVehiclesCount: number;
  totalVehiclesCount: number;
}

// Vehicle Distance & Mileage Tracking
export interface VehicleMonthlyMileage {
  id: string;
  vehicleNo: string;
  month: number; // 1-12
  year: number; // e.g. 2024
  startOdometer?: number; // e.g. 120500
  endOdometer?: number; // e.g. 123700
  totalKmRun: number; // Total km driven in this month (e.g. 3200)
  totalTrips?: number;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

// Cost Per KM (CPK) Analysis Structures
export interface CostPerKmRow {
  vehicleId: string;
  vehicleNo: string;
  vehicleModel: string;
  vehicleType: string;
  driverName: string;
  status: VehicleStatus;
  month: number;
  year: number;
  totalKmRun: number;
  totalFuelLitres: number;
  fuelMileageKmpL: number; // KM / Litre
  fuelCost: number;
  maintenanceCost: number;
  salaryCost: number;
  paperAndFineCost: number;
  otherCost: number;
  totalCost: number;
  // Per KM Rates (BDT / KM)
  fuelCostPerKm: number;
  maintenanceCostPerKm: number;
  salaryCostPerKm: number;
  otherCostPerKm: number;
  totalCostPerKm: number;
  // Profitability per KM
  totalRevenue: number;
  revenuePerKm: number;
  netProfitPerKm: number;
  efficiencyRating: 'Excellent' | 'Good' | 'Moderate' | 'High Cost' | 'No KM Data';
}

export interface FleetCostPerKmSummary {
  month: number;
  year: number;
  totalFleetKmRun: number;
  totalFleetFuelLitres: number;
  avgFleetMileageKmpL: number; // KM / Litre
  totalFleetExpense: number;
  avgCostPerKm: number; // Total Expense / Total KM
  avgFuelCostPerKm: number;
  avgMaintenanceCostPerKm: number;
  avgSalaryCostPerKm: number;
  avgOtherCostPerKm: number;
  totalFleetRevenue: number;
  avgRevenuePerKm: number;
  avgNetProfitPerKm: number;
}

// Import structures
export type ImportModuleType =
  | 'maintenance'
  | 'fuel'
  | 'salary'
  | 'paper'
  | 'fines'
  | 'other'
  | 'vehicles';

export interface ValidationErrorItem {
  row: number;
  field: string;
  message: string;
  rawValue?: any;
}

export interface ImportPreviewResult<T = any> {
  moduleType: ImportModuleType;
  totalRows: number;
  validRows: T[];
  duplicateRows: { row: number; data: T; reason: string }[];
  invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[];
}
