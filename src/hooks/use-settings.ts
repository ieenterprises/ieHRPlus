
"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, getDoc, writeBatch, where, query, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { AnyPermission } from '@/lib/permissions';
import type { User, StoreType, PosDeviceType, PaymentType, Role, PrinterType, ReceiptSettings, Tax, Sale, Debt, Reservation, Category, Product, OpenTicket, VoidedLog, UserRole, SaleItem } from '@/lib/types';
import { posPermissions, backOfficePermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, Unsubscribe } from "firebase/auth";

export type { FeatureSettings, StoreType, PosDeviceType, PrinterType, ReceiptSettings, PaymentType, Tax, Role, UserRole } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

export const MOCK_INITIAL_ROLES: Role[] = [
  { id: "role_owner", name: "Owner", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_admin", name: "Administrator", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_manager", name: "Manager", permissions: ["ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "VIEW_SALES_REPORTS", "MANAGE_ITEMS_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS", "VOID_SAVED_ITEMS", "CANCEL_RECEIPTS", "RESTORE_VOIDED_ITEMS", "PERMANENTLY_DELETE_VOIDS"] },
  { id: "role_cashier", name: "Cashier", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "MANAGE_CUSTOMERS", "VIEW_SALES_REPORTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
  { id: "role_waitress", name: "Waitress", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
  { id: "role_barman", name: "Bar Man", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
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
    debts: Debt[];
    reservations: Reservation[];
    voidedLogs: VoidedLog[];
    openTickets: OpenTicket[];
    
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
    currency: string;
    setCurrency: (value: React.SetStateAction<string>) => void;
    getPermissionsForRole: (role: UserRole) => AnyPermission[];

    // Cross-page state
    debtToSettle: Sale | null;
    setDebtToSettle: React.Dispatch<React.SetStateAction<Sale | null>>;
    printableData: any | null;
    setPrintableData: React.Dispatch<React.SetStateAction<any | null>>;

    // Direct state setters for complex pages
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
    setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
    setOpenTickets: React.Dispatch<React.SetStateAction<OpenTicket[]>>;
    setVoidedLogs: React.Dispatch<React.SetStateAction<VoidedLog[]>>;


    // Voiding and ticket logic
    voidSale: (saleId: string, voidedByEmployeeId: string) => Promise<void>;
    voidTicket: (ticketId: string, voidedByEmployeeId: string) => Promise<void>;
    saveTicket: (ticket: any) => Promise<void>;
    deleteTicket: (ticketId: string) => Promise<void>;
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
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [products, setProductsState] = useState<Product[]>([]);
    const [categories, setCategoriesState] = useState<Category[]>([]);
    const [customers, setCustomersState] = useState<Customer[]>([]);
    const [sales, setSalesState] = useState<Sale[]>([]);
    const [debts, setDebtsState] = useState<Debt[]>([]);
    const [reservations, setReservationsState] = useState<Reservation[]>([]);
    const [voidedLogs, setVoidedLogsState] = useState<VoidedLog[]>([]);
    const [openTickets, setOpenTicketsState] = useState<OpenTicket[]>([]);
    const [currency, setCurrencyState] = useState<string>('$');
    
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    
    // Local session state
    const [selectedStore, setSelectedStore] = useLocalStorage<StoreType | null>('selectedStore', null);
    const [selectedDevice, setSelectedDevice] = useLocalStorage<PosDeviceType | null>('selectedDevice', null);
    const [debtToSettle, setDebtToSettle] = useLocalStorage<Sale | null>('debtToSettle', null);
    const [printableData, setPrintableData] = useLocalStorage<any | null>('printableData', null);
    
    const router = useRouter();

    const fetchAndSetUser = useCallback(async (uid: string) => {
        setLoadingUser(true);
        try {
            // Wait for the ready flag to ensure the user document is created.
            let ready = false;
            let attempts = 0;
            while (!ready && attempts < 10) { // 5 seconds timeout
                const readyFlagDoc = await getDoc(doc(db, "_user_ready_flags", uid));
                if (readyFlagDoc.exists()) {
                    ready = true;
                } else {
                    attempts++;
                    await new Promise(res => setTimeout(res, 500));
                }
            }

            if (!ready) {
                console.error("User profile ready flag not found after timeout for UID:", uid);
                setLoadingUser(false);
                logout(); // Log out user if profile cannot be found
                return null;
            }
            
            // Once ready, fetch the actual user profile
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
                 logout(); // Log out user if profile cannot be found
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
            // Clean up old listeners
            subscriptions.forEach(sub => sub());
            subscriptions.length = 0;

            if (user) {
                const userProfile = await fetchAndSetUser(user.uid);
                if (userProfile) {
                    const collections = {
                        users: setUsers,
                        roles: setRoles,
                        categories: setCategoriesState,
                        products: setProductsState,
                        customers: setCustomersState,
                        sales: setSalesState,
                        debts: setDebtsState,
                        reservations: setReservationsState,
                        open_tickets: setOpenTicketsState,
                        voided_logs: setVoidedLogsState,
                        stores: setStores,
                        pos_devices: setPosDevices,
                        printers: setPrinters,
                        taxes: setTaxes,
                        payment_types: setPaymentTypes,
                    };

                    Object.entries(collections).forEach(([name, setter]) => {
                        const q = collection(db, name);
                        const unsubscribe = onSnapshot(q, (snapshot) => {
                            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            // This is a type assertion, be careful with it.
                            setter(data as any);
                        }, (error) => {
                            console.error(`Error fetching ${name}:`, error);
                        });
                        subscriptions.push(unsubscribe);
                    });

                    // Settings are often a single doc
                    const settingsDocRef = doc(db, 'settings', 'global');
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
                // Clear all local data on logout
                setUsers([]); setRoles([]); setCategoriesState([]); setProductsState([]);
                setCustomersState([]); setSalesState([]); setDebtsState([]); setReservationsState([]);
                setOpenTicketsState([]); setVoidedLogsState([]); setStores([]); setPosDevices([]);
                setPrinters([]); setTaxes([]);
            }
        });
    
        return () => {
            unsubscribeAuth();
            subscriptions.forEach(sub => sub());
        };
    }, [fetchAndSetUser]);
    

    const logout = async () => {
        await auth.signOut();
        setLoggedInUser(null);
        setSelectedStore(null);
        setSelectedDevice(null);
        // Clear local storage manually for session-specific items
        window.localStorage.removeItem('selectedStore');
        window.localStorage.removeItem('selectedDevice');
        router.push('/sign-in');
    };

    const getPermissionsForRole = useCallback((role: UserRole) => {
        const roleData = roles.find(r => r.name === role);
        return roleData?.permissions || [];
    }, [roles]);

    // DB Write Functions
    const setSettingsDoc = async (data: any) => {
        const settingsDocRef = doc(db, 'settings', 'global');
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
    
    // Generic CRUD Functions
    const addDocFactory = (collectionName: string) => async (data: any) => { await addDoc(collection(db, collectionName), data); };
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

    const setProducts = async (value: React.SetStateAction<Product[]>) => {
        const newProducts = typeof value === 'function' ? value(products) : value;
        const oldProductIds = new Set(products.map(p => p.id));
        const newProductIds = new Set(newProducts.map(p => p.id));
        
        const batch = writeBatch(db);

        for (const product of newProducts) {
            const productRef = doc(db, 'products', product.id);
            if (!oldProductIds.has(product.id) || JSON.stringify(products.find(p=>p.id === product.id)) !== JSON.stringify(product)) {
                 batch.set(productRef, product);
            }
        }

        for (const oldProduct of products) {
            if (!newProductIds.has(oldProduct.id)) {
                batch.delete(doc(db, 'products', oldProduct.id));
            }
        }
        await batch.commit();
        setProductsState(newProducts);
    };

    const setCategories = async (value: React.SetStateAction<Category[]>) => {
        const newItems = typeof value === 'function' ? value(categories) : value;
        const oldIds = new Set(categories.map(c => c.id));
        const newIds = new Set(newItems.map(c => c.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const ref = doc(db, 'categories', item.id);
            if (!oldIds.has(item.id) || JSON.stringify(categories.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, item);
            }
        });
        categories.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'categories', item.id));
            }
        });
        await batch.commit();
        setCategoriesState(newItems);
    };

    const setCustomers = async (value: React.SetStateAction<Customer[]>) => {
        const newItems = typeof value === 'function' ? value(customers) : value;
        const oldIds = new Set(customers.map(c => c.id));
        const newIds = new Set(newItems.map(c => c.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const ref = doc(db, 'customers', item.id);
             if (!oldIds.has(item.id) || JSON.stringify(customers.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, item);
            }
        });
        customers.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'customers', item.id));
            }
        });
        await batch.commit();
        setCustomersState(newItems);
    };

    const setSales = async (value: React.SetStateAction<Sale[]>) => {
        const newItems = typeof value === 'function' ? value(sales) : value;
        const oldIds = new Set(sales.map(s => s.id));
        const newIds = new Set(newItems.map(s => s.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
             const { customers, users, pos_devices, ...saleData } = item;
            const ref = doc(db, 'sales', item.id);
             if (!oldIds.has(item.id) || JSON.stringify(sales.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, saleData);
            }
        });
        sales.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'sales', item.id));
            }
        });
        await batch.commit();
        setSalesState(newItems);
    };

    const setDebts = async (value: React.SetStateAction<Debt[]>) => {
        const newItems = typeof value === 'function' ? value(debts) : value;
        const oldIds = new Set(debts.map(d => d.id));
        const newIds = new Set(newItems.map(d => d.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const { sales, customers, ...debtData } = item;
            const ref = doc(db, 'debts', item.id);
            if (!oldIds.has(item.id) || JSON.stringify(debts.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, debtData);
            }
        });
        debts.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'debts', item.id));
            }
        });
        await batch.commit();
        setDebtsState(newItems);
    };

    const setReservations = async (value: React.SetStateAction<Reservation[]>) => {
        const newItems = typeof value === 'function' ? value(reservations) : value;
        const oldIds = new Set(reservations.map(r => r.id));
        const newIds = new Set(newItems.map(r => r.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const { products, ...resData } = item;
            const ref = doc(db, 'reservations', item.id);
            if (!oldIds.has(item.id) || JSON.stringify(reservations.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, resData);
            }
        });
        reservations.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'reservations', item.id));
            }
        });
        await batch.commit();
        setReservationsState(newItems);
    };

    const setOpenTickets = async (value: React.SetStateAction<OpenTicket[]>) => {
        const newItems = typeof value === 'function' ? value(openTickets) : value;
        const oldIds = new Set(openTickets.map(t => t.id));
        const newIds = new Set(newItems.map(t => t.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const { users, customers, ...ticketData } = item;
            const ref = doc(db, 'open_tickets', item.id);
            if (!oldIds.has(item.id) || JSON.stringify(openTickets.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, ticketData);
            }
        });
        openTickets.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'open_tickets', item.id));
            }
        });
        await batch.commit();
        setOpenTicketsState(newItems);
    };

    const setVoidedLogs = async (value: React.SetStateAction<VoidedLog[]>) => {
        const newItems = typeof value === 'function' ? value(voidedLogs) : value;
        const oldIds = new Set(voidedLogs.map(v => v.id));
        const newIds = new Set(newItems.map(v => v.id));
        const batch = writeBatch(db);
        newItems.forEach(item => {
            const { users, ...logData } = item;
            const ref = doc(db, 'voided_logs', item.id);
             if (!oldIds.has(item.id) || JSON.stringify(voidedLogs.find(c=>c.id === item.id)) !== JSON.stringify(item)) {
                batch.set(ref, logData);
            }
        });
        voidedLogs.forEach(item => {
            if (!newIds.has(item.id)) {
                batch.delete(doc(db, 'voided_logs', item.id));
            }
        });
        await batch.commit();
        setVoidedLogsState(newItems);
    };

    const voidSale = async (saleId: string, voidedByEmployeeId: string) => {
        const saleToVoid = sales.find(s => s.id === saleId);
        if (!saleToVoid) return;

        const batch = writeBatch(db);

        // 1. Add to voided logs
        const voidedLogRef = doc(collection(db, 'voided_logs'));
        const { customers, users, pos_devices, ...saleData } = saleToVoid;
        batch.set(voidedLogRef, {
            type: 'receipt',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: saleData,
        });

        // 2. Delete original sale
        batch.delete(doc(db, 'sales', saleId));

        // 3. Delete associated debt if exists
        const debtQuery = query(collection(db, 'debts'), where('sale_id', '==', saleId));
        const debtSnapshot = await getDocs(debtQuery);
        debtSnapshot.forEach(doc => batch.delete(doc.ref));

        // 4. Delete associated reservation and update room status
        const resQuery = query(collection(db, 'reservations'), where('sale_id', '==', saleId));
        const resSnapshot = await getDocs(resQuery);
        resSnapshot.forEach(doc => {
            const reservation = doc.data() as Reservation;
            if (reservation.product_id) {
                const productRef = doc(db, 'products', reservation.product_id);
                batch.update(productRef, { status: 'Available' });
            }
            batch.delete(doc.ref);
        });

        await batch.commit();
    };

    const voidTicket = async (ticketId: string, voidedByEmployeeId: string) => {
        if (!ticketId) {
            console.error("voidTicket called with invalid ticketId");
            return;
        }
        const ticketToVoid = openTickets.find(t => t.id === ticketId);
        if (!ticketToVoid) return;

        const batch = writeBatch(db);
        // 1. Add to voided logs
        const voidedLogRef = doc(collection(db, 'voided_logs'));
        const { users, customers, ...ticketData } = ticketToVoid;
        batch.set(voidedLogRef, {
            type: 'ticket',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: ticketData,
        });
        // 2. Delete original ticket
        batch.delete(doc(db, 'open_tickets', ticketId));
        await batch.commit();
    };

    const saveTicket = async (ticketData: any) => {
        if (ticketData.id) {
            const ticketRef = doc(db, 'open_tickets', ticketData.id);
            await updateDoc(ticketRef, ticketData);
        } else {
            await addDoc(collection(db, 'open_tickets'), {
                ...ticketData,
                created_at: new Date().toISOString(),
            });
        }
    };
    
    const deleteTicket = async (ticketId: string) => {
        if (ticketId) {
            await deleteDoc(doc(db, 'open_tickets', ticketId));
        }
    };

    const value: SettingsContextType = {
        featureSettings, setFeatureSettings,
        stores, addStore, updateStore, deleteStore,
        posDevices, addPosDevice, updatePosDevice, deletePosDevice,
        printers, addPrinter, updatePrinter, deletePrinter,
        receiptSettings, setReceiptSettings,
        paymentTypes, addPaymentType, updatePaymentType, deletePaymentType,
        taxes, addTax, updateTax, deleteTax,
        roles,
        users,
        products, setProducts,
        categories, setCategories,
        customers, setCustomers,
        sales, setSales,
        debts, setDebts,
        reservations, setReservations,
        voidedLogs, setVoidedLogs,
        openTickets, setOpenTickets,
        loggedInUser,
        loadingUser,
        logout,
        selectedStore, setSelectedStore,
        selectedDevice, setSelectedDevice,
        currency, setCurrency,
        getPermissionsForRole,
        debtToSettle, setDebtToSettle,
        printableData, setPrintableData,
        voidSale,
        voidTicket,
        saveTicket,
        deleteTicket,
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
