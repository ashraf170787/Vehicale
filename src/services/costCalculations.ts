import {
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
  VehicleCategoryCost,
  VehicleYearlyCostRow,
  MonthCostBreakdown,
  SupplierFollowUpItem,
  VehicleMonthlyIncome,
  MonthlyProfitLossRow,
  MonthlyFleetProfitSummary,
  VehicleMonthlyMileage,
  CostPerKmRow,
  FleetCostPerKmSummary,
} from '../types';

export function formatBDT(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '৳ 0';
  }
  // Bangladeshi number formatting with commas
  const rounded = Math.round(amount);
  return '৳ ' + rounded.toLocaleString('en-IN');
}

export function formatRate(amount: number, decimals: number = 2): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '৳ 0.00';
  }
  return '৳ ' + amount.toFixed(decimals);
}

export function parseYearFromDate(dateStr: string): number {
  if (!dateStr) return new Date().getFullYear();
  const yr = parseInt(dateStr.substring(0, 4), 10);
  return isNaN(yr) ? new Date().getFullYear() : yr;
}

export function parseMonthFromDate(dateStr: string): number {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10);
    return isNaN(m) ? 1 : m;
  }
  return 1;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || `Month ${monthNumber}`;
}

export interface ComprehensiveDataset {
  vehicles: Vehicle[];
  maintenance: MaintenanceTransaction[];
  fuel: FuelTransaction[];
  salaries: DriverSalaryTransaction[];
  renewals: DocumentRenewal[];
  fines: PoliceCase[];
  other: OtherExpense[];
  incomes?: VehicleMonthlyIncome[];
  mileages?: VehicleMonthlyMileage[];
}

export class CostCalculationService {
  /**
   * Dynamically discover all unique years present across all datasets
   */
  public static getAllAvailableYears(data: ComprehensiveDataset): number[] {
    const yearSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearSet.add(currentYear);

    data.maintenance.forEach((m) => yearSet.add(parseYearFromDate(m.date)));
    data.fuel.forEach((f) => yearSet.add(parseYearFromDate(f.date)));
    data.salaries.forEach((s) => yearSet.add(s.year));
    data.renewals.forEach((r) => yearSet.add(parseYearFromDate(r.renewalDate)));
    data.fines.forEach((f) => yearSet.add(parseYearFromDate(f.date)));
    data.other.forEach((o) => yearSet.add(parseYearFromDate(o.date)));

    return Array.from(yearSet).sort((a, b) => a - b);
  }

  /**
   * Calculate exact allocated cost for a vehicle from a Maintenance record
   */
  public static getMaintenanceAllocatedCostForVehicle(
    m: MaintenanceTransaction,
    vehicleNo: string
  ): number {
    const targetNo = vehicleNo.trim().toUpperCase();

    // Check shared allocation
    if (m.allocationType === 'All' || m.allocationType === 'Multiple') {
      if (m.allocatedShares && m.allocatedShares[targetNo] !== undefined) {
        return m.allocatedShares[targetNo];
      }
      if (m.allocatedVehicles && m.allocatedVehicles.map((v) => v.toUpperCase()).includes(targetNo)) {
        return m.amount / m.allocatedVehicles.length;
      }
      return 0;
    }

    // Single vehicle allocation
    if (m.vehicleNo.trim().toUpperCase() === targetNo) {
      return m.amount;
    }

    return 0;
  }

  /**
   * Calculate exact allocated cost for a vehicle from an OtherExpense record
   */
  public static getOtherExpenseAllocatedCostForVehicle(
    o: OtherExpense,
    vehicleNo: string
  ): number {
    const targetNo = vehicleNo.trim().toUpperCase();

    if (o.allocationType === 'All' || o.allocationType === 'Multiple') {
      if (o.allocatedShares && o.allocatedShares[targetNo] !== undefined) {
        return o.allocatedShares[targetNo];
      }
      if (o.allocatedVehicles && o.allocatedVehicles.map((v) => v.toUpperCase()).includes(targetNo)) {
        return o.amount / o.allocatedVehicles.length;
      }
      return 0;
    }

    if (o.vehicleNo.trim().toUpperCase() === targetNo) {
      return o.amount;
    }

    return 0;
  }

  /**
   * Vehicle Cost Breakdown for a specific vehicle and specific year
   */
  public static getVehicleYearlyBreakdown(
    vehicleNo: string,
    year: number,
    data: ComprehensiveDataset
  ): VehicleCategoryCost {
    const targetNo = vehicleNo.trim().toUpperCase();

    // 1. Maintenance
    let maintenanceTotal = 0;
    data.maintenance.forEach((m) => {
      if (parseYearFromDate(m.date) === year) {
        maintenanceTotal += this.getMaintenanceAllocatedCostForVehicle(m, targetNo);
      }
    });

    // 2. Fuel
    let fuelTotal = 0;
    data.fuel.forEach((f) => {
      if (f.vehicleNo.trim().toUpperCase() === targetNo && parseYearFromDate(f.date) === year) {
        fuelTotal += f.totalAmount;
      }
    });

    // 3. Driver Salary
    let salaryTotal = 0;
    data.salaries.forEach((s) => {
      if (s.vehicleNo.trim().toUpperCase() === targetNo && s.year === year) {
        salaryTotal += s.netSalary;
      }
    });

    // 4. Paper Renewal
    let paperTotal = 0;
    data.renewals.forEach((r) => {
      if (r.vehicleNo.trim().toUpperCase() === targetNo && parseYearFromDate(r.renewalDate) === year) {
        paperTotal += r.renewalCost;
      }
    });

    // 5. Police Cases / Fines
    let fineTotal = 0;
    data.fines.forEach((f) => {
      if (f.vehicleNo.trim().toUpperCase() === targetNo && parseYearFromDate(f.date) === year) {
        fineTotal += f.amount;
      }
    });

    // 6. Other Expenses
    let otherTotal = 0;
    data.other.forEach((o) => {
      if (parseYearFromDate(o.date) === year) {
        otherTotal += this.getOtherExpenseAllocatedCostForVehicle(o, targetNo);
      }
    });

    const total =
      maintenanceTotal + fuelTotal + salaryTotal + paperTotal + fineTotal + otherTotal;

    return {
      maintenance: Math.round(maintenanceTotal),
      fuel: Math.round(fuelTotal),
      salary: Math.round(salaryTotal),
      paperRenewal: Math.round(paperTotal),
      policeFine: Math.round(fineTotal),
      other: Math.round(otherTotal),
      total: Math.round(total),
    };
  }

  /**
   * Generates the Master Yearly Cost Matrix Table:
   * Vehicle No | 2022 | 2023 | 2024 | 2025 | 2026 | ... | Total
   */
  public static getMasterYearlyMatrix(
    data: ComprehensiveDataset,
    years: number[]
  ): VehicleYearlyCostRow[] {
    const rows: VehicleYearlyCostRow[] = [];

    data.vehicles.forEach((v) => {
      const yearlyTotals: Record<number, number> = {};
      let grandTotal = 0;

      years.forEach((yr) => {
        const cost = this.getVehicleYearlyBreakdown(v.vehicleNo, yr, data);
        yearlyTotals[yr] = cost.total;
        grandTotal += cost.total;
      });

      rows.push({
        vehicleId: v.id,
        vehicleNo: v.vehicleNo,
        vehicleType: v.vehicleType,
        vehicleModel: v.vehicleModel,
        status: v.status,
        driverName: v.driverName,
        yearlyTotals,
        grandTotal,
      });
    });

    return rows;
  }

  /**
   * Monthly Cost Breakdown for a specific year.
   * Can be for "All Vehicles" or a specific vehicle.
   */
  public static getMonthlyCostBreakdown(
    year: number,
    selectedVehicleNo: string | 'ALL',
    data: ComprehensiveDataset
  ): MonthCostBreakdown[] {
    const isAll = selectedVehicleNo === 'ALL';
    const targetNo = selectedVehicleNo.trim().toUpperCase();

    const monthlyRows: MonthCostBreakdown[] = [];

    for (let m = 1; m <= 12; m++) {
      let maint = 0;
      let fuel = 0;
      let salary = 0;
      let paper = 0;
      let fine = 0;
      let other = 0;

      // Maintenance
      data.maintenance.forEach((item) => {
        if (parseYearFromDate(item.date) === year && parseMonthFromDate(item.date) === m) {
          if (isAll) {
            maint += item.amount;
          } else {
            maint += this.getMaintenanceAllocatedCostForVehicle(item, targetNo);
          }
        }
      });

      // Fuel
      data.fuel.forEach((item) => {
        if (parseYearFromDate(item.date) === year && parseMonthFromDate(item.date) === m) {
          if (isAll || item.vehicleNo.trim().toUpperCase() === targetNo) {
            fuel += item.totalAmount;
          }
        }
      });

      // Salary
      data.salaries.forEach((item) => {
        if (item.year === year && item.month === m) {
          if (isAll || item.vehicleNo.trim().toUpperCase() === targetNo) {
            salary += item.netSalary;
          }
        }
      });

      // Paper
      data.renewals.forEach((item) => {
        if (parseYearFromDate(item.renewalDate) === year && parseMonthFromDate(item.renewalDate) === m) {
          if (isAll || item.vehicleNo.trim().toUpperCase() === targetNo) {
            paper += item.renewalCost;
          }
        }
      });

      // Fine
      data.fines.forEach((item) => {
        if (parseYearFromDate(item.date) === year && parseMonthFromDate(item.date) === m) {
          if (isAll || item.vehicleNo.trim().toUpperCase() === targetNo) {
            fine += item.amount;
          }
        }
      });

      // Other
      data.other.forEach((item) => {
        if (parseYearFromDate(item.date) === year && parseMonthFromDate(item.date) === m) {
          if (isAll) {
            other += item.amount;
          } else {
            other += this.getOtherExpenseAllocatedCostForVehicle(item, targetNo);
          }
        }
      });

      monthlyRows.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        maintenance: Math.round(maint),
        fuel: Math.round(fuel),
        salary: Math.round(salary),
        paperRenewal: Math.round(paper),
        policeFine: Math.round(fine),
        other: Math.round(other),
        total: Math.round(maint + fuel + salary + paper + fine + other),
      });
    }

    return monthlyRows;
  }

  /**
   * Supplier Follow-up Item list builder
   */
  public static getSupplierFollowUpItems(data: ComprehensiveDataset): SupplierFollowUpItem[] {
    const list: SupplierFollowUpItem[] = [];

    // Maintenance bills
    data.maintenance.forEach((m) => {
      const balance = Math.max(0, m.amount - m.paidAmount);
      list.push({
        id: m.id,
        supplier: m.supplier || 'Unknown Supplier',
        billNo: m.billNo || 'N/A',
        vehicleNo: m.vehicleNo,
        expenseCategory: 'Maintenance',
        date: m.date,
        amount: m.amount,
        paidAmount: m.paidAmount,
        balance,
        status: balance === 0 ? 'Paid' : m.paidAmount > 0 ? 'Partial' : 'Due',
        paidDate: m.paidDate,
      });
    });

    // Fuel slips
    data.fuel.forEach((f) => {
      const isPaid = f.paymentStatus === 'Paid';
      list.push({
        id: f.id,
        supplier: f.supplier || 'Filling Station',
        billNo: f.slipNo || 'N/A',
        vehicleNo: f.vehicleNo,
        expenseCategory: 'Fuel',
        date: f.date,
        amount: f.totalAmount,
        paidAmount: isPaid ? f.totalAmount : 0,
        balance: isPaid ? 0 : f.totalAmount,
        status: isPaid ? 'Paid' : 'Due',
        paidDate: f.paymentDate,
      });
    });

    // Other Expenses with bills
    data.other.forEach((o) => {
      const balance = Math.max(0, o.amount - o.paidAmount);
      list.push({
        id: o.id,
        supplier: o.supplier || 'Vendor / Workshop',
        billNo: o.billNo || 'N/A',
        vehicleNo: o.vehicleNo,
        expenseCategory: 'Other',
        date: o.date,
        amount: o.amount,
        paidAmount: o.paidAmount,
        balance,
        status: balance === 0 ? 'Paid' : o.paidAmount > 0 ? 'Partial' : 'Due',
        paidDate: o.paidDate,
      });
    });

    // Paper renewals
    data.renewals.forEach((r) => {
      const isPaid = r.paymentStatus === 'Paid';
      list.push({
        id: r.id,
        supplier: r.supplier || 'BRTA / Insurance Authority',
        billNo: r.documentNumber || 'N/A',
        vehicleNo: r.vehicleNo,
        expenseCategory: 'Paper Renewal',
        date: r.renewalDate,
        amount: r.renewalCost,
        paidAmount: isPaid ? r.renewalCost : 0,
        balance: isPaid ? 0 : r.renewalCost,
        status: isPaid ? 'Paid' : 'Due',
        paidDate: r.paidDate,
      });
    });

    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }

  /**
   * Calculates Monthly Profit & Loss per vehicle for a selected Year and Month
   */
  public static calculateMonthlyProfitLossRows(
    data: ComprehensiveDataset,
    year: number,
    month?: number
  ): MonthlyProfitLossRow[] {
    const vehicles = data.vehicles;
    const incomes = data.incomes || [];
    const rows: MonthlyProfitLossRow[] = [];

    // Helper to check year/month match
    const matchesPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const y = parseYearFromDate(dateStr);
      if (y !== year) return false;
      if (month !== undefined && month !== null && month > 0) {
        const m = parseMonthFromDate(dateStr);
        if (m !== month) return false;
      }
      return true;
    };

    const matchesSalaryPeriod = (salYear: number, salMonth: number) => {
      if (salYear !== year) return false;
      if (month !== undefined && month !== null && month > 0) {
        if (salMonth !== month) return false;
      }
      return true;
    };

    // Calculate per vehicle
    vehicles.forEach((v) => {
      const vNo = v.vehicleNo.trim().toUpperCase();

      // 1. Income for this vehicle in this period
      const vIncomes = incomes.filter(
        (inc) =>
          inc.vehicleNo.trim().toUpperCase() === vNo &&
          inc.year === year &&
          (month === undefined || month === null || month === 0 || inc.month === month)
      );
      const totalRevenue = vIncomes.reduce((sum, inc) => sum + (inc.totalIncome || 0), 0);
      const receivedRevenue = vIncomes.reduce((sum, inc) => sum + (inc.receivedAmount || 0), 0);
      const dueRevenue = vIncomes.reduce((sum, inc) => sum + (inc.dueAmount || 0), 0);

      // 2. Fuel Expenses
      const fuelCost = data.fuel
        .filter((f) => f.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(f.date))
        .reduce((sum, f) => sum + (f.totalAmount || 0), 0);

      // 3. Maintenance Expenses (direct + allocated share)
      let maintenanceCost = 0;
      data.maintenance.forEach((m) => {
        if (!matchesPeriod(m.date)) return;
        if (m.vehicleNo.trim().toUpperCase() === vNo) {
          maintenanceCost += m.amount;
        } else if (
          m.vehicleNo === 'SHARED' &&
          m.allocatedShares &&
          m.allocatedShares[v.vehicleNo]
        ) {
          maintenanceCost += m.allocatedShares[v.vehicleNo];
        }
      });

      // 4. Driver Salary
      const salaryCost = data.salaries
        .filter((s) => s.vehicleNo.trim().toUpperCase() === vNo && matchesSalaryPeriod(s.year, s.month))
        .reduce((sum, s) => sum + (s.netSalary || 0), 0);

      // 5. Paper Renewal
      const paperCost = data.renewals
        .filter((r) => r.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(r.renewalDate))
        .reduce((sum, r) => sum + (r.renewalCost || 0), 0);

      // 6. Police Fines
      const fineCost = data.fines
        .filter((f) => f.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(f.date))
        .reduce((sum, f) => sum + (f.amount || 0), 0);

      // 7. Other Expenses
      let otherCost = 0;
      data.other.forEach((o) => {
        if (!matchesPeriod(o.date)) return;
        if (o.vehicleNo.trim().toUpperCase() === vNo) {
          otherCost += o.amount;
        } else if (
          o.vehicleNo === 'SHARED' &&
          o.allocatedShares &&
          o.allocatedShares[v.vehicleNo]
        ) {
          otherCost += o.allocatedShares[v.vehicleNo];
        }
      });

      const totalExpense = fuelCost + maintenanceCost + salaryCost + paperCost + fineCost + otherCost;
      const netProfit = totalRevenue - totalExpense;
      const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const profitStatus = netProfit > 0 ? 'Profit' : netProfit < 0 ? 'Loss' : 'Break-Even';

      rows.push({
        vehicleId: v.id,
        vehicleNo: v.vehicleNo,
        vehicleType: v.vehicleType,
        vehicleModel: v.vehicleModel,
        driverName: v.driverName,
        status: v.status,
        month: month || 0,
        year,
        totalRevenue,
        receivedRevenue,
        dueRevenue,
        fuelCost,
        maintenanceCost,
        salaryCost,
        paperCost,
        fineCost,
        otherCost,
        totalExpense,
        netProfit,
        profitMarginPercent,
        profitStatus,
      });
    });

    return rows.sort((a, b) => b.netProfit - a.netProfit);
  }

  /**
   * Calculates Monthly Fleet Profit Summary for executive dashboard
   */
  public static calculateMonthlyFleetProfitSummary(
    data: ComprehensiveDataset,
    year: number,
    month?: number
  ): MonthlyFleetProfitSummary {
    const rows = this.calculateMonthlyProfitLossRows(data, year, month);

    let totalRevenue = 0;
    let receivedRevenue = 0;
    let dueRevenue = 0;
    let fuel = 0;
    let maintenance = 0;
    let salary = 0;
    let paperRenewal = 0;
    let policeFine = 0;
    let other = 0;
    let profitableCount = 0;
    let lossCount = 0;

    rows.forEach((r) => {
      totalRevenue += r.totalRevenue;
      receivedRevenue += r.receivedRevenue;
      dueRevenue += r.dueRevenue;
      fuel += r.fuelCost;
      maintenance += r.maintenanceCost;
      salary += r.salaryCost;
      paperRenewal += r.paperCost;
      policeFine += r.fineCost;
      other += r.otherCost;

      if (r.netProfit > 0) profitableCount++;
      else if (r.netProfit < 0) lossCount++;
    });

    const totalExpense = fuel + maintenance + salary + paperRenewal + policeFine + other;
    const netProfit = totalRevenue - totalExpense;
    const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      month: month || 0,
      year,
      totalRevenue,
      receivedRevenue,
      dueRevenue,
      totalExpense,
      expenseBreakdown: {
        fuel,
        maintenance,
        salary,
        paperRenewal,
        policeFine,
        other,
      },
      netProfit,
      profitMarginPercent,
      profitableVehiclesCount: profitableCount,
      lossVehiclesCount: lossCount,
      totalVehiclesCount: rows.length,
    };
  }

  /**
   * Calculates Cost Per KM (CPK) metrics for each vehicle for selected Year & Month
   */
  public static calculateCostPerKmRows(
    data: ComprehensiveDataset,
    year: number,
    month?: number
  ): CostPerKmRow[] {
    const vehicles = data.vehicles;
    const mileages = data.mileages || [];
    const incomes = data.incomes || [];
    const rows: CostPerKmRow[] = [];

    const matchesPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const y = parseYearFromDate(dateStr);
      if (y !== year) return false;
      if (month !== undefined && month !== null && month > 0) {
        const m = parseMonthFromDate(dateStr);
        if (m !== month) return false;
      }
      return true;
    };

    const matchesSalaryPeriod = (salYear: number, salMonth: number) => {
      if (salYear !== year) return false;
      if (month !== undefined && month !== null && month > 0) {
        if (salMonth !== month) return false;
      }
      return true;
    };

    vehicles.forEach((v) => {
      const vNo = v.vehicleNo.trim().toUpperCase();

      // 1. Total KM Run
      // Look up logged monthly mileage
      const vMileages = mileages.filter(
        (ml) =>
          ml.vehicleNo.trim().toUpperCase() === vNo &&
          ml.year === year &&
          (month === undefined || month === null || month === 0 || ml.month === month)
      );
      const totalKmRun = vMileages.reduce((sum, ml) => sum + (ml.totalKmRun || 0), 0);

      // 2. Fuel transactions & litres
      const vFuels = data.fuel.filter(
        (f) => f.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(f.date)
      );
      const fuelCost = vFuels.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
      const totalFuelLitres = vFuels.reduce((sum, f) => sum + (f.quantity || 0), 0);
      const fuelMileageKmpL =
        totalKmRun > 0 && totalFuelLitres > 0 ? totalKmRun / totalFuelLitres : 0;

      // 3. Maintenance Cost (direct + shared)
      let maintenanceCost = 0;
      data.maintenance.forEach((m) => {
        if (!matchesPeriod(m.date)) return;
        if (m.vehicleNo.trim().toUpperCase() === vNo) {
          maintenanceCost += m.amount;
        } else if (
          m.vehicleNo === 'SHARED' &&
          m.allocatedShares &&
          m.allocatedShares[v.vehicleNo]
        ) {
          maintenanceCost += m.allocatedShares[v.vehicleNo];
        }
      });

      // 4. Driver Salary
      const salaryCost = data.salaries
        .filter((s) => s.vehicleNo.trim().toUpperCase() === vNo && matchesSalaryPeriod(s.year, s.month))
        .reduce((sum, s) => sum + (s.netSalary || 0), 0);

      // 5. Paper & Fines
      const paperCost = data.renewals
        .filter((r) => r.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(r.renewalDate))
        .reduce((sum, r) => sum + (r.renewalCost || 0), 0);

      const fineCost = data.fines
        .filter((f) => f.vehicleNo.trim().toUpperCase() === vNo && matchesPeriod(f.date))
        .reduce((sum, f) => sum + (f.amount || 0), 0);

      const paperAndFineCost = paperCost + fineCost;

      // 6. Other Expenses
      let otherCost = 0;
      data.other.forEach((o) => {
        if (!matchesPeriod(o.date)) return;
        if (o.vehicleNo.trim().toUpperCase() === vNo) {
          otherCost += o.amount;
        } else if (
          o.vehicleNo === 'SHARED' &&
          o.allocatedShares &&
          o.allocatedShares[v.vehicleNo]
        ) {
          otherCost += o.allocatedShares[v.vehicleNo];
        }
      });

      const totalCost = fuelCost + maintenanceCost + salaryCost + paperAndFineCost + otherCost;

      // 7. Per KM calculations
      const fuelCostPerKm = totalKmRun > 0 ? fuelCost / totalKmRun : 0;
      const maintenanceCostPerKm = totalKmRun > 0 ? maintenanceCost / totalKmRun : 0;
      const salaryCostPerKm = totalKmRun > 0 ? salaryCost / totalKmRun : 0;
      const otherCostPerKm = totalKmRun > 0 ? (paperAndFineCost + otherCost) / totalKmRun : 0;
      const totalCostPerKm = totalKmRun > 0 ? totalCost / totalKmRun : 0;

      // 8. Revenue & Profit per KM
      const vIncomes = incomes.filter(
        (inc) =>
          inc.vehicleNo.trim().toUpperCase() === vNo &&
          inc.year === year &&
          (month === undefined || month === null || month === 0 || inc.month === month)
      );
      const totalRevenue = vIncomes.reduce((sum, inc) => sum + (inc.totalIncome || 0), 0);
      const revenuePerKm = totalKmRun > 0 ? totalRevenue / totalKmRun : 0;
      const netProfitPerKm = totalKmRun > 0 ? (totalRevenue - totalCost) / totalKmRun : 0;

      // Efficiency Rating
      let efficiencyRating: CostPerKmRow['efficiencyRating'] = 'No KM Data';
      if (totalKmRun > 0) {
        if (totalCostPerKm <= 18) efficiencyRating = 'Excellent';
        else if (totalCostPerKm <= 26) efficiencyRating = 'Good';
        else if (totalCostPerKm <= 35) efficiencyRating = 'Moderate';
        else efficiencyRating = 'High Cost';
      }

      rows.push({
        vehicleId: v.id,
        vehicleNo: v.vehicleNo,
        vehicleModel: v.vehicleModel,
        vehicleType: v.vehicleType,
        driverName: v.driverName,
        status: v.status,
        month: month || 0,
        year,
        totalKmRun,
        totalFuelLitres,
        fuelMileageKmpL,
        fuelCost,
        maintenanceCost,
        salaryCost,
        paperAndFineCost,
        otherCost,
        totalCost,
        fuelCostPerKm,
        maintenanceCostPerKm,
        salaryCostPerKm,
        otherCostPerKm,
        totalCostPerKm,
        totalRevenue,
        revenuePerKm,
        netProfitPerKm,
        efficiencyRating,
      });
    });

    return rows.sort((a, b) => {
      // Sort with data first, then lowest CPK
      if (a.totalKmRun === 0 && b.totalKmRun > 0) return 1;
      if (a.totalKmRun > 0 && b.totalKmRun === 0) return -1;
      return a.totalCostPerKm - b.totalCostPerKm;
    });
  }

  /**
   * Calculates Fleet Average Cost Per KM Summary
   */
  public static calculateFleetCostPerKmSummary(
    data: ComprehensiveDataset,
    year: number,
    month?: number
  ): FleetCostPerKmSummary {
    const rows = this.calculateCostPerKmRows(data, year, month);

    let totalFleetKmRun = 0;
    let totalFleetFuelLitres = 0;
    let totalFleetFuelCost = 0;
    let totalFleetMaintenanceCost = 0;
    let totalFleetSalaryCost = 0;
    let totalFleetOtherCost = 0;
    let totalFleetExpense = 0;
    let totalFleetRevenue = 0;

    rows.forEach((r) => {
      totalFleetKmRun += r.totalKmRun;
      totalFleetFuelLitres += r.totalFuelLitres;
      totalFleetFuelCost += r.fuelCost;
      totalFleetMaintenanceCost += r.maintenanceCost;
      totalFleetSalaryCost += r.salaryCost;
      totalFleetOtherCost += r.paperAndFineCost + r.otherCost;
      totalFleetExpense += r.totalCost;
      totalFleetRevenue += r.totalRevenue;
    });

    const avgFleetMileageKmpL =
      totalFleetKmRun > 0 && totalFleetFuelLitres > 0
        ? totalFleetKmRun / totalFleetFuelLitres
        : 0;

    const avgCostPerKm = totalFleetKmRun > 0 ? totalFleetExpense / totalFleetKmRun : 0;
    const avgFuelCostPerKm = totalFleetKmRun > 0 ? totalFleetFuelCost / totalFleetKmRun : 0;
    const avgMaintenanceCostPerKm =
      totalFleetKmRun > 0 ? totalFleetMaintenanceCost / totalFleetKmRun : 0;
    const avgSalaryCostPerKm = totalFleetKmRun > 0 ? totalFleetSalaryCost / totalFleetKmRun : 0;
    const avgOtherCostPerKm = totalFleetKmRun > 0 ? totalFleetOtherCost / totalFleetKmRun : 0;
    const avgRevenuePerKm = totalFleetKmRun > 0 ? totalFleetRevenue / totalFleetKmRun : 0;
    const avgNetProfitPerKm =
      totalFleetKmRun > 0 ? (totalFleetRevenue - totalFleetExpense) / totalFleetKmRun : 0;

    return {
      month: month || 0,
      year,
      totalFleetKmRun,
      totalFleetFuelLitres,
      avgFleetMileageKmpL,
      totalFleetExpense,
      avgCostPerKm,
      avgFuelCostPerKm,
      avgMaintenanceCostPerKm,
      avgSalaryCostPerKm,
      avgOtherCostPerKm,
      totalFleetRevenue,
      avgRevenuePerKm,
      avgNetProfitPerKm,
    };
  }
}
