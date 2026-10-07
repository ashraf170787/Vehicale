import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Vehicle,
  Supplier,
  MaintenanceTransaction,
  FuelTransaction,
  DriverSalaryTransaction,
  DocumentRenewal,
  PoliceCase,
  OtherExpense,
  VehicleMonthlyIncome,
  VehicleMonthlyMileage,
} from '../types';

// Initialize Firebase App and Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Infrastructure per Firebase Integration Skill Spec
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation per Skill Spec
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: the client is currently offline.');
    }
    return false;
  }
}

// Test connection on module init
testConnection();

// Auth Helpers
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign-Out Error:', err);
    throw err;
  }
}

// Firestore Realtime Collections Listeners
export function subscribeToVehicles(
  onData: (data: Vehicle[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'vehicles';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: Vehicle[] = [];
      snapshot.forEach((d) => items.push(d.data() as Vehicle));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToSuppliers(
  onData: (data: Supplier[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'suppliers';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((d) => items.push(d.data() as Supplier));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToMaintenance(
  onData: (data: MaintenanceTransaction[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'maintenance';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: MaintenanceTransaction[] = [];
      snapshot.forEach((d) => items.push(d.data() as MaintenanceTransaction));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToFuel(
  onData: (data: FuelTransaction[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'fuel';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: FuelTransaction[] = [];
      snapshot.forEach((d) => items.push(d.data() as FuelTransaction));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToSalaries(
  onData: (data: DriverSalaryTransaction[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'salaries';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: DriverSalaryTransaction[] = [];
      snapshot.forEach((d) => items.push(d.data() as DriverSalaryTransaction));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToRenewals(
  onData: (data: DocumentRenewal[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'renewals';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: DocumentRenewal[] = [];
      snapshot.forEach((d) => items.push(d.data() as DocumentRenewal));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToFines(
  onData: (data: PoliceCase[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'fines';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: PoliceCase[] = [];
      snapshot.forEach((d) => items.push(d.data() as PoliceCase));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToOther(
  onData: (data: OtherExpense[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'other';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: OtherExpense[] = [];
      snapshot.forEach((d) => items.push(d.data() as OtherExpense));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToIncomes(
  onData: (data: VehicleMonthlyIncome[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'incomes';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: VehicleMonthlyIncome[] = [];
      snapshot.forEach((d) => items.push(d.data() as VehicleMonthlyIncome));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export function subscribeToMileages(
  onData: (data: VehicleMonthlyMileage[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const colPath = 'mileages';
  return onSnapshot(
    collection(db, colPath),
    (snapshot) => {
      const items: VehicleMonthlyMileage[] = [];
      snapshot.forEach((d) => items.push(d.data() as VehicleMonthlyMileage));
      onData(items);
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

// Write / Mutate Helpers with explicit Error Handling
export async function saveVehicleToFirestore(vehicle: Vehicle) {
  const path = `vehicles/${vehicle.id}`;
  try {
    await setDoc(doc(db, 'vehicles', vehicle.id), vehicle);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteVehicleFromFirestore(id: string) {
  const path = `vehicles/${id}`;
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSupplierToFirestore(supplier: Supplier) {
  const path = `suppliers/${supplier.id}`;
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), supplier);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveMaintenanceToFirestore(maint: MaintenanceTransaction) {
  const path = `maintenance/${maint.id}`;
  try {
    await setDoc(doc(db, 'maintenance', maint.id), maint);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMaintenanceFromFirestore(id: string) {
  const path = `maintenance/${id}`;
  try {
    await deleteDoc(doc(db, 'maintenance', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveFuelToFirestore(fuel: FuelTransaction) {
  const path = `fuel/${fuel.id}`;
  try {
    await setDoc(doc(db, 'fuel', fuel.id), fuel);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteFuelFromFirestore(id: string) {
  const path = `fuel/${id}`;
  try {
    await deleteDoc(doc(db, 'fuel', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSalaryToFirestore(salary: DriverSalaryTransaction) {
  const path = `salaries/${salary.id}`;
  try {
    await setDoc(doc(db, 'salaries', salary.id), salary);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSalaryFromFirestore(id: string) {
  const path = `salaries/${id}`;
  try {
    await deleteDoc(doc(db, 'salaries', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveRenewalToFirestore(renewal: DocumentRenewal) {
  const path = `renewals/${renewal.id}`;
  try {
    await setDoc(doc(db, 'renewals', renewal.id), renewal);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteRenewalFromFirestore(id: string) {
  const path = `renewals/${id}`;
  try {
    await deleteDoc(doc(db, 'renewals', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveFineToFirestore(fine: PoliceCase) {
  const path = `fines/${fine.id}`;
  try {
    await setDoc(doc(db, 'fines', fine.id), fine);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteFineFromFirestore(id: string) {
  const path = `fines/${id}`;
  try {
    await deleteDoc(doc(db, 'fines', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveOtherToFirestore(item: OtherExpense) {
  const path = `other/${item.id}`;
  try {
    await setDoc(doc(db, 'other', item.id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteOtherFromFirestore(id: string) {
  const path = `other/${id}`;
  try {
    await deleteDoc(doc(db, 'other', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveIncomeToFirestore(income: VehicleMonthlyIncome) {
  const path = `incomes/${income.id}`;
  try {
    await setDoc(doc(db, 'incomes', income.id), income);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteIncomeFromFirestore(id: string) {
  const path = `incomes/${id}`;
  try {
    await deleteDoc(doc(db, 'incomes', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMileageToFirestore(mileage: VehicleMonthlyMileage) {
  const path = `mileages/${mileage.id}`;
  try {
    await setDoc(doc(db, 'mileages', mileage.id), mileage);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMileageFromFirestore(id: string) {
  const path = `mileages/${id}`;
  try {
    await deleteDoc(doc(db, 'mileages', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Bulk Sync / Upload to Firestore
export async function syncAllDatasetsToFirestore(data: {
  vehicles?: Vehicle[];
  suppliers?: Supplier[];
  maintenance?: MaintenanceTransaction[];
  fuel?: FuelTransaction[];
  salaries?: DriverSalaryTransaction[];
  renewals?: DocumentRenewal[];
  fines?: PoliceCase[];
  other?: OtherExpense[];
  incomes?: VehicleMonthlyIncome[];
  mileages?: VehicleMonthlyMileage[];
}) {
  const batch = writeBatch(db);
  let count = 0;

  const commitIfLimit = async () => {
    // Firestore batch limit is 500
    if (count >= 400) {
      await batch.commit();
      count = 0;
    }
  };

  if (data.vehicles) {
    for (const v of data.vehicles) {
      batch.set(doc(db, 'vehicles', v.id), v);
      count++;
      await commitIfLimit();
    }
  }

  if (data.suppliers) {
    for (const s of data.suppliers) {
      batch.set(doc(db, 'suppliers', s.id), s);
      count++;
      await commitIfLimit();
    }
  }

  if (data.maintenance) {
    for (const m of data.maintenance) {
      batch.set(doc(db, 'maintenance', m.id), m);
      count++;
      await commitIfLimit();
    }
  }

  if (data.fuel) {
    for (const f of data.fuel) {
      batch.set(doc(db, 'fuel', f.id), f);
      count++;
      await commitIfLimit();
    }
  }

  if (data.salaries) {
    for (const s of data.salaries) {
      batch.set(doc(db, 'salaries', s.id), s);
      count++;
      await commitIfLimit();
    }
  }

  if (data.renewals) {
    for (const r of data.renewals) {
      batch.set(doc(db, 'renewals', r.id), r);
      count++;
      await commitIfLimit();
    }
  }

  if (data.fines) {
    for (const f of data.fines) {
      batch.set(doc(db, 'fines', f.id), f);
      count++;
      await commitIfLimit();
    }
  }

  if (data.other) {
    for (const o of data.other) {
      batch.set(doc(db, 'other', o.id), o);
      count++;
      await commitIfLimit();
    }
  }

  if (data.incomes) {
    for (const i of data.incomes) {
      batch.set(doc(db, 'incomes', i.id), i);
      count++;
      await commitIfLimit();
    }
  }

  if (data.mileages) {
    for (const m of data.mileages) {
      batch.set(doc(db, 'mileages', m.id), m);
      count++;
      await commitIfLimit();
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}
