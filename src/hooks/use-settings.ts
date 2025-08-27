

"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, getDoc, writeBatch, where, query, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { AnyPermission } from '@/lib/permissions';
import type { User, StoreType, PosDeviceType, PaymentType, Role, PrinterType, ReceiptSettings, Tax, Sale, Debt, Reservation, Category, Product, OpenTicket, VoidedLog, UserRole, SaleItem, Shift } from '@/lib/types';
import { posPermissions, backOfficePermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { useOnlineStatus } from './use-online-status';

export type { FeatureSettings, StoreType, PosDeviceType, PrinterType, ReceiptSettings, PaymentType, Tax, Role, UserRole } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

export const MOCK_INITIAL_ROLES: Role[] = [
  { id: "role_owner", name: "Owner", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_admin", name: "Administrator", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_manager", name: "Manager", permissions: ["ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "VIEW_SALES_REPORTS", "MANAGE_ITEMS_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS", "VOID_SAVED_ITEMS", "CANCEL_RECEIPTS", "RESTORE_VOIDED_ITEMS", "PERMANENTLY_DELETE_VOIDS", "SETTLE_PREVIOUS_SHIFT_DEBTS", "MANAGE_SHIFTS"] },
  { id: "role_cashier", name: "Cashier", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "MANAGE_CUSTOMERS", "VIEW_SALES_REPORTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS", "MANAGE_OPEN_TICKETS"] },
  { id: "role_waitress", name: "Waitress", permissions: ["ACCEPT_PAYMENTS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
  { id: "role_barman", name: "Bar Man", permissions: ["ACCEPT_PAYMENTS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
];

// --- Context and Provider ---

type SettingsContextType = {
    // Data states
    featureSettings: FeatureSettings;
    stores: StoreType[];
    posDevices: PosDeviceType[];
    printers: PrinterType[];
    receiptSettings: Record<string, ReceiptSettings>;
    paymentTypes: PaymentType[];
    taxes: Tax[];
    roles: Role[];
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
    
    // Data setters (now write to DB)
    setFeatureSettings: (value: React.SetStateAction<FeatureSettings>) => void;
    addStore: (store: Omit<StoreType, 'id'>) => Promise<void>;
    updateStore: (id: string, store: Partial<StoreType>) => Promise<void>;
    deleteStore: (id: string) => Promise<void>;
    addPosDevice: (device: Omit<PosDeviceType, 'id'>) => Promise<void>;
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
    
    // Auth and session state
    loggedInUser: User | null;
    loadingUser: boolean;
    logout: () => void;
    
    selectedStore: StoreType | null;
    setSelectedStore: React.Dispatch<React.SetStateAction<StoreType | null>>;
    selectedDevice: PosDeviceType | null;
    setSelectedDevice: React.Dispatch<React.SetStateAction<PosDeviceType | null>>;
    ownerSelectedStore: StoreType | null;
    setOwnerSelectedStore: React.Dispatch<React.SetStateAction<StoreType | null>>;
    currency: string;
    setCurrency: (value: React.SetStateAction<string>) => void;
    getPermissionsForRole: (role: UserRole) => AnyPermission[];

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
    setRoles: (value: React.SetStateAction<Role[]>) => void;
    setUsers: (value: React.SetStateAction<User[]>) => void;

    // Voiding and ticket logic
    voidSale: (saleId: string, voidedByEmployeeId: string) => Promise<void>;
    reactivateShift: (shiftId: string, userId: string) => Promise<void>;
    closeShift: (shiftId: string) => Promise<void>;
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
    const [stores, setStores] = useState<StoreType[]>([]);
    const [posDevices, setPosDevices] = useState<PosDeviceType[]>([]);
    const [printers, setPrinters] = useState<PrinterType[]>([]);
    const [receiptSettings, setReceiptSettingsState] = useState<Record<string, ReceiptSettings>>({});
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [users, setUsersState] = useState<User[]>([]);
    const [roles, setRolesState] = useState<Role[]>([]);
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
    
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    
    // Local session state
    const [selectedStore, setSelectedStore] = useLocalStorage<StoreType | null>('selectedStore', null);
    const [selectedDevice, setSelectedDevice] = useLocalStorage<PosDeviceType | null>('selectedDevice', null);
    const [ownerSelectedStore, setOwnerSelectedStore] = useLocalStorage<StoreType | null>('ownerSelectedStore', null);
    const [debtToSettle, setDebtToSettle] = useLocalStorage<Sale | null>('debtToSettle', null);
    
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
                        roles: setRolesState,
                        categories: setCategoriesState,
                        products: setProductsState,
                        customers: setCustomersState,
                        sales: setSalesState,
                        reservations: setReservationsState,
                        open_tickets: setOpenTicketsState,
                        voided_logs: setVoidedLogsState,
                        debts: setDebtsState,
                        stores: setStores,
                        pos_devices: setPosDevices,
                        printers: setPrinters,
                        taxes: setTaxes,
                        payment_types: setPaymentTypes,
                        shifts: setShiftsState,
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
                const collections = [setUsersState, setRolesState, setCategoriesState, setProductsState, setCustomersState, setSalesState, setReservationsState, setOpenTicketsState, setVoidedLogsState, setDebtsState, setStores, setPosDevices, setPrinters, setTaxes, setPaymentTypes, setShiftsState];
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
            const shiftsCollection = collection(db, 'shifts');
            const q = query(shiftsCollection, where('userId', '==', loggedInUser.id), where('status', '==', 'active'), where('businessId', '==', loggedInUser.businessId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((shiftDoc) => {
                batch.update(doc(db, 'shifts', shiftDoc.id), { status: 'closed', endTime: new Date().toISOString() });
            });
            await batch.commit();
        }

        await auth.signOut();
        setLoggedInUser(null);
        setSelectedStore(null);
        setSelectedDevice(null);
        setOwnerSelectedStore(null);
        window.localStorage.removeItem('selectedStore');
        window.localStorage.removeItem('selectedDevice');
        window.localStorage.removeItem('ownerSelectedStore');
        router.push('/sign-in');
    };

    const getPermissionsForRole = useCallback((role: UserRole) => {
        const roleData = roles.find(r => r.name === role);
        return roleData?.permissions || [];
    }, [roles]);

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
    
    const addDocFactory = (collectionName: string) => async (data: any) => { 
        if (!loggedInUser?.businessId) return;
        await addDoc(collection(db, collectionName), { ...data, businessId: loggedInUser.businessId }); 
    };
    const updateDocFactory = (collectionName: string) => async (id: string, data: any) => { await updateDoc(doc(db, collectionName, id), data); };
    const deleteDocFactory = (collectionName: string) => async (id: string) => { await deleteDoc(doc(db, collectionName, id)); };

    const addStore = addDocFactory('stores');
    const updateStore = updateDocFactory('stores');
    const deleteStore = deleteDocFactory('stores');
    const addPosDevice = addDocFactory('pos_devices');
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

    const createBatchSetter = <T extends {id?: string}>(collectionName: string, localState: T[], localSetter: React.Dispatch<React.SetStateAction<T[]>>) => 
        async (value: React.SetStateAction<T[]>) => {
        if (!loggedInUser?.businessId) return;
        
        const newItems = typeof value === 'function' ? value(localState) : value;
        localSetter(newItems); // Optimistic UI update

        const oldIds = new Set(localState.map(item => item.id).filter(Boolean));
        const newIds = new Set(newItems.map(item => item.id).filter(Boolean));
        const batch = writeBatch(db);

        newItems.forEach(item => {
            const docId = item.id;
            if (!docId) return; // Should not happen if items are created with an ID
            
            const ref = doc(db, collectionName, docId);
            const oldItem = localState.find(i => i.id === item.id);
            
            // Set (create or overwrite) if it's a new item or a changed item
            if (!oldIds.has(docId) || JSON.stringify(oldItem) !== JSON.stringify(item)) {
                const itemWithBusinessId = { ...item, businessId: loggedInUser.businessId };
                batch.set(ref, itemWithBusinessId, { merge: true });
            }
        });

        localState.forEach(item => {
            if (item.id && !newIds.has(item.id)) {
                batch.delete(doc(db, collectionName, item.id));
            }
        });
        
        try {
            await batch.commit();
        } catch (error) {
            console.error(`Error during batch write to ${collectionName}:`, error);
            // Optionally, revert the optimistic UI update
            localSetter(localState);
        }
    };

    const setProducts = createBatchSetter('products', products, setProductsState);
    const setCategories = createBatchSetter('categories', categories, setCategoriesState);
    const setCustomers = createBatchSetter('customers', customers, setCustomersState);
    const setSales = createBatchSetter('sales', sales, setSalesState);
    const setReservations = createBatchSetter('reservations', reservations, setReservationsState);
    const setDebts = createBatchSetter('debts', debts, setDebtsState);
    const setOpenTickets = createBatchSetter('open_tickets', openTickets, setOpenTicketsState);
    const setVoidedLogs = createBatchSetter('voided_logs', voidedLogs, setVoidedLogsState);

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
    
    const reactivateShift = async (shiftId: string, userId: string) => {
        if (!loggedInUser?.businessId) throw new Error("Not logged in or no business ID found.");

        const batch = writeBatch(db);
        
        // Reactivate the selected shift to 'temp-active'
        const shiftToReactivateRef = doc(db, 'shifts', shiftId);
        batch.update(shiftToReactivateRef, { status: 'temp-active', endTime: null });

        await batch.commit();
    };

    const closeShift = async (shiftId: string) => {
        const shiftRef = doc(db, 'shifts', shiftId);
        await updateDoc(shiftRef, {
            status: 'closed',
            endTime: new Date().toISOString()
        });
    };

    const value: SettingsContextType = {
        featureSettings, setFeatureSettings,
        stores, addStore, updateStore, deleteStore,
        posDevices, addPosDevice, updatePosDevice, deletePosDevice,
        printers, addPrinter, updatePrinter, deletePrinter,
        receiptSettings, setReceiptSettings,
        paymentTypes, addPaymentType, updatePaymentType, deletePaymentType,
        taxes, addTax, updateTax, deleteTax,
        roles, setRoles: setRolesState,
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
        loggedInUser,
        loadingUser,
        logout,
        selectedStore, setSelectedStore,
        selectedDevice, setSelectedDevice,
        ownerSelectedStore, setOwnerSelectedStore,
        currency, setCurrency,
        getPermissionsForRole,
        debtToSettle, setDebtToSettle,
        printableData, setPrintableData,
        isPrintModalOpen, setIsPrintModalOpen,
        voidSale,
        reactivateShift,
        closeShift,
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

    

    