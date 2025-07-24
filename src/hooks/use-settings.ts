
"use client";

import { createContext, useContext, useState, ReactNode, createElement, useEffect } from 'react';
import type { AnyPermission } from '@/lib/permissions';
import type { User } from '@/lib/types';

export type FeatureSettings = Record<string, boolean>;

export type StoreType = {
  id: string;
  name: string;
  address: string;
};

export type PosDeviceType = {
  id: string;
  name:string;
  store_id: string;
};

export type PrinterType = {
    id: string;
    name: string;
    connection_type: 'Network' | 'Bluetooth' | 'Cable';
    ip_address?: string | null;
    pos_device_id: string;
};

export type ReceiptSettings = {
  emailedLogo: string | null;
  printedLogo: string | null;
  header: string;
  footer: string;
  showCustomerInfo: boolean;
  showComments: boolean;
  language: string;
};

export type PaymentType = {
    id: string;
    name: string;
    type: 'Cash' | 'Card' | 'Credit' | 'Other';
};

export type Tax = {
    id: string;
    name: string;
    rate: number;
    is_default: boolean;
    type: 'Included' | 'Added';
};

export type Role = {
  id: string;
  name: string;
  permissions: AnyPermission[];
};

export type UserRole = "Owner" | "Administrator" | "Manager" | "Cashier";

const posPermissions = {
    LOGIN_WITH_PIN: { label: "Log in to the app using personal PIN code" },
    ACCEPT_PAYMENTS: { label: "Accept payments" },
    APPLY_DISCOUNTS: { label: "Apply discounts with restricted access" },
    CHANGE_TAXES: { label: "Change taxes in a sale" },
    MANAGE_OPEN_TICKETS: { label: "Manage all open tickets" },
    VOID_SAVED_ITEMS: { label: "Void saved items in open tickets" },
    OPEN_CASH_DRAWER_NO_SALE: { label: "Open cash drawer without making a sale" },
    VIEW_ALL_RECEIPTS: { label: "View all receipts" },
    PERFORM_REFUNDS: { label: "Perform refunds" },
    REPRINT_RECEIPTS: { label: "Reprint and resend receipts" },
    VIEW_SHIFT_REPORT: { label: "View shift report" },
    MANAGE_ITEMS_POS: { label: "Manage items (POS)" },
    VIEW_ITEM_COST_POS: { label: "View cost of items (POS)" },
    CHANGE_SETTINGS_POS: { label: "Change settings (POS)" },
    ACCESS_LIVE_CHAT_POS: { label: "Access to live chat support (POS)" },
};

const backOfficePermissions = {
    LOGIN_WITH_EMAIL: { label: "Log in to the back office using their email and password" },
    VIEW_SALES_REPORTS: { label: "View sales reports" },
    CANCEL_RECEIPTS: { label: "Cancel receipts" },
    MANAGE_ITEMS_BO: { label: "Manage items (Back Office)" },
    VIEW_ITEM_COST_BO: { label: "View cost of items (Back Office)" },
    MANAGE_EMPLOYEES: { label: "Manage employees" },
    MANAGE_CUSTOMERS: { label: "Manage customers" },
    MANAGE_FEATURE_SETTINGS: { label: "Manage feature settings" },
    MANAGE_BILLING: { label: "Manage billing" },
    MANAGE_PAYMENT_TYPES: { label: "Manage payment types" },
    MANAGE_LOYALTY_PROGRAM: { label: "Manage loyalty program" },
    MANAGE_TAXES: { label: "Manage taxes" },
    MANAGE_KITCHEN_PRINTERS: { label: "Manage kitchen printers" },
    MANAGE_DINING_OPTIONS: { label: "Manage dining options" },
    MANAGE_POS_DEVICES: { label: "Manage POS devices" },
    ACCESS_LIVE_CHAT_BO: { label: "Access to live chat support (Back Office)" },
};

const allPosPermissions = Object.keys(posPermissions) as (keyof typeof posPermissions)[];
const allBackOfficePermissions = Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[];

const getPermissionsForRole = (role: UserRole): AnyPermission[] => {
    switch(role) {
        case "Owner":
        case "Administrator":
            return [...allPosPermissions, ...allBackOfficePermissions];
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

const MOCK_DEFAULT_USER: User[] = [
  { 
    id: "user_1", 
    name: "Admin", 
    email: "admin@orderflow.com", 
    role: "Owner", 
    pin: "1111", 
    permissions: getPermissionsForRole("Owner"), 
    avatar_url: '', 
    created_at: "2023-01-01T10:00:00Z" 
  },
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
    emailedLogo: "https://placehold.co/200x200.png",
    printedLogo: "https://placehold.co/200x200.png",
    header: "Welcome to Main Branch!",
    footer: "Thanks for visiting Main Branch!",
    showCustomerInfo: true,
    showComments: true,
    language: 'English'
  },
  'store_2': {
    emailedLogo: "https://placehold.co/200x200.png",
    printedLogo: "https://placehold.co/200x200.png",
    header: 'CASONI PREMIUM CLUB Experience Luxury & Lifestyle',
    footer: 'Thank you for choosing Casoni Premium Club! We hope you had a premium experience.',
    showCustomerInfo: false,
    showComments: false,
    language: 'English'
  }
}

const MOCK_PAYMENT_TYPES: PaymentType[] = [
    { id: 'pay_1', name: 'Cash', type: 'Cash' },
    { id: 'pay_2', name: 'Card', type: 'Card' },
    { id: 'pay_3', name: 'Credit', type: 'Credit' },
];

const MOCK_TAXES: Tax[] = [
    { id: 'tax_1', name: 'VAT', rate: 8, is_default: true, type: 'Included' },
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
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    loggedInUser: User | null;
    setLoggedInUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper function to get data from localStorage
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

// Helper function to set data in localStorage
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
    const [users, setUsers] = useState<User[]>(() => {
        const savedUsers = getFromLocalStorage<User[]>('users', []);
        return savedUsers.length > 0 ? savedUsers : MOCK_DEFAULT_USER;
    });
    const [loggedInUser, setLoggedInUser] = useState<User | null>(() => getFromLocalStorage<User | null>('loggedInUser', null));

    // Effects to save to localStorage whenever state changes
    useEffect(() => { setInLocalStorage('featureSettings', featureSettings); }, [featureSettings]);
    useEffect(() => { setInLocalStorage('stores', stores); }, [stores]);
    useEffect(() => { setInLocalStorage('posDevices', posDevices); }, [posDevices]);
    useEffect(() => { setInLocalStorage('printers', printers); }, [printers]);
    useEffect(() => { setInLocalStorage('receiptSettings', receiptSettings); }, [receiptSettings]);
    useEffect(() => { setInLocalStorage('paymentTypes', paymentTypes); }, [paymentTypes]);
    useEffect(() => { setInLocalStorage('taxes', taxes); }, [taxes]);
    useEffect(() => { setInLocalStorage('roles', roles); }, [roles]);
    useEffect(() => { setInLocalStorage('users', users); }, [users]);
    useEffect(() => { setInLocalStorage('loggedInUser', loggedInUser); }, [loggedInUser]);


    const value = {
        featureSettings, setFeatureSettings,
        stores, setStores,
        posDevices, setPosDevices,
        printers, setPrinters,
        receiptSettings, setReceiptSettings,
        paymentTypes, setPaymentTypes,
        taxes, setTaxes,
        roles, setRoles,
        users, setUsers,
        loggedInUser, setLoggedInUser,
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
