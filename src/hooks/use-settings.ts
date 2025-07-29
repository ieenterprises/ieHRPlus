

"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, getDoc, writeBatch, where, query, getDocs } from "firebase/firestore";
import type { AnyPermission } from '@/lib/permissions';
import type { User, StoreType, PosDeviceType, PaymentType, Role, PrinterType, ReceiptSettings, Tax, Sale, Debt, Reservation, Category, Product, OpenTicket, VoidedLog, UserRole } from '@/lib/types';
import { posPermissions, backOfficePermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { subDays, addDays } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";

export type { FeatureSettings, StoreType, PosDeviceType, PrinterType, ReceiptSettings, PaymentType, Tax, Role, UserRole } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

// --- MOCK DATA ---

const MOCK_INITIAL_ROLES: Role[] = [
  { id: "role_owner", name: "Owner", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_admin", name: "Administrator", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "role_manager", name: "Manager", permissions: ["ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "VIEW_SALES_REPORTS", "MANAGE_ITEMS_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS", "VOID_SAVED_ITEMS", "CANCEL_RECEIPTS", "RESTORE_VOIDED_ITEMS", "PERMANENTLY_DELETE_VOIDS"] },
  { id: "role_cashier", name: "Cashier", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "MANAGE_CUSTOMERS", "VIEW_SALES_REPORTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
  { id: "role_waitress", name: "Waitress", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
  { id: "role_barman", name: "Bar Man", permissions: ["ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "VOID_SAVED_ITEMS", "RESTORE_VOIDED_ITEMS"] },
];

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'Food', created_at: new Date().toISOString() },
    { id: 'cat_2', name: 'Beverage', created_at: new Date().toISOString() },
    { id: 'cat_3', name: 'Room', created_at: new Date().toISOString() },
];

const MOCK_PRODUCTS: Product[] = [
    { id: 'prod_1', name: 'Cheeseburger', price: 12.99, stock: 50, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: new Date().toISOString(), status: 'Available' },
    { id: 'prod_2', name: 'Fries', price: 4.99, stock: 100, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: new Date().toISOString(), status: 'Available' },
    { id: 'prod_3', name: 'Coca-Cola', price: 2.50, stock: 200, category_id: 'cat_2', image_url: 'https://placehold.co/300x200.png', created_at: new Date().toISOString(), status: 'Available' },
    { id: 'prod_4', name: 'Room 210', price: 150.00, stock: 1, category_id: 'cat_3', image_url: 'https://placehold.co/300x200.png', created_at: new Date().toISOString(), status: 'Occupied' },
    { id: 'prod_5', name: 'Room 211', price: 250.00, stock: 1, category_id: 'cat_3', image_url: 'https://placehold.co/300x200.png', created_at: new Date().toISOString(), status: 'Occupied' },
];

const MOCK_CUSTOMERS: Customer[] = [
    { id: 'cust_1', name: 'Walk-in Customer', email: 'walkin@example.com', phone: null, created_at: new Date().toISOString() },
    { id: 'cust_2', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', created_at: new Date().toISOString() },
    { id: 'cust_3', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', created_at: new Date().toISOString() },
];

const MOCK_STORES: StoreType[] = [
    { id: 'store_1', name: 'Main Branch', address: '123 Main St, Anytown, USA' },
    { id: 'store_2', name: 'Casoni Outdoor Bar', address: '456 Oak Ave, Sometown, USA' },
];

const MOCK_POS_DEVICES: PosDeviceType[] = [
    { id: 'pos_1', name: 'Front Counter', store_id: 'store_1' },
    { id: 'pos_2', name: 'Bar Terminal', store_id: 'store_1' },
    { id: 'pos_3', name: 'Outdoor Bar POS', store_id: 'store_2' },
];

const MOCK_PRINTERS: PrinterType[] = [
    { id: 'printer_1', name: 'Kitchen Printer', connection_type: 'Network', ip_address: '192.168.1.100', pos_device_id: 'pos_1' },
    { id: 'printer_2', name: 'Receipt Printer', connection_type: 'Bluetooth', pos_device_id: 'pos_1' },
    { id: 'printer_3', name: 'Bar Receipt Printer', connection_type: 'Network', ip_address: '192.168.1.102', pos_device_id: 'pos_3' },
];

const MOCK_RECEIPT_SETTINGS: Record<string, ReceiptSettings> = {
  'store_1': { header: "Welcome to Main Branch!", footer: "Thanks for visiting Main Branch!", emailedLogo: null, printedLogo: 'https://placehold.co/100x100.png?text=MB', showCustomerInfo: true, showComments: true, language: 'en' },
  'store_2': { header: 'CASONI PREMIUM CLUB Experience Luxury & Lifestyle', footer: 'Thank you for choosing Casoni Premium Club!', emailedLogo: null, printedLogo: null, showCustomerInfo: false, showComments: false, language: 'en' },
};

const MOCK_PAYMENT_TYPES: PaymentType[] = [
    { id: 'pay_1', name: 'Cash', type: 'Cash' },
    { id: 'pay_2', name: 'Card', type: 'Card' },
    { id: 'pay_3', name: 'Credit', type: 'Credit' },
];

const MOCK_TAXES: Tax[] = [
    { id: 'tax_1', name: 'VAT', rate: 8, is_default: true, type: 'Added' },
    { id: 'tax_2', name: 'Service Charge', rate: 10, is_default: false, type: 'Added' },
];

const MOCK_SALES: Sale[] = [
    { id: 'sale_res_1', order_number: 1001, created_at: subDays(new Date(), 2).toISOString(), items: [{id: 'prod_4', name: 'Room 210', quantity: 1, price: 150.00}], total: 150.00, payment_methods: ['Cash'], customer_id: 'cust_2', employee_id: 'user_1', pos_device_id: 'pos_1', status: 'Fulfilled', customers: MOCK_CUSTOMERS[1], users: {name: 'Ada Lovelace'}, pos_devices: {store_id: 'store_1'} },
    { id: 'sale_res_2', order_number: 1002, created_at: subDays(new Date(), 1).toISOString(), items: [{id: 'prod_5', name: 'Room 211', quantity: 1, price: 250.00}], total: 250.00, payment_methods: ['Credit'], customer_id: 'cust_3', employee_id: 'user_2', pos_device_id: 'pos_1', status: 'Fulfilled', customers: MOCK_CUSTOMERS[2], users: {name: 'Grace Hopper'}, pos_devices: {store_id: 'store_1'} },
]; 
const MOCK_DEBTS: Debt[] = [
    { id: 'debt_res_1', sale_id: 'sale_res_2', customer_id: 'cust_3', amount: 250.00, status: 'Unpaid', created_at: subDays(new Date(), 1).toISOString(), sales: {order_number: 1002}, customers: {name: MOCK_CUSTOMERS[2].name} }
];
const MOCK_RESERVATIONS: Reservation[] = [
    { id: 'res_1', guest_name: 'John Doe', product_id: 'prod_4', check_in: subDays(new Date(), 2).toISOString(), check_out: addDays(new Date(), 3).toISOString(), status: 'Checked-in', sale_id: 'sale_res_1', created_at: subDays(new Date(), 2).toISOString(), products: {name: 'Room 210', price: 150.00} },
    { id: 'res_2', guest_name: 'Jane Smith', product_id: 'prod_5', check_in: subDays(new Date(), 1).toISOString(), check_out: addDays(new Date(), 5).toISOString(), status: 'Checked-in', sale_id: 'sale_res_2', created_at: subDays(new Date(), 1).toISOString(), products: {name: 'Room 211', price: 250.00} },
];
const MOCK_OPEN_TICKETS: OpenTicket[] = [];

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
    
    // Data setters
    setFeatureSettings: React.Dispatch<React.SetStateAction<FeatureSettings>>;
    setStores: React.Dispatch<React.SetStateAction<StoreType[]>>;
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
    voidSale: (saleId: string, voidedByEmployeeId: string) => void;
    voidTicket: (ticketId: string, voidedByEmployeeId: string) => void;
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
    const [featureSettings, setFeatureSettings] = useLocalStorage<FeatureSettings>('featureSettings', { open_tickets: true, reservations: true, shifts: true, time_management: false, kitchen_printers: true, dining_options: true, customer_displays: false });
    const [stores, setStores] = useLocalStorage<StoreType[]>('stores', MOCK_STORES);
    const [posDevices, setPosDevices] = useLocalStorage<PosDeviceType[]>('posDevices', MOCK_POS_DEVICES);
    const [printers, setPrinters] = useLocalStorage<PrinterType[]>('printers', MOCK_PRINTERS);
    const [receiptSettings, setReceiptSettings] = useLocalStorage<Record<string, ReceiptSettings>>('receiptSettings', MOCK_RECEIPT_SETTINGS);
    const [paymentTypes, setPaymentTypes] = useLocalStorage<PaymentType[]>('paymentTypes', MOCK_PAYMENT_TYPES);
    const [taxes, setTaxes] = useLocalStorage<Tax[]>('taxes', MOCK_TAXES);
    
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    
    const [products, setProducts] = useLocalStorage<Product[]>('products', MOCK_PRODUCTS);
    const [categories, setCategories] = useLocalStorage<Category[]>('categories', MOCK_CATEGORIES);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', MOCK_CUSTOMERS);
    const [sales, setSales] = useLocalStorage<Sale[]>('sales', MOCK_SALES);
    const [debts, setDebts] = useLocalStorage<Debt[]>('debts', MOCK_DEBTS);
    const [reservations, setReservations] = useLocalStorage<Reservation[]>('reservations', MOCK_RESERVATIONS);
    const [voidedLogs, setVoidedLogs] = useLocalStorage<VoidedLog[]>('voidedLogs', []);
    const [openTickets, setOpenTickets] = useLocalStorage<OpenTicket[]>('openTickets', []);
    
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    
    const [selectedStore, setSelectedStore] = useLocalStorage<StoreType | null>('selectedStore', null);
    const [selectedDevice, setSelectedDevice] = useLocalStorage<PosDeviceType | null>('selectedDevice', null);
    const [currency, setCurrency] = useLocalStorage<string>('currency', '$');

    const [debtToSettle, setDebtToSettle] = useLocalStorage<Sale | null>('debtToSettle', null);
    const [printableData, setPrintableData] = useLocalStorage<any | null>('printableData', null);
    
    const router = useRouter();

    const fetchAndSetUser = useCallback(async (uid: string) => {
        try {
            // Add a small delay and retry mechanism
            let userDoc;
            for (let i = 0; i < 3; i++) {
                const userDocRef = doc(db, "users", uid);
                userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500)); // wait 500ms
            }

            if (userDoc && userDoc.exists()) {
                const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
                setLoggedInUser(userProfile);
                return userProfile;
            } else {
                console.error("User profile not found in database for UID:", uid);
                return null;
            }
        } catch(error) {
            console.error("Error fetching user profile:", error);
            setLoggedInUser(null);
            return null;
        } finally {
            setLoadingUser(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await fetchAndSetUser(user.uid);
            } else {
                setLoggedInUser(null);
                setLoadingUser(false);
            }
        });
        return () => unsubscribe();
    }, [fetchAndSetUser]);
    
    // Set up real-time listeners for users and roles
    useEffect(() => {
        const usersCollection = collection(db, "users");
        const rolesCollection = collection(db, "roles");

        const unsubUsers = onSnapshot(usersCollection, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
        });

        const unsubRoles = onSnapshot(rolesCollection, (snapshot) => {
            const rolesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
            if (rolesData.length > 0) {
                setRoles(rolesData);
            } else {
                 setRoles(MOCK_INITIAL_ROLES)
            }
        });

        return () => {
            unsubUsers();
            unsubRoles();
        };
    }, []);

    const logout = async () => {
        await auth.signOut();
        setLoggedInUser(null);
        setSelectedStore(null);
        setSelectedDevice(null);
        router.push('/sign-in');
    };

    const getPermissionsForRole = useCallback((role: UserRole) => {
        const roleData = roles.find(r => r.name === role);
        return roleData?.permissions || [];
    }, [roles]);

    const voidSale = useCallback((saleId: string, voidedByEmployeeId: string) => {
        const saleToVoid = sales.find(s => s.id === saleId);
        if (!saleToVoid) return;

        setVoidedLogs(prev => [...prev, {
            id: `void_${new Date().getTime()}`,
            type: 'receipt',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: saleToVoid,
            users: null,
        }]);

        setSales(prev => prev.filter(s => s.id !== saleId));
        
        setDebts(prev => prev.filter(d => d.sale_id !== saleId));
        const reservationToVoid = reservations.find(r => r.sale_id === saleId);
        if (reservationToVoid) {
            setReservations(prev => prev.filter(r => r.id !== reservationToVoid.id));
            setProducts(prev => prev.map(p => 
                p.id === reservationToVoid.product_id ? { ...p, status: 'Available' } : p
            ));
        }
    }, [sales, reservations, setSales, setVoidedLogs, setDebts, setReservations, setProducts]);

    const voidTicket = useCallback((ticketId: string, voidedByEmployeeId: string) => {
        const ticketToVoid = openTickets.find(t => t.id === ticketId);
        if (!ticketToVoid) return;

        setVoidedLogs(prev => [...prev, {
            id: `void_${new Date().getTime()}`,
            type: 'ticket',
            voided_by_employee_id: voidedByEmployeeId,
            created_at: new Date().toISOString(),
            data: ticketToVoid,
            users: null,
        }]);

        setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
    }, [openTickets, setOpenTickets, setVoidedLogs]);

    const saveTicket = useCallback(async (ticketData: any) => {
        setOpenTickets(prev => {
            const existingIndex = prev.findIndex(t => t.id === ticketData.id);
            if (existingIndex > -1) {
                const updatedTickets = [...prev];
                updatedTickets[existingIndex] = { ...updatedTickets[existingIndex], ...ticketData };
                return updatedTickets;
            } else {
                const newTicket = { ...ticketData, id: `ticket_${new Date().getTime()}`, created_at: new Date().toISOString() };
                return [...prev, newTicket];
            }
        });
    }, [setOpenTickets]);
    
    const deleteTicket = useCallback(async (ticketId: string) => {
        setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
    }, [setOpenTickets]);

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
        deleteTicket
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

    
