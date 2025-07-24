
"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect, useCallback } from 'react';
import type { AnyPermission } from '@/lib/permissions';
import type { User, StoreType, PosDeviceType, PaymentType, Role, PrinterType, ReceiptSettings, Tax } from '@/lib/types';
import { posPermissions, backOfficePermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export type { FeatureSettings, StoreType, PosDeviceType, PrinterType, ReceiptSettings, PaymentType, Tax, Role, UserRole } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

export type UserRole = "Owner" | "Administrator" | "Manager" | "Cashier";

const getPermissionsForRole = (role: UserRole): AnyPermission[] => {
    switch(role) {
        case "Owner":
        case "Administrator":
            return [...Object.keys(posPermissions) as (keyof typeof posPermissions)[], ...Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[]];
        case "Manager":
            return ["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "MANAGE_OPEN_TICKETS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "LOGIN_WITH_EMAIL", "VIEW_SALES_REPORTS", "MANAGE_ITEMS_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS"];
        case "Cashier":
            return ["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "MANAGE_OPEN_TICKETS"];
        default:
            return [];
    }
}

const MOCK_ROLES: Role[] = [
  { id: "role_owner", name: "Owner", permissions: getPermissionsForRole("Owner") },
  { id: "role_admin", name: "Administrator", permissions: getPermissionsForRole("Administrator") },
  { id: "role_manager", name: "Manager", permissions: getPermissionsForRole("Manager") },
  { id: "role_cashier", name: "Cashier", permissions: getPermissionsForRole("Cashier") },
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
  'store_1': {
    header: "Welcome to Main Branch!",
    footer: "Thanks for visiting Main Branch!",
    emailedLogo: null,
    printedLogo: null,
    showCustomerInfo: true,
    showComments: true,
    language: 'en',
  },
  'store_2': {
    header: 'CASONI PREMIUM CLUB Experience Luxury & Lifestyle',
    footer: 'Thank you for choosing Casoni Premium Club! We hope you had a premium experience.',
    emailedLogo: null,
    printedLogo: null,
    showCustomerInfo: false,
    showComments: false,
    language: 'en',
  }
}

const MOCK_PAYMENT_TYPES: PaymentType[] = [
    { id: 'pay_1', name: 'Cash', type: 'Cash' },
    { id: 'pay_2', name: 'Card', type: 'Card' },
    { id: 'pay_3', name: 'Credit', type: 'Credit' },
];

const MOCK_TAXES: Tax[] = [
    { id: 'tax_1', name: 'VAT', rate: 8, is_default: true, type: 'Added' },
    { id: 'tax_2', name: 'Service Charge', rate: 10, is_default: false, type: 'Added' },
];

type SettingsContextType = {
    featureSettings: FeatureSettings;
    setFeatureSettings: React.Dispatch<React.SetStateAction<FeatureSettings>>;
    stores: StoreType[];
    setStores: React.Dispatch<React.SetStateAction<StoreType[]>>;
    posDevices: PosDeviceType[];
    setPosDevices: React.Dispatch<React.SetStateAction<PosDeviceType[]>>;
    printers: PrinterType[];
    setPrinters: React.Dispatch<React.SetStateAction<PrinterType[]>>;
    receiptSettings: Record<string, ReceiptSettings>;
    setReceiptSettings: React.Dispatch<React.SetStateAction<Record<string, ReceiptSettings>>>;
    paymentTypes: PaymentType[];
    setPaymentTypes: React.Dispatch<React.SetStateAction<PaymentType[]>>;
    taxes: Tax[];
    setTaxes: React.Dispatch<React.SetStateAction<Tax[]>>;
    roles: Role[];
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    users: User[];
    loggedInUser: User | null;
    setLoggedInUser: React.Dispatch<React.SetStateAction<User | null>>;
    loadingUser: boolean;
    getPermissionsForRole: (role: UserRole) => AnyPermission[];
    logout: () => Promise<void>;
    selectedStore: StoreType | null;
    setSelectedStore: React.Dispatch<React.SetStateAction<StoreType | null>>;
    selectedDevice: PosDeviceType | null;
    setSelectedDevice: React.Dispatch<React.SetStateAction<PosDeviceType | null>>;
    currency: string;
    setCurrency: React.Dispatch<React.SetStateAction<string>>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    const storedValue = window.localStorage.getItem(key);
    if (storedValue) {
        try {
            return JSON.parse(storedValue);
        } catch (error) {
            console.error(`Error parsing localStorage key "${key}":`, error);
            return defaultValue;
        }
    }
    return defaultValue;
};

const setInLocalStorage = <T,>(key: string, value: T) => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(() => getFromLocalStorage('featureSettings', {
        open_tickets: true, shifts: true, time_management: false, kitchen_printers: true, dining_options: true, customer_displays: false,
    }));
    const [stores, setStores] = useState<StoreType[]>(() => getFromLocalStorage('stores', MOCK_STORES));
    const [posDevices, setPosDevices] = useState<PosDeviceType[]>(() => getFromLocalStorage('posDevices', MOCK_POS_DEVICES));
    const [printers, setPrinters] = useState<PrinterType[]>(() => getFromLocalStorage('printers', MOCK_PRINTERS));
    const [receiptSettings, setReceiptSettings] = useState<Record<string, ReceiptSettings>>(() => getFromLocalStorage('receiptSettings', MOCK_RECEIPT_SETTINGS));
    const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>(() => getFromLocalStorage('paymentTypes', MOCK_PAYMENT_TYPES));
    const [taxes, setTaxes] = useState<Tax[]>(() => getFromLocalStorage('taxes', MOCK_TAXES));
    const [roles, setRoles] = useState<Role[]>(() => getFromLocalStorage('roles', MOCK_ROLES));
    const [users, setUsers] = useState<User[]>([]);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [selectedStore, setSelectedStore] = useState<StoreType | null>(() => getFromLocalStorage('selectedStore', null));
    const [selectedDevice, setSelectedDevice] = useState<PosDeviceType | null>(() => getFromLocalStorage('selectedDevice', null));
    const [currency, setCurrency] = useState<string>(() => getFromLocalStorage('currency', '$'));
    const router = useRouter();


    useEffect(() => { setInLocalStorage('featureSettings', featureSettings); }, [featureSettings]);
    useEffect(() => { setInLocalStorage('stores', stores); }, [stores]);
    useEffect(() => { setInLocalStorage('posDevices', posDevices); }, [posDevices]);
    useEffect(() => { setInLocalStorage('printers', printers); }, [printers]);
    useEffect(() => { setInLocalStorage('receiptSettings', receiptSettings); }, [receiptSettings]);
    useEffect(() => { setInLocalStorage('paymentTypes', paymentTypes); }, [paymentTypes]);
    useEffect(() => { setInLocalStorage('taxes', taxes); }, [taxes]);
    useEffect(() => { setInLocalStorage('roles', roles); }, [roles]);
    useEffect(() => { setInLocalStorage('selectedStore', selectedStore); }, [selectedStore]);
    useEffect(() => { setInLocalStorage('selectedDevice', selectedDevice); }, [selectedDevice]);
    useEffect(() => { setInLocalStorage('currency', currency); }, [currency]);


    const fetchUser = useCallback(async () => {
        if (!supabase) {
            setLoadingUser(false);
            return;
        };
        const { data: { session }} = await supabase.auth.getSession();
        if (session?.user) {
            const { data: userProfile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
            setLoggedInUser(userProfile as User);
        } else {
            setLoggedInUser(null);
        }
        setLoadingUser(false);
    }, []);
    
    const fetchAllUsers = useCallback(async () => {
        if (!supabase) return;
        const { data } = await supabase.from('users').select('*');
        setUsers(data as User[] || []);
    }, []);

    useEffect(() => {
        fetchUser();
        fetchAllUsers();
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                 fetchUser();
                 fetchAllUsers();
            }
            if (event === 'SIGNED_OUT') {
                setLoggedInUser(null);
                setSelectedStore(null);
                setSelectedDevice(null);
                router.push('/sign-in');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchUser, fetchAllUsers, router]);


    const logout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
    };


    const value: SettingsContextType = {
        featureSettings, setFeatureSettings,
        stores, setStores,
        posDevices, setPosDevices,
        printers, setPrinters,
        receiptSettings, setReceiptSettings,
        paymentTypes, setPaymentTypes,
        taxes, setTaxes,
        roles, setRoles,
        users,
        loggedInUser, setLoggedInUser,
        loadingUser,
        getPermissionsForRole,
        logout,
        selectedStore, setSelectedStore,
        selectedDevice, setSelectedDevice,
        currency, setCurrency,
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
