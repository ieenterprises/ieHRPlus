

import { WriteBatch, doc, collection } from "firebase/firestore";
import { db } from "./firebase";
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

const MOCK_CUSTOMERS: any[] = [
  // User will add their own customers
];

const MOCK_BRANCHES = [
    { name: "Main Branch", address: "123 Main St, Anytown, USA" },
];

const MOCK_POS_DEVICES: any[] = [
    // No default POS devices
];

const MOCK_PRINTERS: any[] = [
    // User can configure printers as needed
];

const MOCK_TAXES = [
    { name: "Sales Tax", rate: 0.0, type: "Added", is_default: true },
];

const MOCK_PAYMENT_TYPES = [
    { name: 'Cash', type: 'Cash' },
    { name: 'Card', type: 'Card' },
    { name: 'Credit', type: 'Credit' },
];

// 2. This function now generates an empty state, not mock data
const generateInitialBusinessData = (ownerId: string, businessName: string, branchId: string) => {
  const settings = {
    receiptSettings: {
      [branchId]: {
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
    settings,
  };
};

// 3. The main seeding function
export const seedDatabaseWithMockData = (batch: WriteBatch, businessId: string, ownerId: string) => {
  const addWithBusinessId = (collectionName: string, data: any) => {
    const docRef = doc(collection(db, collectionName));
    const item = { ...data, id: docRef.id, businessId };
    batch.set(docRef, item);
    return item; // Return the full item with its new ID
  };
    
  // --- Add essential configuration data to batch ---
  initialMockRoles.forEach(item => addWithBusinessId("roles", { name: item.name, permissions: item.permissions }));
  
  // Create branch and get its unique ID
  const newBranch = addWithBusinessId("branches", MOCK_BRANCHES[0]);
  const newBranchId = newBranch.id;

  MOCK_TAXES.forEach(item => addWithBusinessId("taxes", item));
  MOCK_PAYMENT_TYPES.forEach(item => addWithBusinessId("payment_types", item));

  // --- Add settings document, linked to the unique branch ID ---
  const { settings } = generateInitialBusinessData(ownerId, "Your Business", newBranchId);

  batch.set(doc(db, "settings", businessId), settings);
};
