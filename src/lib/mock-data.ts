
import { WriteBatch, doc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { addDays, subDays } from "date-fns";
import { SaleItem, Role } from "./types";
import { MOCK_INITIAL_ROLES as initialMockRoles } from "@/hooks/use-settings";

// --- MOCK DATA GENERATION ---

// Helper to generate unique IDs
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// 1. Define static base data for a fresh setup
const MOCK_CATEGORIES = [
  // User can create their own categories
];

const MOCK_PRODUCTS: any[] = [
  // User will add their own products
];

const MOCK_CUSTOMERS = [
  { id: "cust_walkin", name: "Walk-in Customer", email: "walkin@example.com", phone: null },
];

const MOCK_STORES = [
    { id: "store_main", name: "Main Branch", address: "123 Main St, Anytown, USA" },
];

const MOCK_POS_DEVICES = [
    { id: "pos_front", name: "Front Desk POS", store_id: "store_main" },
];

const MOCK_PRINTERS: any[] = [
    // User can configure printers as needed
];

const MOCK_TAXES = [
    { id: uid("tax"), name: "Sales Tax", rate: 0.0, type: "Added", is_default: true },
];

const MOCK_PAYMENT_TYPES = [
    { id: 'pay_1', name: 'Cash', type: 'Cash' },
    { id: 'pay_2', name: 'Card', type: 'Card' },
    { id: 'pay_3', name: 'Credit', type: 'Credit' },
];

// 2. This function now generates an empty state, not mock data
const generateInitialBusinessData = (ownerId: string, businessName: string) => {
  const settings = {
    featureSettings: {
      open_tickets: true,
      reservations: true,
      shifts: true,
      time_management: true,
      kitchen_printers: true,
      dining_options: true,
      customer_displays: true,
    },
    receiptSettings: {
      [MOCK_STORES[0].id]: {
        header: `Welcome to ${businessName}!`,
        footer: "Thank you for your business!",
        emailedLogo: null,
        printedLogo: null,
        showCustomerInfo: true,
        showComments: false,
        language: "en",
      },
    },
    currency: "$",
  };

  return {
    sales: [],
    debts: [],
    reservations: [],
    settings,
    openTickets: [],
    voidedLogs: []
  };
};

// 3. The main seeding function
export const seedDatabaseWithMockData = (batch: WriteBatch, businessId: string, ownerId: string) => {
  const addWithBusinessId = (collectionName: string, data: any) => {
    // For roles, generate a new ID each time to prevent conflicts between businesses
    const docId = data.id && collectionName !== 'roles' ? data.id : doc(collection(db, collectionName)).id;
    const item = { ...data, id: docId, businessId };
    batch.set(doc(db, collectionName, docId), item);
  };
    
  // --- Add essential configuration data to batch ---
  initialMockRoles.forEach(item => addWithBusinessId("roles", item));
  MOCK_CUSTOMERS.forEach(item => addWithBusinessId("customers", item));
  MOCK_STORES.forEach(item => addWithBusinessId("stores", item));
  MOCK_POS_DEVICES.forEach(item => addWithBusinessId("pos_devices", item));
  MOCK_TAXES.forEach(item => addWithBusinessId("taxes", item));
  MOCK_PAYMENT_TYPES.forEach(item => addWithBusinessId("payment_types", item));

  // --- Add empty transactional data collections if needed (or just the settings) ---
  const { settings } = generateInitialBusinessData(ownerId, "Your Business");

  // --- Add settings document ---
  batch.set(doc(db, "settings", businessId), settings);
};
