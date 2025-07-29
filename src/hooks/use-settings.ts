
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

const MOCK_PAYMENT_TYPES: PaymentType[] = [
    { id: 'pay_1', name: 'Cash', type: 'Cash' },
    { id: 'pay_2', name: 'Card', type: 'Card' },
    { id: 'pay_3', name: 'Credit', type: 'Credit' },
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
    setFeatureSettings: React.Dispatch<React.SetStateAction<FeatureSettings>>;
    setStores: React.Dispatch<React.SetStateAction<StoreType[]>>; // Keep simple setters for complex page logic
    setPosDevices: React.Dispatch<React.SetStateAction<PosDeviceType[]>>;
    setPrinters: React.Dispatch<React.SetStateAction<PrinterType[]>>;
    setReceiptSettings: React.Dispatch<React.SetStateAction<Record<string, ReceiptSettings>>>;
    setPaymentTypes: React.Dispatch<React.SetStateAction<PaymentType[]>>;
    setTaxes: React.Dispatch<React.SetStateAction<Tax[]>>;
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
    setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
    setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
    setVoidedLogs: React.Dispatch<React.SetStateAction<VoidedLog[]>>;
    setOpenTickets: React.Dispatch<React.SetStateAction<OpenTicket[]>>;
    
    // Auth and session state
    loggedInUser: User | null;
    loadingUser: boolean;
    logout: () => void;
    
    selectedStore: StoreType | null;
    setSelectedStore: React.Dispatch<React.SetStateAction<StoreType | null>>;
    selectedDevice: PosDeviceType | null;
    setSelectedDevice: React.Dispatch<React.SetStateAction<PosDeviceType | null>>;
    currency: string;
    setCurrency: React.Dispatch<React.SetStateAction<string>>;
    getPermissionsForRole: (role: UserRole) => AnyPermission[];

    // Cross-page state
    debtToSettle: Sale | null;
    setDebtToSettle: React.Dispatch<React.SetStateAction<Sale | null>>;
    printableData: any | null;
    setPrintableData: React.Dispatch<React.SetStateAction<any | null>>;


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
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>(MOCK_PAYMENT_TYPES);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [voidedLogs, setVoidedLogs] = useState<VoidedLog[]>([]);
    const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
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
        let userProfile: User | null = null;
        let attempts = 0;
        while (userProfile === null && attempts < 5) {
            try {
                const userDocRef = doc(db, "users", uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    userProfile = { id: userDoc.id, ...userDoc.data() } as User;
                } else {
                    attempts++;
                    await new Promise(res => setTimeout(res, 500)); // Wait before retrying
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                break; // Exit loop on error
            }
        }

        if (userProfile) {
            setLoggedInUser(userProfile);
        } else {
            console.error("User profile not found in database for UID:", uid);
        }
        setLoadingUser(false);
        return userProfile;
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
                        categories: setCategories,
                        products: setProducts,
                        customers: setCustomers,
                        sales: setSales,
                        debts: setDebts,
                        reservations: setReservations,
                        open_tickets: setOpenTickets,
                        voided_logs: setVoidedLogs,
                        stores: setStores,
                        pos_devices: setPosDevices,
                        printers: setPrinters,
                        taxes: setTaxes,
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
                setUsers([]); setRoles([]); setCategories([]); setProducts([]);
                setCustomers([]); setSales([]); setDebts([]); setReservations([]);
                setOpenTickets([]); setVoidedLogs([]); setStores([]); setPosDevices([]);
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
    
    const voidSale = async (saleId: string, voidedByEmployeeId: string) => {
        const saleToVoid = sales.find(s => s.id === saleId);
        if (!saleToVoid) return;

        const batch = writeBatch(db);

        // 1. Add to voided logs
        const voidedLogRef = doc(collection(db, 'voided_logs'));
        batch.set(voidedLogRef, {
            type: 'receipt',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: saleToVoid,
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
        const ticketToVoid = openTickets.find(t => t.id === ticketId);
        if (!ticketToVoid) return;

        const batch = writeBatch(db);
        // 1. Add to voided logs
        const voidedLogRef = doc(collection(db, 'voided_logs'));
        batch.set(voidedLogRef, {
            type: 'ticket',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: ticketToVoid,
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
        await deleteDoc(doc(db, 'open_tickets', ticketId));
    };

    const value: SettingsContextType = {
        featureSettings, setFeatureSettings,
        stores, setStores,
        posDevices, setPosDevices,
        printers, setPrinters,
        receiptSettings, setReceiptSettings,
        paymentTypes, setPaymentTypes,
        taxes, setTaxes,
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
