import {
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
  SupplierFollowUpItem,
  Supplier,
  SupplierCategory,
  VehicleMonthlyIncome,
  VehicleMonthlyMileage,
} from '../types';

const STORAGE_KEYS = {
  VEHICLES: 'vcm_vehicles_v1',
  SUPPLIERS: 'vcm_suppliers_v1',
  MAINTENANCE: 'vcm_maintenance_v1',
  FUEL: 'vcm_fuel_v1',
  SALARIES: 'vcm_salaries_v1',
  RENEWALS: 'vcm_renewals_v1',
  FINES: 'vcm_fines_v1',
  OTHER: 'vcm_other_v1',
  INCOMES: 'vcm_incomes_v1',
  MILEAGES: 'vcm_mileages_v1',
  SEEDED: 'vcm_seeded_v1',
  PURGED_FLAG: 'vcm_dummy_purged_final_v2',
};

export const INITIAL_SUPPLIERS: Supplier[] = [];

// Empty initial vehicle fleet (Ready for real factory data)
const INITIAL_VEHICLES: Vehicle[] = [];

// Generator for optional 5 years (2022-2026) sample demo data (only loaded if user explicitly requests in Settings)
function generateHistoricalSeedData() {
  const maintenance: MaintenanceTransaction[] = [];
  const fuel: FuelTransaction[] = [];
  const salaries: DriverSalaryTransaction[] = [];
  const renewals: DocumentRenewal[] = [];
  const fines: PoliceCase[] = [];
  const other: OtherExpense[] = [];

  const suppliers = [
    'Rahimafrooz Workshop',
    'Uttara Motors Ltd.',
    'Navana Auto Service',
    'Bengal Tyre & Tube Center',
    'Akij Auto Care',
    'Siddique Auto Electrical',
    'Meghna Diesel Service',
  ];

  const fuelStations = [
    'Trust Filling Station, Tejgaon',
    'Padma Oil Pump, Mohakhali',
    'Jamuna Fuel & CNG, Gazipur',
    'Meghna Petroleum, Tongi',
  ];

  const serviceCategories = [
    { type: 'General Servicing', desc: 'Mobil, Oil Filter, Air Filter replace', avgCost: 12500 },
    { type: 'Brake System', desc: 'Brake pad and shoe replacement, brake fluid', avgCost: 9500 },
    { type: 'Tyre', desc: 'Tubeless radial tyre replacement', avgCost: 32000 },
    { type: 'Electrical System', desc: 'Alternator servicing, headlamp wiring', avgCost: 6500 },
    { type: 'Battery', desc: 'Rahimafrooz 12V 100AH heavy battery', avgCost: 16500 },
    { type: 'Suspension', desc: 'Leaf spring bush and shock absorber overhaul', avgCost: 18000 },
    { type: 'AC', desc: 'Gas refill, AC compressor belt servicing', avgCost: 8500 },
  ] as const;

  const years = [2022, 2023, 2024, 2025, 2026];

  let maintIdCounter = 100;
  let fuelIdCounter = 2000;
  let salaryIdCounter = 500;
  let renewalIdCounter = 300;
  let fineIdCounter = 400;
  let otherIdCounter = 600;

  // 1. Shared Maintenance Expense Example: "TUBE FOR FIVE DELIVERY VAN"
  maintenance.push({
    id: `maint-${maintIdCounter++}`,
    date: '2024-04-18',
    vehicleNo: 'SHARED',
    serviceType: 'Tyre',
    partsDescription: 'TUBE FOR FIVE DELIVERY VAN (Heavy Duty Tubes set of 10)',
    supplier: 'Bengal Tyre & Tube Center',
    quantity: 10,
    approvedAmount: 25000,
    billNo: 'BTT-2024-889',
    amount: 25000,
    paidAmount: 25000,
    dueAmount: 0,
    paidDate: '2024-04-25',
    paymentStatus: 'Paid',
    remarks: 'Allocated equally across 5 factory vehicles (৳5,000 each)',
    allocationType: 'All',
    allocatedVehicles: INITIAL_VEHICLES.map((v) => v.vehicleNo),
    allocatedShares: {
      'DM-MA-11-52-39': 5000,
      'DM-MA-11-52-78': 5000,
      'DM-MA-11-59-68': 5000,
      'DM-MA-11-59-69': 5000,
      'DM-AU-13-09-93': 5000,
    },
    createdBy: 'Admin Store Manager',
    createdAt: '2024-04-18T10:00:00Z',
  });

  // Generate per-vehicle historical data across 2022-2026
  INITIAL_VEHICLES.forEach((veh, vIdx) => {
    let odoBase = 45000 + vIdx * 12000;

    years.forEach((yr) => {
      // 12 months for 2022-2025; up to current month (Sep) for 2026
      const maxMonth = yr === 2026 ? 9 : 12;

      // --- Monthly Driver Salary ---
      for (let m = 1; m <= maxMonth; m++) {
        const monthStr = m.toString().padStart(2, '0');
        const basic = 18000 + vIdx * 1500 + (yr - 2022) * 1200;
        const allowance = 3500;
        const ot = m % 2 === 0 ? 2500 : 1800;
        const deduction = m === 3 || m === 8 ? 500 : 0;
        const otherPay = m === 4 || m === 6 ? 2000 : 0; // Eid / Festival bonus allowance
        const net = basic + allowance + ot + otherPay - deduction;

        const isRecent = yr === 2026 && m === 9;
        const status = isRecent ? 'Unpaid' : 'Paid';
        const paidDate = isRecent ? undefined : `${yr}-${monthStr}-28`;

        salaries.push({
          id: `sal-${salaryIdCounter++}`,
          month: m,
          year: yr,
          driverName: veh.driverName,
          driverId: veh.driverId,
          vehicleNo: veh.vehicleNo,
          basicSalary: basic,
          allowance,
          overtime: ot,
          otherPayment: otherPay,
          deduction,
          netSalary: net,
          paymentStatus: status,
          paymentDate: paidDate,
          remarks: otherPay > 0 ? 'Includes Festival Allowance' : 'Monthly Payroll',
          createdAt: `${yr}-${monthStr}-25T08:00:00Z`,
        });
      }

      // --- Fuel Transactions (2-3 slips per month) ---
      for (let m = 1; m <= maxMonth; m++) {
        const monthStr = m.toString().padStart(2, '0');
        const fillDays = [7, 18, 27];
        const unitPrice = yr <= 2023 ? 100 : yr === 2024 ? 105 : 108.5;

        fillDays.forEach((day, fIdx) => {
          const dayStr = day.toString().padStart(2, '0');
          const qty = 45 + ((vIdx + m + fIdx) % 15) * 2;
          const total = Math.round(qty * unitPrice);
          odoBase += Math.round(qty * 9.2);

          const isUnpaid = yr === 2026 && m === 9 && fIdx === 2;
          const status = isUnpaid ? 'Unpaid' : 'Paid';
          const pDate = isUnpaid ? undefined : `${yr}-${monthStr}-${dayStr}`;

          fuel.push({
            id: `fuel-${fuelIdCounter++}`,
            date: `${yr}-${monthStr}-${dayStr}`,
            vehicleNo: veh.vehicleNo,
            fuelType: veh.vehicleType === 'Pickup Truck' ? 'Diesel' : 'Diesel',
            quantity: qty,
            unitPrice,
            totalAmount: total,
            slipNo: `SLP-${yr}-${m * 10 + fIdx + 100}-${vIdx + 1}`,
            supplier: fuelStations[(vIdx + m) % fuelStations.length],
            paymentStatus: status,
            paymentDate: pDate,
            odometerReading: odoBase,
            remarks: `Trip Refill - KM reading ${odoBase}`,
            createdAt: `${yr}-${monthStr}-${dayStr}T11:00:00Z`,
          });
        });
      }

      // --- Maintenance Transactions (3-4 times a year per vehicle) ---
      const maintMonths = [2, 5, 8, 11];
      maintMonths.forEach((m) => {
        if (yr === 2026 && m > 9) return;
        const monthStr = m.toString().padStart(2, '0');
        const srv = serviceCategories[(vIdx + m) % serviceCategories.length];
        const variance = ((vIdx * 7 + m * 11) % 20) * 250;
        const amount = srv.avgCost + variance;
        const isRecent = yr === 2026 && m === 8;
        const status = isRecent ? 'Partial' : 'Paid';
        const paidAmt = isRecent ? Math.round(amount * 0.6) : amount;
        const dueAmt = amount - paidAmt;
        const pDate = isRecent ? `${yr}-08-28` : `${yr}-${monthStr}-25`;

        maintenance.push({
          id: `maint-${maintIdCounter++}`,
          date: `${yr}-${monthStr}-15`,
          vehicleNo: veh.vehicleNo,
          serviceType: srv.type as any,
          partsDescription: srv.desc,
          supplier: suppliers[(vIdx + m) % suppliers.length],
          quantity: 1,
          approvedAmount: amount,
          billNo: `INV-${yr}-${m * 30 + vIdx + 101}`,
          amount,
          paidAmount: paidAmt,
          dueAmount: dueAmt,
          paidDate: pDate,
          paymentStatus: status,
          remarks: isRecent ? 'Partial payment disbursed, balance due' : 'Approved by factory engineer',
          allocationType: 'Single',
          createdBy: 'Maintenance Supervisor',
          createdAt: `${yr}-${monthStr}-15T10:30:00Z`,
        });
      });

      // --- Paper / Document Renewals (1-2 per vehicle per year) ---
      // Fitness, Tax Token, Route Permit, Insurance
      const docTypes: ('Fitness' | 'Tax Token' | 'Insurance' | 'Route Permit')[] = [
        'Fitness',
        'Tax Token',
        'Insurance',
        'Route Permit',
      ];
      const docType = docTypes[(vIdx + yr) % docTypes.length];
      const renewalCost = docType === 'Fitness' ? 7500 : docType === 'Tax Token' ? 14500 : 8500;
      const renewMonth = (vIdx * 2 + 3) % 12 + 1;

      if (yr < 2026 || renewMonth <= 9) {
        const rMonthStr = renewMonth.toString().padStart(2, '0');
        renewals.push({
          id: `renew-${renewalIdCounter++}`,
          vehicleNo: veh.vehicleNo,
          documentType: docType,
          documentNumber: `BRTA-${docType.substring(0, 3).toUpperCase()}-${yr}-${vIdx * 50 + 120}`,
          expiryDate: `${yr + 1}-${rMonthStr}-15`, // Valid for 1 year
          renewalDate: `${yr}-${rMonthStr}-10`,
          renewalCost,
          supplier: docType === 'Insurance' ? 'Sadharan Bima Corp' : 'BRTA Mirpur Circle',
          paymentStatus: 'Paid',
          paidDate: `${yr}-${rMonthStr}-10`,
          remarks: `Annual mandatory ${docType} renewal fee`,
          createdAt: `${yr}-${rMonthStr}-10T09:00:00Z`,
        });
      }

      // --- Police Case / Fines (occasional: 1 every 1-2 years) ---
      if ((vIdx + yr) % 3 === 0) {
        const fineMonth = ((vIdx + 4) % 8) + 1;
        if (yr < 2026 || fineMonth <= 9) {
          const fineAmount = 2500;
          const isPending = yr === 2026;
          fines.push({
            id: `fine-${fineIdCounter++}`,
            date: `${yr}-0${fineMonth}-14`,
            vehicleNo: veh.vehicleNo,
            caseType: 'Signal Violation',
            caseNumber: `DMP-TRF-${yr}-99${vIdx}`,
            description: 'Traffic signal crossing during factory rush hour (Mohakhali flyover)',
            amount: fineAmount,
            paidAmount: isPending ? 0 : fineAmount,
            dueAmount: isPending ? fineAmount : 0,
            paymentStatus: isPending ? 'Due' : 'Paid',
            paidDate: isPending ? undefined : `${yr}-0${fineMonth}-18`,
            remarks: isPending ? 'Fine notice received, pending clearance' : 'E-challan paid via bKash/treasury',
            createdAt: `${yr}-0${fineMonth}-14T14:00:00Z`,
          });
        }
      }

      // --- Other Expenses (Washing, Parking, Emergency) ---
      const otherMonths = [3, 7, 10];
      otherMonths.forEach((om) => {
        if (yr === 2026 && om > 9) return;
        const oMonthStr = om.toString().padStart(2, '0');
        const oTypes = ['Washing', 'Parking', 'Toll', 'Accessories'] as const;
        const oType = oTypes[(vIdx + om) % oTypes.length];
        const oAmount = oType === 'Washing' ? 1200 : oType === 'Accessories' ? 3500 : 800;

        other.push({
          id: `oth-${otherIdCounter++}`,
          date: `${yr}-${oMonthStr}-20`,
          vehicleNo: veh.vehicleNo,
          expenseType: oType,
          description: `${oType} expense at factory depot / transit route`,
          supplier: 'Factory Local Petty Cash',
          billNo: `CSH-${yr}-${om * 10 + vIdx}`,
          amount: oAmount,
          paidAmount: oAmount,
          dueAmount: 0,
          paymentStatus: 'Paid',
          paidDate: `${yr}-${oMonthStr}-20`,
          remarks: 'Voucher cleared by transport manager',
          allocationType: 'Single',
          createdAt: `${yr}-${oMonthStr}-20T16:00:00Z`,
        });
      });
    });
  });

  return { maintenance, fuel, salaries, renewals, fines, other };
}

class StorageService {
  private get<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      console.error(`Failed to load ${key} from storage:`, e);
      return defaultVal;
    }
  }

  private set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(`Failed to save ${key} to storage:`, e);
    }
  }

  public init(): void {
    const isPurged = localStorage.getItem(STORAGE_KEYS.PURGED_FLAG);
    if (!isPurged) {
      // User explicitly commanded: "Dummy data remove koro sob"
      // Purge all old dummy data from localStorage immediately and start completely clean
      this.clearAllData();
      localStorage.setItem(STORAGE_KEYS.PURGED_FLAG, 'true');
    }
  }

  public clearAllData(): void {
    this.set(STORAGE_KEYS.VEHICLES, []);
    this.set(STORAGE_KEYS.SUPPLIERS, []);
    this.set(STORAGE_KEYS.MAINTENANCE, []);
    this.set(STORAGE_KEYS.FUEL, []);
    this.set(STORAGE_KEYS.SALARIES, []);
    this.set(STORAGE_KEYS.RENEWALS, []);
    this.set(STORAGE_KEYS.FINES, []);
    this.set(STORAGE_KEYS.OTHER, []);
    localStorage.removeItem(STORAGE_KEYS.SEEDED);
    localStorage.setItem(STORAGE_KEYS.PURGED_FLAG, 'true');
  }

  public loadSampleDemoData(): void {
    // Optional sample fleet for testing if the user explicitly clicks in Settings
    const sampleVehicles: Vehicle[] = [
      {
        id: 'veh-001',
        vehicleNo: 'DM-MA-11-52-39',
        vehicleType: 'Delivery Van',
        vehicleModel: 'Tata 407 LPT',
        driverName: 'Mohammad Rafiqul Islam',
        driverId: 'DRV-101',
        purchaseDate: '2021-06-15',
        status: 'Active',
        remarks: 'Zone-1 Factory Dispatch',
        createdAt: '2021-06-15T09:00:00Z',
      },
      {
        id: 'veh-002',
        vehicleNo: 'DM-MA-11-52-78',
        vehicleType: 'Delivery Van',
        vehicleModel: 'Tata 407 LPT',
        driverName: 'Abdul Karim',
        driverId: 'DRV-102',
        purchaseDate: '2021-07-20',
        status: 'Active',
        remarks: 'Zone-2 Depot Runner',
        createdAt: '2021-07-20T09:00:00Z',
      },
      {
        id: 'veh-003',
        vehicleNo: 'DM-MA-11-59-68',
        vehicleType: 'Pickup Truck',
        vehicleModel: 'Mahindra Bolero Maxi',
        driverName: 'Md. Shahjahan Miah',
        driverId: 'DRV-103',
        purchaseDate: '2022-01-10',
        status: 'Active',
        remarks: 'Factory Raw Material Transport',
        createdAt: '2022-01-10T09:00:00Z',
      },
      {
        id: 'veh-004',
        vehicleNo: 'DM-MA-11-59-69',
        vehicleType: 'Pickup Truck',
        vehicleModel: 'Mahindra Bolero Maxi',
        driverName: 'Nurul Huda',
        driverId: 'DRV-104',
        purchaseDate: '2022-01-10',
        status: 'Active',
        remarks: 'Factory Maintenance Vehicle',
        createdAt: '2022-01-10T09:00:00Z',
      },
      {
        id: 'veh-005',
        vehicleNo: 'DM-AU-13-09-93',
        vehicleType: 'Microbus / Passenger',
        vehicleModel: 'Toyota HiAce Super GL',
        driverName: 'Kamal Hossain',
        driverId: 'DRV-105',
        purchaseDate: '2020-03-12',
        status: 'Active',
        remarks: 'Staff & Executive Transport',
        createdAt: '2020-03-12T09:00:00Z',
      },
    ];

    const seed = generateHistoricalSeedData();
    this.set(STORAGE_KEYS.VEHICLES, sampleVehicles);
    this.set(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    this.set(STORAGE_KEYS.MAINTENANCE, seed.maintenance);
    this.set(STORAGE_KEYS.FUEL, seed.fuel);
    this.set(STORAGE_KEYS.SALARIES, seed.salaries);
    this.set(STORAGE_KEYS.RENEWALS, seed.renewals);
    this.set(STORAGE_KEYS.FINES, seed.fines);
    this.set(STORAGE_KEYS.OTHER, seed.other);
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []);
  }

  public getSupplierByName(name: string): Supplier | undefined {
    const clean = name.trim().toLowerCase();
    return this.getSuppliers().find((s) => s.name.trim().toLowerCase() === clean);
  }

  public saveSupplier(supplier: Supplier): { success: boolean; error?: string } {
    const list = this.getSuppliers();
    const cleanName = supplier.name.trim();
    if (!cleanName) {
      return { success: false, error: 'Supplier name cannot be empty.' };
    }

    const existingIdx = list.findIndex((s) => s.id === supplier.id);
    const dup = list.find(
      (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase() && s.id !== supplier.id
    );
    if (dup) {
      return { success: false, error: `Supplier "${cleanName}" already exists in the directory.` };
    }

    if (existingIdx >= 0) {
      list[existingIdx] = { ...supplier, name: cleanName };
    } else {
      list.push({ ...supplier, name: cleanName, createdAt: new Date().toISOString() });
    }

    this.set(STORAGE_KEYS.SUPPLIERS, list);
    return { success: true };
  }

  public deleteSupplier(id: string): { success: boolean; error?: string } {
    const list = this.getSuppliers().filter((s) => s.id !== id);
    this.set(STORAGE_KEYS.SUPPLIERS, list);
    return { success: true };
  }

  public addSupplierQuick(name: string, category: SupplierCategory = 'Workshop / Garage'): Supplier {
    const cleanName = name.trim();
    const existing = this.getSupplierByName(cleanName);
    if (existing) {
      return existing;
    }

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: cleanName,
      category,
      createdAt: new Date().toISOString(),
    };

    const list = this.getSuppliers();
    list.push(newSupplier);
    this.set(STORAGE_KEYS.SUPPLIERS, list);
    return newSupplier;
  }

  // --- Vehicles ---
  public getVehicles(): Vehicle[] {
    return this.get<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  }

  public getVehicleByNo(vehicleNo: string): Vehicle | undefined {
    const cleanNo = vehicleNo.trim().toUpperCase();
    return this.getVehicles().find((v) => v.vehicleNo.trim().toUpperCase() === cleanNo);
  }

  public saveVehicle(vehicle: Vehicle): { success: boolean; error?: string } {
    const list = this.getVehicles();
    const cleanNo = vehicle.vehicleNo.trim().toUpperCase();

    // Check unique vehicleNo
    const existingIndex = list.findIndex((v) => v.id === vehicle.id);
    const duplicateNo = list.find((v) => v.vehicleNo.trim().toUpperCase() === cleanNo && v.id !== vehicle.id);
    if (duplicateNo) {
      return { success: false, error: `Vehicle Number "${cleanNo}" already exists.` };
    }

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...vehicle,
        vehicleNo: cleanNo,
        updatedAt: new Date().toISOString(),
      };
    } else {
      list.push({
        ...vehicle,
        vehicleNo: cleanNo,
        createdAt: new Date().toISOString(),
      });
    }

    this.set(STORAGE_KEYS.VEHICLES, list);
    return { success: true };
  }

  public toggleVehicleStatus(id: string): void {
    const list = this.getVehicles();
    const v = list.find((item) => item.id === id);
    if (v) {
      v.status = v.status === 'Active' ? 'Inactive' : 'Active';
      v.updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.VEHICLES, list);
    }
  }

  // --- Maintenance ---
  public getMaintenance(): MaintenanceTransaction[] {
    return this.get<MaintenanceTransaction[]>(STORAGE_KEYS.MAINTENANCE, []);
  }

  public saveMaintenance(item: MaintenanceTransaction): void {
    if (item.supplier && item.supplier.trim()) {
      this.addSupplierQuick(item.supplier, 'Workshop / Garage');
    }
    const list = this.getMaintenance();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.MAINTENANCE, list);
  }

  public deleteMaintenance(id: string): void {
    const list = this.getMaintenance().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.MAINTENANCE, list);
  }

  // --- Fuel ---
  public getFuel(): FuelTransaction[] {
    return this.get<FuelTransaction[]>(STORAGE_KEYS.FUEL, []);
  }

  public saveFuel(item: FuelTransaction): void {
    if (item.supplier && item.supplier.trim()) {
      this.addSupplierQuick(item.supplier, 'Fuel Station / Pump');
    }
    const list = this.getFuel();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.FUEL, list);
  }

  public deleteFuel(id: string): void {
    const list = this.getFuel().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.FUEL, list);
  }

  // --- Driver Salaries ---
  public getSalaries(): DriverSalaryTransaction[] {
    return this.get<DriverSalaryTransaction[]>(STORAGE_KEYS.SALARIES, []);
  }

  public saveSalary(item: DriverSalaryTransaction): void {
    const list = this.getSalaries();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.SALARIES, list);
  }

  public deleteSalary(id: string): void {
    const list = this.getSalaries().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.SALARIES, list);
  }

  // --- Document Renewals ---
  public getRenewals(): DocumentRenewal[] {
    return this.get<DocumentRenewal[]>(STORAGE_KEYS.RENEWALS, []);
  }

  public saveRenewal(item: DocumentRenewal): void {
    if (item.supplier && item.supplier.trim()) {
      this.addSupplierQuick(item.supplier, 'Authority / Insurance');
    }
    const list = this.getRenewals();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.RENEWALS, list);
  }

  public deleteRenewal(id: string): void {
    const list = this.getRenewals().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.RENEWALS, list);
  }

  // --- Police Cases / Fines ---
  public getFines(): PoliceCase[] {
    return this.get<PoliceCase[]>(STORAGE_KEYS.FINES, []);
  }

  public saveFine(item: PoliceCase): void {
    const list = this.getFines();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.FINES, list);
  }

  public deleteFine(id: string): void {
    const list = this.getFines().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.FINES, list);
  }

  // --- Other Expenses ---
  public getOtherExpenses(): OtherExpense[] {
    return this.get<OtherExpense[]>(STORAGE_KEYS.OTHER, []);
  }

  public saveOtherExpense(item: OtherExpense): void {
    if (item.supplier && item.supplier.trim()) {
      this.addSupplierQuick(item.supplier, 'General');
    }
    const list = this.getOtherExpenses();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.OTHER, list);
  }

  public deleteOtherExpense(id: string): void {
    const list = this.getOtherExpenses().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.OTHER, list);
  }

  // --- Vehicle Monthly Income & Revenue ---
  public getIncomes(): VehicleMonthlyIncome[] {
    return this.get<VehicleMonthlyIncome[]>(STORAGE_KEYS.INCOMES, []);
  }

  public saveIncome(item: VehicleMonthlyIncome): void {
    const list = this.getIncomes();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    this.set(STORAGE_KEYS.INCOMES, list);
  }

  public deleteIncome(id: string): void {
    const list = this.getIncomes().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.INCOMES, list);
  }

  public bulkInsertIncomes(items: VehicleMonthlyIncome[]): number {
    const existing = this.getIncomes();
    this.set(STORAGE_KEYS.INCOMES, [...items, ...existing]);
    return items.length;
  }

  // --- Vehicle Monthly Distance / Mileage ---
  public getMileages(): VehicleMonthlyMileage[] {
    return this.get<VehicleMonthlyMileage[]>(STORAGE_KEYS.MILEAGES, []);
  }

  public saveMileage(item: VehicleMonthlyMileage): void {
    const list = this.getMileages();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...item, createdAt: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.MILEAGES, list);
  }

  public deleteMileage(id: string): void {
    const list = this.getMileages().filter((x) => x.id !== id);
    this.set(STORAGE_KEYS.MILEAGES, list);
  }

  public bulkInsertMileages(items: VehicleMonthlyMileage[]): number {
    const existing = this.getMileages();
    this.set(STORAGE_KEYS.MILEAGES, [...items, ...existing]);
    return items.length;
  }

  // Bulk import batch saves
  public bulkInsertMaintenance(items: MaintenanceTransaction[]): number {
    items.forEach((item) => {
      if (item.supplier && item.supplier.trim()) {
        this.addSupplierQuick(item.supplier, 'Workshop / Garage');
      }
    });
    const existing = this.getMaintenance();
    this.set(STORAGE_KEYS.MAINTENANCE, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertFuel(items: FuelTransaction[]): number {
    const existingVehicles = this.getVehicles();
    const existingVehicleMap = new Map<string, Vehicle>();
    existingVehicles.forEach((v) => {
      existingVehicleMap.set(v.vehicleNo.trim().toUpperCase(), v);
      existingVehicleMap.set(v.vehicleNo.toUpperCase().replace(/[^A-Z0-9]/g, ''), v);
    });

    const newVehicles: Vehicle[] = [];
    items.forEach((item) => {
      // 1. Auto-save supplier to Directory
      if (item.supplier && item.supplier.trim()) {
        this.addSupplierQuick(item.supplier, 'Fuel Station / Pump');
      }

      // 2. Auto-register vehicle in Vehicle Master if not present
      const cleanNo = item.vehicleNo.trim().toUpperCase();
      const normNo = cleanNo.replace(/[^A-Z0-9]/g, '');
      if (cleanNo && !existingVehicleMap.has(cleanNo) && !existingVehicleMap.has(normNo)) {
        const newV: Vehicle = {
          id: `veh-fuel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          vehicleNo: cleanNo,
          vehicleType: 'Fleet Vehicle',
          vehicleModel: 'Auto-registered from Fuel Log',
          driverName: 'Assigned Driver',
          purchaseDate: item.date || new Date().toISOString().substring(0, 10),
          status: 'Active',
          remarks: 'Auto-registered from imported Fuel slip history',
          createdAt: new Date().toISOString(),
        };
        newVehicles.push(newV);
        existingVehicleMap.set(cleanNo, newV);
        existingVehicleMap.set(normNo, newV);
      }
    });

    if (newVehicles.length > 0) {
      this.bulkInsertVehicles(newVehicles);
    }

    const existing = this.getFuel();
    this.set(STORAGE_KEYS.FUEL, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertSalaries(items: DriverSalaryTransaction[]): number {
    const existing = this.getSalaries();
    this.set(STORAGE_KEYS.SALARIES, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertRenewals(items: DocumentRenewal[]): number {
    items.forEach((item) => {
      if (item.supplier && item.supplier.trim()) {
        this.addSupplierQuick(item.supplier, 'Authority / Insurance');
      }
    });
    const existing = this.getRenewals();
    this.set(STORAGE_KEYS.RENEWALS, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertFines(items: PoliceCase[]): number {
    const existing = this.getFines();
    this.set(STORAGE_KEYS.FINES, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertOther(items: OtherExpense[]): number {
    items.forEach((item) => {
      if (item.supplier && item.supplier.trim()) {
        this.addSupplierQuick(item.supplier, 'General');
      }
    });
    const existing = this.getOtherExpenses();
    this.set(STORAGE_KEYS.OTHER, [...items, ...existing]);
    return items.length;
  }

  public bulkInsertVehicles(items: Vehicle[]): number {
    const existing = this.getVehicles();
    const newItems: Vehicle[] = [];
    items.forEach((item) => {
      const exists = existing.some((v) => v.vehicleNo.toUpperCase() === item.vehicleNo.toUpperCase());
      if (!exists) {
        newItems.push(item);
        existing.push(item);
      }
    });
    this.set(STORAGE_KEYS.VEHICLES, existing);
    return newItems.length;
  }

  // Quick payment settler for Supplier Invoices
  public settleSupplierBill(
    category: 'Maintenance' | 'Fuel' | 'Paper Renewal' | 'Other',
    id: string,
    paidAmount: number,
    paidDate: string
  ): void {
    if (category === 'Maintenance') {
      const list = this.getMaintenance();
      const item = list.find((x) => x.id === id);
      if (item) {
        item.paidAmount = Math.min(item.amount, item.paidAmount + paidAmount);
        item.dueAmount = Math.max(0, item.amount - item.paidAmount);
        item.paymentStatus = item.dueAmount === 0 ? 'Paid' : 'Partial';
        item.paidDate = paidDate;
        this.set(STORAGE_KEYS.MAINTENANCE, list);
      }
    } else if (category === 'Fuel') {
      const list = this.getFuel();
      const item = list.find((x) => x.id === id);
      if (item) {
        item.paymentStatus = 'Paid';
        item.paymentDate = paidDate;
        this.set(STORAGE_KEYS.FUEL, list);
      }
    } else if (category === 'Paper Renewal') {
      const list = this.getRenewals();
      const item = list.find((x) => x.id === id);
      if (item) {
        item.paymentStatus = 'Paid';
        item.paidDate = paidDate;
        this.set(STORAGE_KEYS.RENEWALS, list);
      }
    } else if (category === 'Other') {
      const list = this.getOtherExpenses();
      const item = list.find((x) => x.id === id);
      if (item) {
        item.paidAmount = Math.min(item.amount, item.paidAmount + paidAmount);
        item.dueAmount = Math.max(0, item.amount - item.paidAmount);
        item.paymentStatus = item.dueAmount === 0 ? 'Paid' : 'Partial';
        item.paidDate = paidDate;
        this.set(STORAGE_KEYS.OTHER, list);
      }
    }
  }

  // Complete Database Backup / Restore JSON
  public exportFullBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      vehicles: this.getVehicles(),
      suppliers: this.getSuppliers(),
      maintenance: this.getMaintenance(),
      fuel: this.getFuel(),
      salaries: this.getSalaries(),
      renewals: this.getRenewals(),
      fines: this.getFines(),
      other: this.getOtherExpenses(),
      incomes: this.getIncomes(),
      mileages: this.getMileages(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public importFullBackupJson(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.vehicles && Array.isArray(parsed.vehicles)) {
        this.set(STORAGE_KEYS.VEHICLES, parsed.vehicles);
        if (parsed.suppliers && Array.isArray(parsed.suppliers)) this.set(STORAGE_KEYS.SUPPLIERS, parsed.suppliers);
        if (parsed.maintenance) this.set(STORAGE_KEYS.MAINTENANCE, parsed.maintenance);
        if (parsed.fuel) this.set(STORAGE_KEYS.FUEL, parsed.fuel);
        if (parsed.salaries) this.set(STORAGE_KEYS.SALARIES, parsed.salaries);
        if (parsed.renewals) this.set(STORAGE_KEYS.RENEWALS, parsed.renewals);
        if (parsed.fines) this.set(STORAGE_KEYS.FINES, parsed.fines);
        if (parsed.other) this.set(STORAGE_KEYS.OTHER, parsed.other);
        if (parsed.incomes) this.set(STORAGE_KEYS.INCOMES, parsed.incomes);
        if (parsed.mileages) this.set(STORAGE_KEYS.MILEAGES, parsed.mileages);
        return { success: true, message: 'Database successfully restored from backup.' };
      }
      return { success: false, message: 'Invalid backup file structure.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to parse JSON file.' };
    }
  }
}

export const storage = new StorageService();
// initialize immediately on module load
storage.init();
