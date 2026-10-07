import * as XLSX from 'xlsx';
import {
  ImportModuleType,
  ImportPreviewResult,
  ValidationErrorItem,
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
  PaymentStatus,
  ServiceType,
  FuelType,
  DocumentType,
  FineType,
  OtherExpenseType,
} from '../types';

export class ExcelService {
  /**
   * Helper to normalize date strings (Excel serial numbers, YYYY-MM-DD, DD/MM/YYYY, etc.)
   */
  public static parseDate(raw: any): { dateStr: string; isValid: boolean } {
    if (raw === null || raw === undefined || raw === '') {
      return { dateStr: '', isValid: false };
    }

    // If it's an Excel serial date number
    if (typeof raw === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(raw);
        if (dateObj) {
          const y = dateObj.y.toString().padStart(4, '0');
          const m = dateObj.m.toString().padStart(2, '0');
          const d = dateObj.d.toString().padStart(2, '0');
          return { dateStr: `${y}-${m}-${d}`, isValid: true };
        }
      } catch (e) {
        // continue to string parsing
      }
    }

    const str = String(raw).trim();
    // Match YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-').map(Number);
      if (parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1 && parts[2] <= 31) {
        return { dateStr: str, isValid: true };
      }
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
        return { dateStr: `${y}-${m}-${d}`, isValid: true };
      }
    }

    // Native JS date parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = (parsed.getMonth() + 1).toString().padStart(2, '0');
      const d = parsed.getDate().toString().padStart(2, '0');
      return { dateStr: `${y}-${m}-${d}`, isValid: true };
    }

    return { dateStr: str, isValid: false };
  }

  /**
   * Helper to parse numeric values safely
   */
  public static parseNumber(raw: any, allowZero: boolean = true): { num: number; isValid: boolean } {
    if (raw === null || raw === undefined || raw === '') {
      return { num: 0, isValid: allowZero };
    }
    const cleanStr = String(raw).replace(/[,৳\s]/g, '');
    const num = Number(cleanStr);
    if (isNaN(num)) {
      return { num: 0, isValid: false };
    }
    if (!allowZero && num <= 0) {
      return { num, isValid: false };
    }
    if (num < 0) {
      return { num, isValid: false }; // Amounts & quantities cannot be negative
    }
    return { num, isValid: true };
  }

  /**
   * Standardizes column names (case-insensitive, trims, removes special characters)
   */
  private static findColumn(row: Record<string, any>, possibleNames: string[]): any {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const cleanTarget = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchKey = keys.find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget
      );
      if (matchKey && row[matchKey] !== undefined) {
        return row[matchKey];
      }
    }
    return undefined;
  }

  /**
   * Parse Raw File to JSON Rows
   */
  public static async readWorkbookRows(file: File): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false,
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Validate and Parse Maintenance rows
   */
  public static validateMaintenanceData(
    rawRows: Record<string, any>[],
    existingData: MaintenanceTransaction[],
    vehiclesList: Vehicle[]
  ): ImportPreviewResult<MaintenanceTransaction> {
    const validRows: MaintenanceTransaction[] = [];
    const duplicateRows: { row: number; data: MaintenanceTransaction; reason: string }[] = [];
    const invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[] = [];

    const existingKeys = new Set(
      existingData.map(
        (m) =>
          `${m.vehicleNo.trim().toUpperCase()}_${m.date}_${(m.billNo || '').trim().toUpperCase()}_${Math.round(m.amount)}`
      )
    );

    const vehicleNos = new Set(vehiclesList.map((v) => v.vehicleNo.trim().toUpperCase()));

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const errors: ValidationErrorItem[] = [];

      // Date column
      const rawDate = this.findColumn(row, ['date', 'servicedate', 'expensedate']);
      const parsedDate = this.parseDate(rawDate);
      if (!parsedDate.isValid || !parsedDate.dateStr) {
        errors.push({
          row: rowNum,
          field: 'DATE',
          message: 'Date is invalid or blank. Format must be YYYY-MM-DD or DD/MM/YYYY.',
          rawValue: rawDate,
        });
      }

      // Car No column
      const rawCarNo = this.findColumn(row, ['carno', 'vehicleno', 'vehicle', 'car_no', 'car']);
      const carNoStr = String(rawCarNo || '').trim().toUpperCase();
      const isShared = carNoStr === 'ALL' || carNoStr === 'SHARED' || carNoStr === 'MULTIPLE';

      if (!carNoStr) {
        errors.push({
          row: rowNum,
          field: 'CAR NO',
          message: 'Vehicle No cannot be blank.',
          rawValue: rawCarNo,
        });
      } else if (!isShared && !vehicleNos.has(carNoStr)) {
        errors.push({
          row: rowNum,
          field: 'CAR NO',
          message: `Vehicle No "${carNoStr}" does not exist in Vehicle Master. Please add vehicle first or verify number.`,
          rawValue: rawCarNo,
        });
      }

      // Amount
      const rawAmount = this.findColumn(row, ['amount', 'totalamount', 'total', 'billamount']);
      const parsedAmount = this.parseNumber(rawAmount, false);
      if (!parsedAmount.isValid || parsedAmount.num <= 0) {
        errors.push({
          row: rowNum,
          field: 'AMOUNT',
          message: 'Amount must be a positive numeric value.',
          rawValue: rawAmount,
        });
      }

      // Paid Amount
      const rawPaid = this.findColumn(row, ['paid', 'paidamount']);
      const parsedPaid = this.parseNumber(rawPaid, true);
      if (!parsedPaid.isValid) {
        errors.push({
          row: rowNum,
          field: 'PAID',
          message: 'Paid Amount must be numeric.',
          rawValue: rawPaid,
        });
      } else if (parsedPaid.num > parsedAmount.num) {
        errors.push({
          row: rowNum,
          field: 'PAID',
          message: `Paid Amount (৳${parsedPaid.num}) cannot exceed total bill Amount (৳${parsedAmount.num}).`,
          rawValue: rawPaid,
        });
      }

      // Service Type & Parts
      const rawServiceType = this.findColumn(row, ['servicetype', 'service_type', 'type']) || 'General Servicing';
      const rawParts = this.findColumn(row, ['parts', 'partsservice', 'parts_service', 'description', 'particulars']) || 'Servicing & Parts';
      const rawSupplier = this.findColumn(row, ['supplier', 'vendor', 'workshop']) || 'General Workshop';
      const rawBillNo = String(this.findColumn(row, ['billno', 'bill_no', 'invoiceno', 'invoice']) || `BILL-${Date.now()}-${idx}`).trim();
      const rawQty = this.parseNumber(this.findColumn(row, ['partsquantity', 'quantity', 'qty']), true).num || 1;
      const rawApproved = this.parseNumber(this.findColumn(row, ['approveamount', 'approvedamount', 'approved']), true).num || parsedAmount.num;

      const dueAmount = Math.max(0, parsedAmount.num - parsedPaid.num);
      let status: PaymentStatus = dueAmount === 0 ? 'Paid' : parsedPaid.num > 0 ? 'Partial' : 'Unpaid';
      const rawStatus = this.findColumn(row, ['status', 'paymentstatus']);
      if (rawStatus) {
        const cleanStatus = String(rawStatus).trim().toLowerCase();
        if (cleanStatus.includes('paid') && dueAmount === 0) status = 'Paid';
        else if (cleanStatus.includes('part')) status = 'Partial';
        else if (cleanStatus.includes('unpaid') || cleanStatus.includes('due')) status = 'Unpaid';
      }

      const rawPaidDate = this.findColumn(row, ['paiddate', 'paid_date', 'paymentdate']);
      const parsedPaidDate = rawPaidDate ? this.parseDate(rawPaidDate).dateStr : (status === 'Paid' ? parsedDate.dateStr : undefined);

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, data: row, errors });
        return;
      }

      const item: MaintenanceTransaction = {
        id: `maint-imp-${Date.now()}-${idx}`,
        date: parsedDate.dateStr,
        vehicleNo: isShared ? 'SHARED' : carNoStr,
        serviceType: (rawServiceType as ServiceType) || 'General Servicing',
        partsDescription: String(rawParts),
        supplier: String(rawSupplier),
        quantity: rawQty,
        approvedAmount: rawApproved,
        billNo: rawBillNo,
        amount: parsedAmount.num,
        paidAmount: parsedPaid.num,
        dueAmount,
        paidDate: parsedPaidDate,
        paymentStatus: status,
        remarks: isShared ? 'Shared vehicle expense' : (row.remarks || ''),
        allocationType: isShared ? 'All' : 'Single',
        allocatedVehicles: isShared ? vehiclesList.map((v) => v.vehicleNo) : undefined,
        createdAt: new Date().toISOString(),
      };

      // Duplicate Check
      const dedupeKey = `${item.vehicleNo.trim().toUpperCase()}_${item.date}_${item.billNo.trim().toUpperCase()}_${Math.round(item.amount)}`;
      if (existingKeys.has(dedupeKey)) {
        duplicateRows.push({
          row: rowNum,
          data: item,
          reason: `Duplicate Record: Transaction for Vehicle "${item.vehicleNo}" on ${item.date} with Bill No "${item.billNo}" and Amount ৳${item.amount} already exists.`,
        });
      } else {
        existingKeys.add(dedupeKey);
        validRows.push(item);
      }
    });

    return {
      moduleType: 'maintenance',
      totalRows: rawRows.length,
      validRows,
      duplicateRows,
      invalidRows,
    };
  }

  /**
   * Validate and Parse Fuel rows
   */
  public static validateFuelData(
    rawRows: Record<string, any>[],
    existingData: FuelTransaction[],
    vehiclesList: Vehicle[]
  ): ImportPreviewResult<FuelTransaction> {
    const validRows: FuelTransaction[] = [];
    const duplicateRows: { row: number; data: FuelTransaction; reason: string }[] = [];
    const invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[] = [];

    const existingKeys = new Set(
      existingData.map(
        (f) =>
          `${f.vehicleNo.trim().toUpperCase()}_${f.date}_${(f.slipNo || '').trim().toUpperCase()}_${Math.round(f.totalAmount)}`
      )
    );

    // Build vehicle map for exact and normalized lookups
    const vehicleMasterMap = new Map<string, string>();
    vehiclesList.forEach((v) => {
      const clean = v.vehicleNo.trim().toUpperCase();
      vehicleMasterMap.set(clean, clean);
      vehicleMasterMap.set(clean.replace(/[^A-Z0-9]/g, ''), clean);
    });

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const errors: ValidationErrorItem[] = [];

      // Date
      const rawDate = this.findColumn(row, [
        'date',
        'fueldate',
        'slipdate',
        'entrydate',
        'purchasedate',
        'fuel_date',
        'slip_date',
        'dateofrefill',
        'refilldate',
        'txndate',
      ]);
      const parsedDate = this.parseDate(rawDate);
      if (!parsedDate.isValid || !parsedDate.dateStr) {
        errors.push({
          row: rowNum,
          field: 'DATE',
          message: 'Date is invalid or blank. Format should be YYYY-MM-DD or DD/MM/YYYY.',
          rawValue: rawDate,
        });
      }

      // Car No / Vehicle No
      const rawCarNo = this.findColumn(row, [
        'carno',
        'vehicleno',
        'vehicle',
        'car_no',
        'car',
        'regno',
        'registrationno',
        'truckno',
        'truck_no',
        'carno.',
        'vehicle_no',
        'carnumber',
        'vehiclenumber',
      ]);
      const rawCarStr = String(rawCarNo || '').trim().toUpperCase();
      let matchedVehicleNo = rawCarStr;

      if (!rawCarStr) {
        errors.push({
          row: rowNum,
          field: 'CAR NO',
          message: 'Vehicle No cannot be blank.',
          rawValue: rawCarNo,
        });
      } else {
        const norm = rawCarStr.replace(/[^A-Z0-9]/g, '');
        if (vehicleMasterMap.has(rawCarStr)) {
          matchedVehicleNo = vehicleMasterMap.get(rawCarStr)!;
        } else if (vehicleMasterMap.has(norm)) {
          matchedVehicleNo = vehicleMasterMap.get(norm)!;
        } else {
          // If vehicle not in Master yet, use cleaned vehicle no and it will be auto-registered in Master
          matchedVehicleNo = rawCarStr;
          vehicleMasterMap.set(rawCarStr, rawCarStr);
          vehicleMasterMap.set(norm, rawCarStr);
        }
      }

      // Quantity / Litres
      const rawQty = this.findColumn(row, [
        'quantity',
        'qty',
        'litres',
        'liter',
        'liters',
        'ltr',
        'qtyltr',
        'qty(ltr)',
        'quantity(ltr)',
        'quantity(litres)',
        'gasqty',
        'volume',
      ]);
      const parsedQty = this.parseNumber(rawQty, false);
      if (!parsedQty.isValid || parsedQty.num <= 0) {
        errors.push({
          row: rowNum,
          field: 'QUANTITY',
          message: 'Quantity must be a positive numeric value (e.g. 50 or 45.5 litres).',
          rawValue: rawQty,
        });
      }

      // Unit Price or Total Price
      const rawUnitPrice = this.findColumn(row, [
        'unitprice',
        'unit_price',
        'rate',
        'price',
        'rate/ltr',
        'price/ltr',
        'rate(ltr)',
        'unitrate',
        'rateperlitre',
        'unitcost',
      ]);
      const rawTotal = this.findColumn(row, [
        'totalprice',
        'total_price',
        'total',
        'amount',
        'totalamount',
        'total_amount',
        'billamount',
        'cost',
        'netamount',
        'totalcost',
        'totalbill',
      ]);
      let unitPrice = this.parseNumber(rawUnitPrice, true).num;
      let totalAmount = this.parseNumber(rawTotal, true).num;

      if (totalAmount <= 0 && unitPrice > 0 && parsedQty.num > 0) {
        totalAmount = Math.round(unitPrice * parsedQty.num);
      } else if (unitPrice <= 0 && totalAmount > 0 && parsedQty.num > 0) {
        unitPrice = +(totalAmount / parsedQty.num).toFixed(2);
      } else if (totalAmount <= 0 && unitPrice <= 0) {
        errors.push({
          row: rowNum,
          field: 'TOTAL PRICE',
          message: 'Total Price or Unit Price must be provided and greater than 0.',
          rawValue: rawTotal || rawUnitPrice,
        });
      }

      const rawSlip = this.findColumn(row, [
        'slipno',
        'slip_no',
        'slno',
        'sl_no',
        'slip',
        'voucher',
        'voucherno',
        'voucher_no',
        'receipt',
        'billno',
        'memono',
        'memonumber',
        'slip#',
        'voucher#',
      ]);
      const slipNo = String(rawSlip || `SLIP-${parsedDate.dateStr || 'HIST'}-${idx + 1}`).trim();

      const rawItem = this.findColumn(row, [
        'item',
        'fueltype',
        'fuel_type',
        'fuel',
        'product',
        'oiltype',
        'type',
        'petrol/diesel',
        'fuelname',
      ]);
      let itemType: FuelType = 'Diesel';
      if (rawItem) {
        const cleanItem = String(rawItem).trim().toLowerCase();
        if (cleanItem.includes('oct')) itemType = 'Octane';
        else if (cleanItem.includes('pet')) itemType = 'Petrol';
        else if (cleanItem.includes('cng')) itemType = 'CNG';
        else if (cleanItem.includes('dies')) itemType = 'Diesel';
        else itemType = 'Other';
      }

      const rawSupplier = this.findColumn(row, [
        'supplier',
        'pump',
        'fuelstation',
        'station',
        'vendor',
        'pumpname',
        'petrolpump',
        'fillingstation',
        'fuelpump',
      ]);
      const supplier = String(rawSupplier || 'General Fuel Station').trim();

      const odo = this.parseNumber(
        this.findColumn(row, [
          'odometer',
          'odometerreading',
          'km',
          'kmreading',
          'meter',
          'reading',
          'odo',
          'currentkm',
        ]),
        true
      ).num;

      const rawStatus = this.findColumn(row, ['status', 'paymentstatus', 'paystatus', 'paid/unpaid']);
      let status: PaymentStatus = 'Paid';
      if (rawStatus) {
        const cleanStatus = String(rawStatus).trim().toLowerCase();
        if (cleanStatus.includes('unpaid') || cleanStatus.includes('due')) status = 'Unpaid';
      }

      const rawPayDate = this.findColumn(row, ['paymentdate', 'paiddate', 'payment_date', 'paid_date']);
      const parsedPayDate = rawPayDate ? this.parseDate(rawPayDate).dateStr : (status === 'Paid' ? parsedDate.dateStr : undefined);

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, data: row, errors });
        return;
      }

      const item: FuelTransaction = {
        id: `fuel-imp-${Date.now()}-${idx}`,
        date: parsedDate.dateStr,
        vehicleNo: matchedVehicleNo,
        fuelType: itemType,
        quantity: parsedQty.num,
        unitPrice: unitPrice > 0 ? unitPrice : +(totalAmount / parsedQty.num).toFixed(2),
        totalAmount,
        slipNo,
        supplier,
        paymentStatus: status,
        paymentDate: parsedPayDate,
        odometerReading: odo > 0 ? odo : undefined,
        remarks: row.remarks || '',
        createdAt: new Date().toISOString(),
      };

      const dedupeKey = `${item.vehicleNo.trim().toUpperCase()}_${item.date}_${item.slipNo.trim().toUpperCase()}_${Math.round(item.totalAmount)}`;
      if (existingKeys.has(dedupeKey)) {
        duplicateRows.push({
          row: rowNum,
          data: item,
          reason: `Duplicate Fuel Record: Vehicle "${item.vehicleNo}" on ${item.date} with Slip "${item.slipNo}" already exists in system.`,
        });
      } else {
        existingKeys.add(dedupeKey);
        validRows.push(item);
      }
    });

    return {
      moduleType: 'fuel',
      totalRows: rawRows.length,
      validRows,
      duplicateRows,
      invalidRows,
    };
  }

  /**
   * Validate and Parse Driver Salary rows
   */
  public static validateSalaryData(
    rawRows: Record<string, any>[],
    existingData: DriverSalaryTransaction[],
    vehiclesList: Vehicle[]
  ): ImportPreviewResult<DriverSalaryTransaction> {
    const validRows: DriverSalaryTransaction[] = [];
    const duplicateRows: { row: number; data: DriverSalaryTransaction; reason: string }[] = [];
    const invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[] = [];

    const existingKeys = new Set(
      existingData.map(
        (s) => `${s.vehicleNo.trim().toUpperCase()}_${s.year}_${s.month}`
      )
    );
    const vehicleNos = new Set(vehiclesList.map((v) => v.vehicleNo.trim().toUpperCase()));

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const errors: ValidationErrorItem[] = [];

      // Vehicle No
      const rawCarNo = this.findColumn(row, ['vehicleno', 'carno', 'vehicle', 'car_no']);
      const carNoStr = String(rawCarNo || '').trim().toUpperCase();
      if (!carNoStr) {
        errors.push({
          row: rowNum,
          field: 'VEHICLE NO',
          message: 'Vehicle No cannot be blank.',
          rawValue: rawCarNo,
        });
      } else if (!vehicleNos.has(carNoStr)) {
        errors.push({
          row: rowNum,
          field: 'VEHICLE NO',
          message: `Vehicle No "${carNoStr}" does not exist in master.`,
          rawValue: rawCarNo,
        });
      }

      // Month
      const rawMonth = this.findColumn(row, ['month']);
      let month = 0;
      if (typeof rawMonth === 'number') {
        month = rawMonth;
      } else {
        const mStr = String(rawMonth || '').toLowerCase().trim();
        const monthMap: Record<string, number> = {
          jan: 1, january: 1, '01': 1, '1': 1,
          feb: 2, february: 2, '02': 2, '2': 2,
          mar: 3, march: 3, '03': 3, '3': 3,
          apr: 4, april: 4, '04': 4, '4': 4,
          may: 5, '05': 5, '5': 5,
          jun: 6, june: 6, '06': 6, '6': 6,
          jul: 7, july: 7, '07': 7, '7': 7,
          aug: 8, august: 8, '08': 8, '8': 8,
          sep: 9, september: 9, '09': 9, '9': 9,
          oct: 10, october: 10, '10': 10,
          nov: 11, november: 11, '11': 11,
          dec: 12, december: 12, '12': 12,
        };
        month = monthMap[mStr] || parseInt(mStr, 10);
      }

      if (isNaN(month) || month < 1 || month > 12) {
        errors.push({
          row: rowNum,
          field: 'MONTH',
          message: 'Month must be between 1 and 12 (or Jan-Dec).',
          rawValue: rawMonth,
        });
      }

      // Year
      const rawYear = this.findColumn(row, ['year']);
      const year = parseInt(String(rawYear || ''), 10);
      if (isNaN(year) || year < 2000 || year > 2100) {
        errors.push({
          row: rowNum,
          field: 'YEAR',
          message: 'Year must be a valid 4-digit year (e.g. 2024).',
          rawValue: rawYear,
        });
      }

      // Basic Salary
      const rawBasic = this.findColumn(row, ['basicsalary', 'basic', 'salary']);
      const basicNum = this.parseNumber(rawBasic, false);
      if (!basicNum.isValid || basicNum.num <= 0) {
        errors.push({
          row: rowNum,
          field: 'BASIC SALARY',
          message: 'Basic Salary must be a positive number.',
          rawValue: rawBasic,
        });
      }

      const allowance = this.parseNumber(this.findColumn(row, ['allowance', 'allowances']), true).num;
      const overtime = this.parseNumber(this.findColumn(row, ['overtime', 'ot']), true).num;
      const otherPayment = this.parseNumber(this.findColumn(row, ['otherpayment', 'bonus', 'other']), true).num;
      const deduction = this.parseNumber(this.findColumn(row, ['deduction', 'deductions']), true).num;
      const netSalary = basicNum.num + allowance + overtime + otherPayment - deduction;

      const driverName = String(this.findColumn(row, ['drivername', 'driver', 'name']) || 'Assigned Driver');
      const driverId = String(this.findColumn(row, ['driverid', 'driver_id', 'id']) || '');

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, data: row, errors });
        return;
      }

      const item: DriverSalaryTransaction = {
        id: `sal-imp-${Date.now()}-${idx}`,
        month,
        year,
        driverName,
        driverId,
        vehicleNo: carNoStr,
        basicSalary: basicNum.num,
        allowance,
        overtime,
        otherPayment,
        deduction,
        netSalary,
        paymentStatus: 'Paid',
        paymentDate: `${year}-${month.toString().padStart(2, '0')}-28`,
        remarks: row.remarks || '',
        createdAt: new Date().toISOString(),
      };

      const dedupeKey = `${item.vehicleNo.trim().toUpperCase()}_${item.year}_${item.month}`;
      if (existingKeys.has(dedupeKey)) {
        duplicateRows.push({
          row: rowNum,
          data: item,
          reason: `Duplicate Salary: Salary record for Vehicle "${item.vehicleNo}" for ${month}/${year} already exists.`,
        });
      } else {
        existingKeys.add(dedupeKey);
        validRows.push(item);
      }
    });

    return {
      moduleType: 'salary',
      totalRows: rawRows.length,
      validRows,
      duplicateRows,
      invalidRows,
    };
  }

  /**
   * Validate and Parse Document Renewal rows
   */
  public static validatePaperRenewalData(
    rawRows: Record<string, any>[],
    existingData: DocumentRenewal[],
    vehiclesList: Vehicle[]
  ): ImportPreviewResult<DocumentRenewal> {
    const validRows: DocumentRenewal[] = [];
    const duplicateRows: { row: number; data: DocumentRenewal; reason: string }[] = [];
    const invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[] = [];

    const existingKeys = new Set(
      existingData.map(
        (r) => `${r.vehicleNo.trim().toUpperCase()}_${r.documentType.toUpperCase()}_${r.expiryDate}`
      )
    );
    const vehicleNos = new Set(vehiclesList.map((v) => v.vehicleNo.trim().toUpperCase()));

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const errors: ValidationErrorItem[] = [];

      const rawCarNo = this.findColumn(row, ['vehicleno', 'carno', 'vehicle', 'car_no']);
      const carNoStr = String(rawCarNo || '').trim().toUpperCase();
      if (!carNoStr) {
        errors.push({
          row: rowNum,
          field: 'VEHICLE NO',
          message: 'Vehicle No cannot be blank.',
          rawValue: rawCarNo,
        });
      } else if (!vehicleNos.has(carNoStr)) {
        errors.push({
          row: rowNum,
          field: 'VEHICLE NO',
          message: `Vehicle No "${carNoStr}" does not exist in master.`,
          rawValue: rawCarNo,
        });
      }

      const rawDocType = String(this.findColumn(row, ['documenttype', 'doctype', 'type']) || 'Fitness');
      const docNum = String(this.findColumn(row, ['documentnumber', 'docnumber', 'number', 'docno']) || 'REG-DOC');

      const rawExpiry = this.findColumn(row, ['expirydate', 'expiry']);
      const parsedExpiry = this.parseDate(rawExpiry);
      if (!parsedExpiry.isValid) {
        errors.push({
          row: rowNum,
          field: 'EXPIRY DATE',
          message: 'Expiry date is invalid or blank.',
          rawValue: rawExpiry,
        });
      }

      const rawRenewal = this.findColumn(row, ['renewaldate', 'date']);
      const parsedRenewal = this.parseDate(rawRenewal);
      if (!parsedRenewal.isValid) {
        errors.push({
          row: rowNum,
          field: 'RENEWAL DATE',
          message: 'Renewal date is invalid or blank.',
          rawValue: rawRenewal,
        });
      }

      const rawCost = this.findColumn(row, ['cost', 'renewalcost', 'amount', 'fee']);
      const parsedCost = this.parseNumber(rawCost, false);
      if (!parsedCost.isValid || parsedCost.num <= 0) {
        errors.push({
          row: rowNum,
          field: 'RENEWAL COST',
          message: 'Renewal cost must be a positive number.',
          rawValue: rawCost,
        });
      }

      const supplier = String(this.findColumn(row, ['supplier', 'authority', 'office']) || 'BRTA');

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, data: row, errors });
        return;
      }

      const item: DocumentRenewal = {
        id: `renew-imp-${Date.now()}-${idx}`,
        vehicleNo: carNoStr,
        documentType: (rawDocType as DocumentType) || 'Fitness',
        documentNumber: docNum,
        expiryDate: parsedExpiry.dateStr,
        renewalDate: parsedRenewal.dateStr,
        renewalCost: parsedCost.num,
        supplier,
        paymentStatus: 'Paid',
        paidDate: parsedRenewal.dateStr,
        remarks: row.remarks || '',
        createdAt: new Date().toISOString(),
      };

      const dedupeKey = `${item.vehicleNo.trim().toUpperCase()}_${item.documentType.toUpperCase()}_${item.expiryDate}`;
      if (existingKeys.has(dedupeKey)) {
        duplicateRows.push({
          row: rowNum,
          data: item,
          reason: `Duplicate Document Renewal: ${item.documentType} for ${item.vehicleNo} expiring ${item.expiryDate} already recorded.`,
        });
      } else {
        existingKeys.add(dedupeKey);
        validRows.push(item);
      }
    });

    return {
      moduleType: 'paper',
      totalRows: rawRows.length,
      validRows,
      duplicateRows,
      invalidRows,
    };
  }

  /**
   * Validate and Parse Vehicle Master rows
   */
  public static validateVehicleData(
    rawRows: Record<string, any>[],
    existingVehicles: Vehicle[]
  ): ImportPreviewResult<Vehicle> {
    const validRows: Vehicle[] = [];
    const duplicateRows: { row: number; data: Vehicle; reason: string }[] = [];
    const invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[] = [];

    const existingNos = new Set(existingVehicles.map((v) => v.vehicleNo.trim().toUpperCase()));

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const errors: ValidationErrorItem[] = [];

      const rawNo = this.findColumn(row, ['vehicleno', 'carno', 'vehicle', 'number']);
      const cleanNo = String(rawNo || '').trim().toUpperCase();
      if (!cleanNo) {
        errors.push({
          row: rowNum,
          field: 'VEHICLE NO',
          message: 'Vehicle No cannot be blank.',
          rawValue: rawNo,
        });
      }

      const type = String(this.findColumn(row, ['vehicletype', 'type', 'category']) || 'Delivery Van');
      const model = String(this.findColumn(row, ['vehiclemodel', 'model']) || 'Standard Model');
      const driver = String(this.findColumn(row, ['drivername', 'driver']) || 'Unassigned Driver');
      const driverId = String(this.findColumn(row, ['driverid', 'driver_id']) || '');
      const rawDate = this.findColumn(row, ['purchasedate', 'joiningdate', 'date']);
      const parsedDate = this.parseDate(rawDate);
      const purchaseDate = parsedDate.isValid ? parsedDate.dateStr : '2022-01-01';

      if (errors.length > 0) {
        invalidRows.push({ row: rowNum, data: row, errors });
        return;
      }

      const item: Vehicle = {
        id: `veh-imp-${Date.now()}-${idx}`,
        vehicleNo: cleanNo,
        vehicleType: type,
        vehicleModel: model,
        driverName: driver,
        driverId,
        purchaseDate,
        status: 'Active',
        remarks: row.remarks || '',
        createdAt: new Date().toISOString(),
      };

      if (existingNos.has(cleanNo)) {
        duplicateRows.push({
          row: rowNum,
          data: item,
          reason: `Vehicle No "${cleanNo}" is already registered in the Vehicle Master.`,
        });
      } else {
        existingNos.add(cleanNo);
        validRows.push(item);
      }
    });

    return {
      moduleType: 'vehicles',
      totalRows: rawRows.length,
      validRows,
      duplicateRows,
      invalidRows,
    };
  }

  /**
   * Generates downloadable error reports in XLSX
   */
  public static exportValidationErrorReport(
    moduleType: string,
    invalidRows: { row: number; data: any; errors: ValidationErrorItem[] }[],
    duplicateRows: { row: number; data: any; reason: string }[]
  ): void {
    const errorList: any[] = [];

    invalidRows.forEach((inv) => {
      inv.errors.forEach((err) => {
        errorList.push({
          'Excel Row': err.row,
          'Issue Type': 'Validation Error',
          'Field': err.field,
          'Error Message': err.message,
          'Raw Input': String(err.rawValue ?? ''),
        });
      });
    });

    duplicateRows.forEach((dup) => {
      errorList.push({
        'Excel Row': dup.row,
        'Issue Type': 'Duplicate Record',
        'Field': 'Deduplication Key',
        'Error Message': dup.reason,
        'Raw Input': JSON.stringify(dup.data),
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorList);
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
    XLSX.writeFile(wb, `${moduleType}_Import_Errors_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }

  /**
   * Generates sample import templates
   */
  public static downloadTemplate(moduleType: ImportModuleType): void {
    const wb = XLSX.utils.book_new();
    let templateData: any[] = [];
    let fileName = '';

    if (moduleType === 'maintenance') {
      fileName = 'Maintenance_Import_Template.xlsx';
      templateData = [
        {
          DATE: '2024-05-15',
          'CAR NO': 'DM-MA-11-52-39',
          'SERVICE TYPE': 'Brake System',
          'PARTS / SERVICE': 'Brake shoe & disc pad replace',
          SUPPLIER: 'Rahimafrooz Workshop',
          'PARTS QUANTITY': 1,
          'APPROVE AMOUNT': 9500,
          'BILL NO': 'INV-2024-102',
          AMOUNT: 9500,
          PAID: 9500,
          'PAID DATE': '2024-05-20',
          STATUS: 'Paid',
          REMARKS: 'Approved by factory transport officer',
        },
        {
          DATE: '2024-06-10',
          'CAR NO': 'ALL',
          'SERVICE TYPE': 'Tyre',
          'PARTS / SERVICE': 'TUBE FOR FIVE DELIVERY VAN',
          SUPPLIER: 'Bengal Tyre & Tube Center',
          'PARTS QUANTITY': 10,
          'APPROVE AMOUNT': 25000,
          'BILL NO': 'BTT-2024-889',
          AMOUNT: 25000,
          PAID: 25000,
          'PAID DATE': '2024-06-12',
          STATUS: 'Paid',
          REMARKS: 'Equal split across 5 factory vehicles',
        },
      ];
    } else if (moduleType === 'fuel') {
      fileName = 'Fuel_Import_Template.xlsx';
      templateData = [
        {
          DATE: '2024-06-01',
          'CAR NO': 'DM-MA-11-52-39',
          ITEM: 'Diesel',
          QUANTITY: 50,
          'SLIP NO': 'SLP-2024-401',
          'UNIT PRICE': 105,
          'TOTAL PRICE': 5250,
          SUPPLIER: 'Trust Filling Station, Tejgaon',
          STATUS: 'Paid',
          'PAYMENT DATE': '2024-06-01',
        },
      ];
    } else if (moduleType === 'salary') {
      fileName = 'Driver_Salary_Import_Template.xlsx';
      templateData = [
        {
          MONTH: 6,
          YEAR: 2024,
          'DRIVER NAME': 'Mohammad Rafiqul Islam',
          'DRIVER ID': 'DRV-101',
          'VEHICLE NO': 'DM-MA-11-52-39',
          'BASIC SALARY': 20000,
          ALLOWANCE: 3500,
          OVERTIME: 2500,
          'OTHER PAYMENT': 2000,
          DEDUCTION: 500,
          STATUS: 'Paid',
          REMARKS: 'June payroll with festival bonus',
        },
      ];
    } else if (moduleType === 'paper') {
      fileName = 'Document_Renewal_Import_Template.xlsx';
      templateData = [
        {
          'VEHICLE NO': 'DM-MA-11-52-39',
          'DOCUMENT TYPE': 'Fitness',
          'DOCUMENT NUMBER': 'BRTA-FIT-2024-912',
          'RENEWAL DATE': '2024-04-10',
          'EXPIRY DATE': '2025-04-10',
          COST: 7500,
          AUTHORITY: 'BRTA Mirpur Circle',
          STATUS: 'Paid',
          REMARKS: 'Annual fitness certificate',
        },
      ];
    } else if (moduleType === 'vehicles') {
      fileName = 'Vehicle_Master_Import_Template.xlsx';
      templateData = [
        {
          'VEHICLE NO': 'DM-MA-11-52-39',
          'VEHICLE TYPE': 'Delivery Van',
          'VEHICLE MODEL': 'Tata 407 LPT',
          'DRIVER NAME': 'Mohammad Rafiqul Islam',
          'DRIVER ID': 'DRV-101',
          'PURCHASE DATE': '2021-06-15',
          STATUS: 'Active',
          REMARKS: 'Zone-1 North Dhaka Factory Dispatch',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Generic Excel Exporter for reports
   */
  public static exportToExcel(sheets: { sheetName: string; data: any[] }[], fileName: string): void {
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => {
      const ws = XLSX.utils.json_to_sheet(s.data);
      XLSX.utils.book_append_sheet(wb, ws, s.sheetName.substring(0, 31));
    });
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().substring(0, 10)}.xlsx`);
  }
}
