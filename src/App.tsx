import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from './services/storage';
import {
  Vehicle,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
  VehicleMonthlyIncome,
  VehicleMonthlyMileage,
} from './types';
import { ComprehensiveDataset } from './services/costCalculations';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeToVehicles,
  subscribeToMaintenance,
  subscribeToFuel,
  subscribeToSalaries,
  subscribeToRenewals,
  subscribeToFines,
  subscribeToOther,
  subscribeToIncomes,
  subscribeToMileages,
  saveVehicleToFirestore,
  saveMaintenanceToFirestore,
  saveFuelToFirestore,
  saveSalaryToFirestore,
  saveRenewalToFirestore,
  saveFineToFirestore,
  saveOtherToFirestore,
  saveIncomeToFirestore,
  saveMileageToFirestore,
  saveSupplierToFirestore,
  syncAllDatasetsToFirestore,
} from './services/firebase';

// Layout Components
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { QuickAddModal } from './components/common/QuickAddModal';

// Module Views
import { DashboardView } from './components/dashboard/DashboardView';
import { VehicleCostAnalysis } from './components/analysis/VehicleCostAnalysis';
import { CostPerKmModule } from './components/costPerKm/CostPerKmModule';
import { MileageModal } from './components/costPerKm/MileageModal';
import { VehicleMaster } from './components/vehicles/VehicleMaster';
import { VehicleDetailPage } from './components/vehicles/VehicleDetailPage';
import { MaintenanceList } from './components/maintenance/MaintenanceList';
import { MaintenanceModal } from './components/maintenance/MaintenanceModal';
import { FuelList } from './components/fuel/FuelList';
import { FuelModal } from './components/fuel/FuelModal';
import { DriverSalaryList } from './components/salary/DriverSalaryList';
import { DriverSalaryModal } from './components/salary/DriverSalaryModal';
import { DocumentRenewalList } from './components/renewals/DocumentRenewalList';
import { DocumentRenewalModal } from './components/renewals/DocumentRenewalModal';
import { PoliceFineList } from './components/fines/PoliceFineList';
import { PoliceFineModal } from './components/fines/PoliceFineModal';
import { OtherExpenseList } from './components/otherExpenses/OtherExpenseList';
import { OtherExpenseModal } from './components/otherExpenses/OtherExpenseModal';
import { SupplierPaymentList } from './components/suppliers/SupplierPaymentList';
import { MonthlyProfitLossModule } from './components/profit/MonthlyProfitLossModule';
import { MonthlyIncomeModal } from './components/profit/MonthlyIncomeModal';
import { ExcelImportModule } from './components/import/ExcelImportModule';
import { SettingsView } from './components/settings/SettingsView';
import { VehicleModal } from './components/vehicles/VehicleModal';
import { SupplierModal } from './components/suppliers/SupplierModal';

function AppContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState<string | null>(null);
  const [importInitialModule, setImportInitialModule] = useState<
    'maintenance' | 'fuel' | 'salary' | 'paper' | 'fines' | 'other' | 'vehicles'
  >('fuel');

  // Database datasets in state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTransaction[]>([]);
  const [fuel, setFuel] = useState<FuelTransaction[]>([]);
  const [salaries, setSalaries] = useState<DriverSalaryTransaction[]>([]);
  const [renewals, setRenewals] = useState<DocumentRenewal[]>([]);
  const [fines, setFines] = useState<PoliceCase[]>([]);
  const [other, setOther] = useState<OtherExpense[]>([]);
  const [incomes, setIncomes] = useState<VehicleMonthlyIncome[]>([]);
  const [mileages, setMileages] = useState<VehicleMonthlyMileage[]>([]);

  // Modals for Quick Add
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [openAddModalType, setOpenAddModalType] = useState<
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
    | null
  >(null);

  // Load all data from storage
  const loadData = useCallback(() => {
    setVehicles(storage.getVehicles());
    setMaintenance(storage.getMaintenance());
    setFuel(storage.getFuel());
    setSalaries(storage.getSalaries());
    setRenewals(storage.getRenewals());
    setFines(storage.getFines());
    setOther(storage.getOtherExpenses());
    setIncomes(storage.getIncomes());
    setMileages(storage.getMileages());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Firestore Subscriptions when user is authenticated
  const hasInitializedSyncRef = useRef(false);
  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    try {
      unsubs.push(
        subscribeToVehicles((items) => {
          if (items.length > 0) {
            setVehicles(items);
            storage.bulkInsertVehicles(items);
          } else if (!hasInitializedSyncRef.current && storage.getVehicles().length > 0) {
            // Push initial local vehicles to Firestore
            hasInitializedSyncRef.current = true;
            syncAllDatasetsToFirestore({
              vehicles: storage.getVehicles(),
              suppliers: storage.getSuppliers(),
              maintenance: storage.getMaintenance(),
              fuel: storage.getFuel(),
              salaries: storage.getSalaries(),
              renewals: storage.getRenewals(),
              fines: storage.getFines(),
              other: storage.getOtherExpenses(),
              incomes: storage.getIncomes(),
              mileages: storage.getMileages(),
            }).catch(console.error);
          }
        })
      );

      unsubs.push(
        subscribeToMaintenance((items) => {
          if (items.length > 0) setMaintenance(items);
        })
      );

      unsubs.push(
        subscribeToFuel((items) => {
          if (items.length > 0) setFuel(items);
        })
      );

      unsubs.push(
        subscribeToSalaries((items) => {
          if (items.length > 0) setSalaries(items);
        })
      );

      unsubs.push(
        subscribeToRenewals((items) => {
          if (items.length > 0) setRenewals(items);
        })
      );

      unsubs.push(
        subscribeToFines((items) => {
          if (items.length > 0) setFines(items);
        })
      );

      unsubs.push(
        subscribeToOther((items) => {
          if (items.length > 0) setOther(items);
        })
      );

      unsubs.push(
        subscribeToIncomes((items) => {
          if (items.length > 0) setIncomes(items);
        })
      );

      unsubs.push(
        subscribeToMileages((items) => {
          if (items.length > 0) setMileages(items);
        })
      );
    } catch (e) {
      console.error('Error establishing Firestore listeners:', e);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user]);

  const handleManualSyncFirestore = async () => {
    if (!user) return;
    await syncAllDatasetsToFirestore({
      vehicles: storage.getVehicles(),
      suppliers: storage.getSuppliers(),
      maintenance: storage.getMaintenance(),
      fuel: storage.getFuel(),
      salaries: storage.getSalaries(),
      renewals: storage.getRenewals(),
      fines: storage.getFines(),
      other: storage.getOtherExpenses(),
      incomes: storage.getIncomes(),
      mileages: storage.getMileages(),
    });
    loadData();
  };

  const dataset: ComprehensiveDataset = {
    vehicles,
    maintenance,
    fuel,
    salaries,
    renewals,
    fines,
    other,
    incomes,
    mileages,
  };

  // Badges & Counters for sidebar
  const todayStr = new Date().toISOString().substring(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().substring(0, 10);
  const upcomingRenewalsCount = renewals.filter((r) => r.expiryDate <= in30DaysStr).length;

  const pendingSupplierCount =
    maintenance.filter((m) => m.dueAmount > 0).length +
    fuel.filter((f) => f.paymentStatus !== 'Paid').length +
    other.filter((o) => o.dueAmount > 0).length;

  // Navigation handlers
  const handleSelectTab = (tab: NavTab) => {
    setSelectedVehicleDetail(null);
    setCurrentTab(tab);
  };

  const handleOpenVehicleDetail = (vehicleNo: string) => {
    setSelectedVehicleDetail(vehicleNo);
  };

  const handleBackFromVehicleDetail = () => {
    setSelectedVehicleDetail(null);
  };

  // Header Titles
  const getHeaderInfo = () => {
    if (selectedVehicleDetail) {
      return {
        title: `Vehicle Analytics: ${selectedVehicleDetail}`,
        subtitle: 'Historical yearly evolution, category breakdown and full transaction logs',
      };
    }
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Fleet Operations Dashboard',
          subtitle: 'High-level cost summary, fleet status, and upcoming compliance alerts',
        };
      case 'analysis':
        return {
          title: 'Vehicle Cost Analysis & Yearly Matrix',
          subtitle: 'Multi-year vehicle expenses, category breakdown, and monthly cost calculations',
        };
      case 'vehicles':
        return {
          title: 'Vehicle Master Directory',
          subtitle: 'Company fleet inventory, assigned drivers, and vehicle status management',
        };
      case 'maintenance':
        return {
          title: 'Maintenance & Repairs',
          subtitle: 'Workshop invoices, parts servicing, bill approvals and balance settlements',
        };
      case 'fuel':
        return {
          title: 'Fuel & Gas Expenses',
          subtitle: 'Refill slips, litres, rates, and odometer mileage readings',
        };
      case 'salary':
        return {
          title: 'Driver Monthly Salaries',
          subtitle: 'Monthly driver compensation assigned directly to operational vehicles',
        };
      case 'paper':
        return {
          title: 'Paper & Document Renewals',
          subtitle: 'Fitness, Tax Token, Route Permit, and Insurance expiry tracking',
        };
      case 'fines':
        return {
          title: 'Police Cases & Fines',
          subtitle: 'Traffic prosecution, e-challans, and penalty settlement status',
        };
      case 'other':
        return {
          title: 'Other Operational Expenses',
          subtitle: 'Washing, parking, tolls, accessories and miscellaneous expenditures',
        };
      case 'suppliers':
        return {
          title: 'Supplier Payment Follow-up',
          subtitle: 'Outstanding workshop balances, fuel pump credit, and invoice settlements',
        };
      case 'import':
        return {
          title: 'Excel Data Import & Upload',
          subtitle: 'Upload 5-year historical Excel files, strict row validation, and duplicate prevention',
        };
      case 'settings':
        return {
          title: 'System Settings & Data Backup',
          subtitle: 'Database JSON export, restore from backup, and historical dataset reset',
        };
      default:
        return { title: 'FleetCost Pro', subtitle: '' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        vehicleCount={vehicles.length}
        upcomingRenewalsCount={upcomingRenewalsCount}
        pendingSupplierCount={pendingSupplierCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Sticky Header */}
        <Header
          activeTitle={headerInfo.title}
          activeSubtitle={headerInfo.subtitle}
          vehicles={vehicles}
          onOpenVehicleDetail={handleOpenVehicleDetail}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onNavigateToImport={() => handleSelectTab('import')}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onSyncFirestore={handleManualSyncFirestore}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-3.5">
          {/* If Vehicle Detail is active, display it immediately */}
          {selectedVehicleDetail ? (
            <VehicleDetailPage
              vehicleNo={selectedVehicleDetail}
              dataset={dataset}
              onBack={handleBackFromVehicleDetail}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  dataset={dataset}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                  onNavigateToTab={handleSelectTab}
                />
              )}

              {currentTab === 'costPerKm' && (
                <CostPerKmModule
                  dataset={dataset}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'analysis' && (
                <VehicleCostAnalysis
                  dataset={dataset}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'vehicles' && (
                <VehicleMaster
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'maintenance' && (
                <MaintenanceList
                  maintenance={maintenance}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'fuel' && (
                <FuelList
                  fuel={fuel}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                  onNavigateToImport={() => {
                    setImportInitialModule('fuel');
                    setCurrentTab('import');
                  }}
                />
              )}

              {currentTab === 'salary' && (
                <DriverSalaryList
                  salaries={salaries}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'paper' && (
                <DocumentRenewalList
                  renewals={renewals}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'fines' && (
                <PoliceFineList
                  fines={fines}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'other' && (
                <OtherExpenseList
                  expenses={other}
                  vehicles={vehicles}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'profit' && (
                <MonthlyProfitLossModule
                  dataset={dataset}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'suppliers' && (
                <SupplierPaymentList
                  dataset={dataset}
                  onRefresh={loadData}
                  onOpenVehicleDetail={handleOpenVehicleDetail}
                />
              )}

              {currentTab === 'import' && (
                <ExcelImportModule
                  vehicles={vehicles}
                  onRefreshData={loadData}
                  initialModule={importInitialModule}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView onRefreshData={loadData} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Quick Add Chooser Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectAction={(action) => setOpenAddModalType(action)}
      />

      {/* Modals invoked from Quick Add */}
      {openAddModalType === 'maintenance' && (
        <MaintenanceModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveMaintenance(item);
            if (user) {
              await saveMaintenanceToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'fuel' && (
        <FuelModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveFuel(item);
            if (user) {
              await saveFuelToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'salary' && (
        <DriverSalaryModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveSalary(item);
            if (user) {
              await saveSalaryToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'paper' && (
        <DocumentRenewalModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveRenewal(item);
            if (user) {
              await saveRenewalToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'fines' && (
        <PoliceFineModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveFine(item);
            if (user) {
              await saveFineToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'other' && (
        <OtherExpenseModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (item) => {
            storage.saveOtherExpense(item);
            if (user) {
              await saveOtherToFirestore(item).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'vehicle' && (
        <VehicleModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={(item) => {
            const res = storage.saveVehicle(item);
            if (res.success) {
              if (user) {
                saveVehicleToFirestore(item).catch(console.error);
              }
              loadData();
            }
            return res;
          }}
        />
      )}

      {openAddModalType === 'supplier' && (
        <SupplierModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={(supplier) => {
            const res = storage.saveSupplier(supplier);
            if (res.success) {
              if (user) {
                saveSupplierToFirestore(supplier).catch(console.error);
              }
              loadData();
            }
            return res;
          }}
        />
      )}

      {openAddModalType === 'income' && (
        <MonthlyIncomeModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (incomeItem) => {
            storage.saveIncome(incomeItem);
            if (user) {
              await saveIncomeToFirestore(incomeItem).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}

      {openAddModalType === 'mileage' && (
        <MileageModal
          isOpen={true}
          onClose={() => setOpenAddModalType(null)}
          onSave={async (mileageItem) => {
            storage.saveMileage(mileageItem);
            if (user) {
              await saveMileageToFirestore(mileageItem).catch(console.error);
            }
            loadData();
          }}
          vehicles={vehicles}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
