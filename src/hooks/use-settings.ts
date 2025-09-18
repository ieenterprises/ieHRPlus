

"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, getDoc, writeBatch, where, query, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { AnyPermission } from '@/lib/permissions';
import type { User, BranchType, PosDeviceType, Department, PrinterType, ReceiptSettings, Tax, Sale, Debt, Reservation, Category, Product, OpenTicket, VoidedLog, UserDepartment, SaleItem, Shift, AccessCode, OfflineAction } from '@/lib/types';
import { fileManagementPermissions, teamManagementPermissions, settingsPermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { useOnlineStatus } from './use-online-status';

export type { FeatureSettings, BranchType, PosDeviceType, PrinterType, ReceiptSettings, PaymentType, Tax, Department, UserDepartment } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

export const MOCK_INITIAL_DEPARTMENTS: Omit<Department, 'businessId'>[] = [
  { id: "dept_owner", name: "Owner", permissions: [...Object.keys(fileManagementPermissions), ...Object.keys(teamManagementPermissions), ...Object.keys(settingsPermissions)] as AnyPermission[] },
  { id: "dept_admin", name: "Administrator", permissions: [...Object.keys(fileManagementPermissions), ...Object.keys(teamManagementPermissions), ...Object.keys(settingsPermissions)] as AnyPermission[] },
  { id: "dept_manager", name: "Manager", permissions: ["VIEW_FILES", "UPLOAD_FILES", "DOWNLOAD_FILES", "APPROVE_DOCUMENTS", "VIEW_USERS", "MANAGE_USERS"] },
];

// --- Context and Provider ---

type SettingsContextType = {
    // Data states
    featureSettings: FeatureSettings;
    branches: BranchType[];
    posDevices: PosDeviceType[];
    printers: PrinterType[];
    receiptSettings: Record<string, ReceiptSettings>;
    paymentTypes: PaymentType[];
    taxes: Tax[];
    departments: Department[];
    users: User[];
    products: Product[];
    categories: Category[];
    customers: Customer[];
    sales: Sale[];
    reservations: Reservation[];
    debts: Debt[];
    voidedLogs: VoidedLog[];
    openTickets: OpenTicket[];
    shifts: Shift[];
    accessCodes: AccessCode[];
    
    // Data setters (now write to DB)
    setFeatureSettings: (value: React.SetStateAction<FeatureSettings>) => void;
    addBranch: (branch: Omit<BranchType, 'id'>) => Promise<void>;
    updateBranch: (id: string, branch: Partial<BranchType>) => Promise<void>;
    deleteBranch: (id: string) => Promise<void>;
    addPosDevice: (device: Omit<PosDeviceType, 'id' | 'in_use_by_shift_id'>) => Promise<void>;
    updatePosDevice: (id: string, device: Partial<PosDeviceType>) => Promise<void>;
    deletePosDevice: (id: string) => Promise<void>;
    addPrinter: (printer: Omit<PrinterType, 'id'>) => Promise<void>;
    updatePrinter: (id: string, printer: Partial<PrinterType>) => Promise<void>;
    deletePrinter: (id: string) => Promise<void>;
    setReceiptSettings: (value: React.SetStateAction<Record<string, ReceiptSettings>>) => void;
    addPaymentType: (pt: Omit<PaymentType, 'id'>) => Promise<void>;
    updatePaymentType: (id: string, pt: Partial<PaymentType>) => Promise<void>;
    deletePaymentType: (id: string) => Promise<void>;
    addTax: (tax: Omit<Tax, 'id'>) => Promise<void>;
    updateTax: (id: string, tax: Partial<Tax>) => Promise<void>;
    deleteTax: (id: string) => Promise<void>;
    generateAccessCode: () => Promise<AccessCode | null>;
    validateAndUseAccessCode: (code: string) => Promise<boolean>;
    updateUserTempAccess: (userId: string, hasAccess: boolean) => Promise<void>;
    
    // Auth and session state
    loggedInUser: User | null;
    loadingUser: boolean;
    logout: () => void;
    
    selectedBranch: BranchType | null;
    setSelectedBranch: React.Dispatch<React.SetStateAction<BranchType | null>>;
    selectedDevice: PosDeviceType | null;
    setSelectedDevice: React.Dispatch<React.SetStateAction<PosDeviceType | null>>;
    ownerSelectedBranch: BranchType | null;
    setOwnerSelectedBranch: React.Dispatch<React.SetStateAction<BranchType | null>>;
    currency: string;
    setCurrency: (value: React.SetStateAction<string>) => void;
    getPermissionsForDepartment: (department: UserDepartment) => AnyPermission[];

    // Cross-page state
    debtToSettle: Sale | null;
    setDebtToSettle: React.Dispatch<React.SetStateAction<Sale | null>>;
    printableData: any | null;
    setPrintableData: React.Dispatch<React.SetStateAction<any | null>>;
    isPrintModalOpen: boolean;
    setIsPrintModalOpen: React.Dispatch<React.SetStateAction<boolean>>;


    // Direct state setters for complex pages
    setProducts: (value: React.SetStateAction<Product[]>) => Promise<void>;
    setCategories: (value: React.SetStateAction<Category[]>) => Promise<void>;
    setCustomers: (value: React.SetStateAction<Customer[]>) => Promise<void>;
    setSales: (value: React.SetStateAction<Sale[]>) => Promise<void>;
    setReservations: (value: React.SetStateAction<Reservation[]>) => Promise<void>;
    setOpenTickets: (value: React.SetStateAction<OpenTicket[]>) => Promise<void>;
    setVoidedLogs: (value: React.SetStateAction<VoidedLog[]>) => Promise<void>;
    setDebts: (value: React.SetStateAction<Debt[]>) => Promise<void>;
    setDepartments: (value: React.SetStateAction<Department[]>) => void;
    setUsers: (value: React.SetStateAction<User[]>) => void;

    // Voiding and ticket logic
    voidSale: (saleId: string, voidedByEmployeeId: string) => Promise<void>;
    reactivateShift: (shiftId: string, userId: string) => Promise<void>;
    closeShift: (shiftId: string) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    deleteVoidedLog: (logId: string) => Promise<void>;
    restoreVoidedLog: (log: VoidedLog) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error parsing localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    }, [key, value]);

    return [value, setValue];
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    // States for data fetched from Firestore
    const [featureSettings, setFeatureSettingsState] = useState<FeatureSettings>({ open_tickets: true, reservations: true, shifts: true, time_management: false, kitchen_printers: true, dining_options: true, customer_displays: false });
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [posDevices, setPosDevices] = useState<PosDeviceType[]>([]);
    const [printers, setPrintersState] = useState<PrinterType[]>([]);
    const [receiptSettings, setReceiptSettingsState] = useState<Record<string, ReceiptSettings>>({});
    const [paymentTypes, setPaymentTypesState] = useState<PaymentType[]>([]);
    const [taxes, setTaxesState] = useState<Tax[]>([]);
    const [users, setUsersState] = useState<User[]>([]);
    const [departments, setDepartmentsState] = useState<Department[]>([]);
    const [products, setProductsState] = useState<Product[]>([]);
    const [categories, setCategoriesState] = useState<Category[]>([]);
    const [customers, setCustomersState] = useState<Customer[]>([]);
    const [sales, setSalesState] = useState<Sale[]>([]);
    const [reservations, setReservationsState] = useState<Reservation[]>([]);
    const [debts, setDebtsState] = useState<Debt[]>([]);
    const [voidedLogs, setVoidedLogsState] = useState<VoidedLog[]>([]);
    const [openTickets, setOpenTicketsState] = useState<OpenTicket[]>([]);
    const [shifts, setShiftsState] = useState<Shift[]>([]);
    const [currency, setCurrencyState] = useState<string>('$');
    const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
    
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    
    // Local session state
    const [selectedBranch, setSelectedBranch] = useLocalStorage<BranchType | null>('selectedBranch', null);
    const [selectedDevice, setSelectedDevice] = useLocalStorage<PosDeviceType | null>('selectedDevice', null);
    const [ownerSelectedBranch, setOwnerSelectedBranch] = useLocalStorage<BranchType | null>('ownerSelectedBranch', null);
    const [debtToSettle, setDebtToSettle] = useLocalStorage<Sale | null>('debtToSettle', null);
    const [pendingActions, setPendingActions] = useLocalStorage<OfflineAction[]>('pendingActions', []);
    
    // Note: printableData is NOT persisted to localStorage, it's just for passing data to the new tab.
    const [printableData, setPrintableData] = useState<any | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    
    const router = useRouter();
    const isOnline = useOnlineStatus();


    const fetchAndSetUser = useCallback(async (uid: string) => {
        setLoadingUser(true);
        try {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
                setLoggedInUser(userProfile);
                setLoadingUser(false);
                return userProfile;
            } else {
                 console.error("User profile not found in database for UID:", uid);
                 setLoadingUser(false);
                 logout();
                 return null;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setLoadingUser(false);
            logout();
            return null;
        }
    }, []);

    // Effect to process pending actions when coming online
    useEffect(() => {
        const processQueue = async () => {
            if (isOnline && pendingActions.length > 0) {
                console.log(`Processing ${pendingActions.length} pending offline actions...`);
                const batch = writeBatch(db);
                pendingActions.forEach(action => {
                    const docRef = doc(db, action.collection, action.id);
                    if (action.type === 'delete') {
                        batch.delete(docRef);
                    } else if (action.type === 'restore' && action.collection === 'voided_logs') {
                        const restoredSale = action.payload as Sale;
                        batch.set(doc(db, 'sales', restoredSale.id), restoredSale);
                        batch.delete(doc(db, 'voided_logs', action.id));
                    }
                });

                try {
                    await batch.commit();
                    console.log("Successfully synced pending actions.");
                    setPendingActions([]); // Clear the queue
                } catch (error) {
                    console.error("Error processing pending actions:", error);
                }
            }
        };
        processQueue();
    }, [isOnline, pendingActions, setPendingActions]);

    useEffect(() => {
        const subscriptions: Unsubscribe[] = [];
    
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            subscriptions.forEach(sub => sub());
            subscriptions.length = 0;

            if (user) {
                const userProfile = await fetchAndSetUser(user.uid);
                if (userProfile && userProfile.businessId) {
                    const { businessId } = userProfile;

                    const collections = {
                        users: setUsersState,
                        departments: setDepartmentsState,
                        categories: setCategoriesState,
                        products: setProductsState,
                        customers: setCustomersState,
                        sales: setSalesState,
                        reservations: setReservationsState,
                        open_tickets: setOpenTicketsState,
                        voided_logs: setVoidedLogsState,
                        debts: setDebtsState,
                        branches: setBranches,
                        pos_devices: setPosDevices,
                        printers: setPrintersState,
                        taxes: setTaxesState,
                        payment_types: setPaymentTypesState,
                        shifts: setShiftsState,
                        access_codes: setAccessCodes,
                    };

                    Object.entries(collections).forEach(([name, setter]) => {
                        const q = query(collection(db, name), where("businessId", "==", businessId));
                        const unsubscribe = onSnapshot(q, (snapshot) => {
                            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setter(data as any);
                        }, (error) => {
                            console.error(`Error fetching ${name}:`, error);
                        });
                        subscriptions.push(unsubscribe);
                    });

                    const settingsDocRef = doc(db, 'settings', businessId);
                    const settingsUnsub = onSnapshot(settingsDocRef, (doc) => {
                        if (doc.exists()) {
                            const settingsData = doc.data();
                            setFeatureSettingsState(settingsData.featureSettings || {});
                            setReceiptSettingsState(settingsData.receiptSettings || {});
                            setCurrencyState(settingsData.currency || '$');
                        }
                    });
                    subscriptions.push(settingsUnsub);
                }
            } else {
                setLoggedInUser(null);
                setLoadingUser(false);
                // Clear all data on logout
                const collections = [setUsersState, setDepartmentsState, setCategoriesState, setProductsState, setCustomersState, setSalesState, setReservationsState, setOpenTicketsState, setVoidedLogsState, setDebtsState, setBranches, setPosDevices, setPrintersState, setTaxesState, setPaymentTypesState, setShiftsState, setAccessCodes];
                collections.forEach(setter => setter([]));
            }
        });
    
        return () => {
            unsubscribeAuth();
            subscriptions.forEach(sub => sub());
        };
    }, [fetchAndSetUser]);
    

    const logout = async () => {
        if (loggedInUser && loggedInUser.businessId) {
            const batch = writeBatch(db);
            const shiftsCollection = collection(db, 'shifts');
            
            // Find the active or temp-active shift for the user
            const q = query(
                shiftsCollection, 
                where('userId', '==', loggedInUser.id), 
                where('status', 'in', ['active', 'temp-active']), 
                where('businessId', '==', loggedInUser.businessId)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const activeShiftDoc = querySnapshot.docs[0];
                const activeShiftData = activeShiftDoc.data();
                
                // Close the active shift
                batch.update(doc(db, 'shifts', activeShiftDoc.id), { 
                    status: 'closed', 
                    endTime: new Date().toISOString() 
                });
                
                // Release the device used in that shift, if any
                if (activeShiftData.posDeviceId) {
                    const deviceRef = doc(db, 'pos_devices', activeShiftData.posDeviceId);
                    batch.update(deviceRef, { in_use_by_shift_id: null });
                }
            }
            // Revoke temporary access on logout
            if (loggedInUser.temp_access_given) {
                batch.update(doc(db, 'users', loggedInUser.id), { temp_access_given: false });
            }
            await batch.commit();
        }

        await auth.signOut();
        setLoggedInUser(null);
        setSelectedBranch(null);
        setSelectedDevice(null);
        setOwnerSelectedBranch(null);
        window.localStorage.removeItem('selectedBranch');
        window.localStorage.removeItem('selectedDevice');
        window.localStorage.removeItem('ownerSelectedBranch');
        router.push('/sign-in');
    };

    const getPermissionsForDepartment = useCallback((department: UserDepartment) => {
        const departmentData = departments.find(d => d.name === department);
        return departmentData?.permissions || [];
    }, [departments]);

    const setSettingsDoc = async (data: any) => {
        if (!loggedInUser?.businessId) return;
        const settingsDocRef = doc(db, 'settings', loggedInUser.businessId);
        await setDoc(settingsDocRef, data, { merge: true });
    };
    
    const createSetterWithDbSync = <T,>(
        state: T,
        setter: React.Dispatch<React.SetStateAction<T>>,
        dbField: string
    ) => {
        return (newValue: React.SetStateAction<T>) => {
            const updatedValue = typeof newValue === 'function'
                ? (newValue as (prevState: T) => T)(state)
                : newValue;
            setter(updatedValue);
            setSettingsDoc({ [dbField]: updatedValue });
        };
    };

    const setFeatureSettings = createSetterWithDbSync(featureSettings, setFeatureSettingsState, 'featureSettings');
    const setReceiptSettings = createSetterWithDbSync(receiptSettings, setReceiptSettingsState, 'receiptSettings');
    const setCurrency = createSetterWithDbSync(currency, setCurrencyState, 'currency');
    
    const generateAccessCode = async (): Promise<AccessCode | null> => {
        if (!loggedInUser?.businessId) return null;
        const now = new Date();
        const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5-minute validity

        const newCode: Omit<AccessCode, 'id'> = {
            code: Math.floor(1000 + Math.random() * 9000).toString(),
            status: 'valid',
            createdAt: now.toISOString(),
            expiresAt: expires.toISOString(),
            businessId: loggedInUser.businessId,
        };

        const docRef = await addDoc(collection(db, 'access_codes'), newCode);
        return { ...newCode, id: docRef.id };
    };

    const validateAndUseAccessCode = async (code: string): Promise<boolean> => {
        if (!loggedInUser?.businessId) return false;

        const now = new Date();
        const validCode = accessCodes.find(ac => 
            ac.code === code && 
            ac.status === 'valid' &&
            new Date(ac.expiresAt) > now
        );

        if (validCode && validCode.id) {
            await updateDoc(doc(db, 'access_codes', validCode.id), { status: 'used' });
            return true;
        }

        return false;
    };

    const updateUserTempAccess = async (userId: string, hasAccess: boolean) => {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { temp_access_given: hasAccess });
    };

    const addDocFactory = (collectionName: string) => async (data: any) => { 
        if (!loggedInUser?.businessId) return;
        await addDoc(collection(db, collectionName), { ...data, businessId: loggedInUser.businessId }); 
    };
    const updateDocFactory = (collectionName: string) => async (id: string, data: any) => { await updateDoc(doc(db, collectionName, id), data); };
    const deleteDocFactory = (collectionName: string) => async (id: string) => { await deleteDoc(doc(db, collectionName, id)); };

    const addBranch = addDocFactory('branches');
    const updateBranch = updateDocFactory('branches');
    const deleteBranch = deleteDocFactory('branches');
    const addPosDevice = async (device: Omit<PosDeviceType, 'id' | 'in_use_by_shift_id'>) => {
      if (!loggedInUser?.businessId) return;
      await addDoc(collection(db, 'pos_devices'), { ...device, in_use_by_shift_id: null, businessId: loggedInUser.businessId });
    };
    const updatePosDevice = updateDocFactory('pos_devices');
    const deletePosDevice = deleteDocFactory('pos_devices');
    const addPrinter = addDocFactory('printers');
    const updatePrinter = updateDocFactory('printers');
    const deletePrinter = deleteDocFactory('printers');
    const addPaymentType = addDocFactory('payment_types');
    const updatePaymentType = updateDocFactory('payment_types');
    const deletePaymentType = deleteDocFactory('payment_types');
    const addTax = addDocFactory('taxes');
    const updateTax = updateDocFactory('taxes');
    const deleteTax = deleteDocFactory('taxes');

    const createBatchSetter = <T extends {id?: string}>(collectionName: string, localSetter: React.Dispatch<React.SetStateAction<T[]>>) => 
        async (value: React.SetStateAction<T[]>) => {
        if (!loggedInUser?.businessId) return;
        
        let newItems: T[];
        localSetter(prevState => {
            newItems = typeof value === 'function' ? value(prevState) : value;
            return newItems;
        });

        // This function now only handles creations and updates. Deletions are separate.
        // It's still useful for batching updates from complex pages like Sales.
        const batch = writeBatch(db);
        newItems!.forEach(item => {
            if (item.id) {
                 const ref = doc(db, collectionName, item.id);
                 batch.set(ref, { ...item, businessId: loggedInUser.businessId }, { merge: true });
            }
        });
        
        try {
            // REMOVED: if (isOnline) 
            await batch.commit();
        } catch (error) {
            console.error(`Error during batch write to ${collectionName}:`, error);
        }
    };

    const setProducts = createBatchSetter('products', setProductsState);
    const setCategories = createBatchSetter('categories', setCategoriesState);
    const setCustomers = createBatchSetter('customers', setCustomersState);
    const setSales = createBatchSetter('sales', setSalesState);
    const setReservations = createBatchSetter('reservations', setReservationsState);
    const setDebts = createBatchSetter('debts', setDebtsState);
    const setOpenTickets = createBatchSetter('open_tickets', setOpenTicketsState);
    const setVoidedLogs = createBatchSetter('voided_logs', setVoidedLogsState);

     const createOfflineDeleter = (collectionName: string, localSetter: React.Dispatch<React.SetStateAction<any[]>>) => 
        async (id: string) => {
        
        localSetter(prevState => prevState.filter(item => item.id !== id));
        
        if (isOnline) {
            await deleteDoc(doc(db, collectionName, id));
        } else {
            const action: OfflineAction = {
                id,
                collection: collectionName,
                type: 'delete',
                timestamp: new Date().toISOString(),
            };
            setPendingActions(prev => [...prev, action]);
        }
    };

    const deleteProduct = createOfflineDeleter('products', setProductsState);
    const deleteVoidedLog = createOfflineDeleter('voided_logs', setVoidedLogsState);

    const voidSale = async (saleId: string, voidedByEmployeeId: string) => {
        if (!loggedInUser?.businessId) return;
        const saleToVoid = sales.find(s => s.id === saleId);
        if (!saleToVoid) return;

        const reservationToVoid = reservations.find(r => r.sale_id === saleId);

        const batch = writeBatch(db);
        
        // 1. Create voided log
        const voidedLogRef = doc(collection(db, 'voided_logs'));
        const { customers, users, pos_devices, ...saleData } = saleToVoid;
        batch.set(voidedLogRef, {
            type: 'receipt',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: saleData,
            businessId: loggedInUser.businessId,
        });
        
        // 2. Delete the original sale
        batch.delete(doc(db, 'sales', saleId));

        // 3. If there's a linked reservation, delete it
        if (reservationToVoid && reservationToVoid.id) {
            batch.delete(doc(db, 'reservations', reservationToVoid.id));
        }

        await batch.commit();
    };

    const restoreVoidedLog = async (logToRestore: VoidedLog) => {
        if (!logToRestore || logToRestore.type !== 'receipt') return;
        const saleToRestore = logToRestore.data as Sale;
    
        // 1. Optimistic UI update to prevent duplicates
        setSalesState(prev => [...prev.filter(s => s.id !== saleToRestore.id), saleToRestore]);
        setVoidedLogsState(prev => prev.filter(log => log.id !== logToRestore.id));
    
        if (isOnline) {
            // 2. If online, perform DB operations immediately
            const batch = writeBatch(db);
            batch.set(doc(db, 'sales', saleToRestore.id), saleToRestore);
            batch.delete(doc(db, 'voided_logs', logToRestore.id));
            await batch.commit();
        } else {
            // 3. If offline, queue the action for restore
            const action: OfflineAction = {
                id: logToRestore.id,
                collection: 'voided_logs',
                type: 'restore',
                timestamp: new Date().toISOString(),
                payload: saleToRestore,
            };
            setPendingActions(prev => [...prev, action]);
        }
    };
    
    const reactivateShift = async (shiftId: string, userId: string) => {
        if (!loggedInUser?.businessId) throw new Error("Not logged in or no business ID found.");

        const batch = writeBatch(db);
        
        // Reactivate the selected shift to 'temp-active'
        const shiftToReactivateRef = doc(db, 'shifts', shiftId);
        batch.update(shiftToReactivateRef, { status: 'temp-active', endTime: null });

        await batch.commit();
    };

    const closeShift = async (shiftId: string) => {
        const shiftToClose = shifts.find(s => s.id === shiftId);
        if (!shiftToClose) {
            console.error("Shift to close not found in local state.");
            return;
        }

        const batch = writeBatch(db);
        const shiftRef = doc(db, 'shifts', shiftId);

        // Update shift status
        batch.update(shiftRef, {
            status: 'closed',
            endTime: new Date().toISOString()
        });

        // Release the device if it's associated with this shift
        if (shiftToClose.posDeviceId) {
            const deviceRef = doc(db, 'pos_devices', shiftToClose.posDeviceId);
            batch.update(deviceRef, { in_use_by_shift_id: null });
        }

        await batch.commit();
    };

    const value: SettingsContextType = {
        featureSettings, setFeatureSettings,
        branches, addBranch, updateBranch, deleteBranch,
        posDevices, addPosDevice, updatePosDevice, deletePosDevice,
        printers, addPrinter, updatePrinter, deletePrinter,
        receiptSettings, setReceiptSettings,
        paymentTypes, addPaymentType, updatePaymentType, deletePaymentType,
        taxes, addTax, updateTax, deleteTax,
        departments, setDepartments: setDepartmentsState,
        users, setUsers: setUsersState,
        products, setProducts,
        categories, setCategories,
        customers, setCustomers,
        sales, setSales,
        reservations, setReservations,
        debts, setDebts,
        voidedLogs, setVoidedLogs,
        openTickets, setOpenTickets,
        shifts,
        accessCodes,
        generateAccessCode,
        validateAndUseAccessCode,
        updateUserTempAccess,
        loggedInUser,
        loadingUser,
        logout,
        selectedBranch, setSelectedBranch,
        selectedDevice, setSelectedDevice,
        ownerSelectedBranch, setOwnerSelectedBranch,
        currency, setCurrency,
        getPermissionsForDepartment,
        debtToSettle, setDebtToSettle,
        printableData, setPrintableData,
        isPrintModalOpen, setIsPrintModalOpen,
        voidSale,
        reactivateShift,
        closeShift,
        deleteProduct,
        deleteVoidedLog,
        restoreVoidedLog,
    };

    return createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
