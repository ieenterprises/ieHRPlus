
export const posPermissions = {
    LOGIN_WITH_PIN: { label: "Log in to the app using personal PIN code" },
    ACCEPT_PAYMENTS: { label: "Accept payments" },
    APPLY_DISCOUNTS: { label: "Apply discounts with restricted access" },
    CHANGE_TAXES: { label: "Change taxes in a sale" },
    MANAGE_OPEN_TICKETS: { label: "Manage all open tickets" },
    VOID_SAVED_ITEMS: { label: "Void open tickets" },
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

export const backOfficePermissions = {
    LOGIN_WITH_EMAIL: { label: "Log in to the back office using their email and password" },
    VIEW_SALES_REPORTS: { label: "View sales reports" },
    CANCEL_RECEIPTS: { label: "Void completed receipts" },
    RESTORE_VOIDED_ITEMS: { label: "Restore items from the voided logs" },
    PERMANENTLY_DELETE_VOIDS: { label: "Permanently delete voided logs" },
    MANAGE_ITEMS_BO: { label: "Manage items (Back Office)" },
    VIEW_ITEM_COST_BO: { label: "View cost of items (Back Office)" },
    VIEW_CUSTOMERS: { label: "View customer list" },
    MANAGE_CUSTOMERS: { label: "Manage customers" },
    MANAGE_EMPLOYEES: { label: "Manage employees" },
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

export type PosPermission = keyof typeof posPermissions;
export type BackOfficePermission = keyof typeof backOfficePermissions;
export type AnyPermission = PosPermission | BackOfficePermission;
