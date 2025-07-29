
import { WriteBatch, doc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { addDays, subDays } from "date-fns";
import { SaleItem } from "./types";

// --- MOCK DATA GENERATION ---

// Helper to generate unique IDs
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// 1. Define static base data
const MOCK_CATEGORIES = [
  { id: "cat_food", name: "Food" },
  { id: "cat_beverages", name: "Beverages" },
  { id: "cat_snacks", name: "Snacks" },
  { id: "cat_room", name: "Room" },
];

const MOCK_PRODUCTS = [
  // Food
  { id: "prod_burger", name: "Classic Burger", price: 12.99, stock: 50, category_id: "cat_food", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  { id: "prod_pizza", name: "Margherita Pizza", price: 15.50, stock: 30, category_id: "cat_food", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  { id: "prod_salad", name: "Chicken Caesar Salad", price: 10.25, stock: 40, category_id: "cat_food", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  // Beverages
  { id: "prod_coke", name: "Coca-Cola", price: 2.50, stock: 100, category_id: "cat_beverages", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  { id: "prod_juice", name: "Fresh Orange Juice", price: 4.00, stock: 60, category_id: "cat_beverages", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  // Snacks
  { id: "prod_fries", name: "French Fries", price: 4.50, stock: 80, category_id: "cat_snacks", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  // Rooms
  { id: "prod_room_101", name: "Standard Room 101", price: 150.00, stock: 1, category_id: "cat_room", image_url: "https://placehold.co/300x200.png", status: 'Available' },
  { id: "prod_room_102", name: "Standard Room 102", price: 150.00, stock: 1, category_id: "cat_room", image_url: "https://placehold.co/300x200.png", status: 'Occupied' },
  { id: "prod_room_201", name: "Deluxe Suite 201", price: 250.00, stock: 1, category_id: "cat_room", image_url: "https://placehold.co/300x200.png", status: 'Maintenance' },
];

const MOCK_CUSTOMERS = [
  { id: "cust_walkin", name: "Walk-in Customer", email: "walkin@example.com", phone: null },
  { id: "cust_johndoe", name: "John Doe", email: "john.doe@example.com", phone: "123-456-7890" },
  { id: "cust_janesmith", name: "Jane Smith", email: "jane.smith@example.com", phone: "098-765-4321" },
];

const MOCK_STORES = [
    { id: "store_main", name: "Main Branch", address: "123 Main St, Anytown, USA" },
];

const MOCK_POS_DEVICES = [
    { id: "pos_front", name: "Front Desk POS", store_id: "store_main" },
    { id: "pos_bar", name: "Bar POS", store_id: "store_main" },
];

const MOCK_PRINTERS = [
    { id: uid("printer"), name: "Kitchen Printer", connection_type: "Network", ip_address: "192.188.1.100", pos_device_id: "pos_front" },
    { id: uid("printer"), name: "Receipt Printer", connection_type: "Cable", pos_device_id: "pos_front" },
];

const MOCK_TAXES = [
    { id: uid("tax"), name: "Sales Tax", rate: 8.0, type: "Added", is_default: true },
];

// 2. Define function to generate dynamic data
const generateDynamicMockData = (ownerId: string, businessName: string) => {
  const now = new Date();

  const sales = [
    // Sale 1: Recent cash sale
    {
      id: "sale_1",
      order_number: 1001,
      total: 19.96,
      payment_methods: ["Cash"],
      items: [{ id: "prod_burger", name: "Classic Burger", quantity: 1, price: 12.99 }, { id: "prod_coke", name: "Coca-Cola", quantity: 1, price: 2.50 }],
      status: "Fulfilled",
      created_at: subDays(now, 1).toISOString(),
      customer_id: "cust_walkin",
      employee_id: ownerId,
      pos_device_id: "pos_front",
    },
    // Sale 2: Credit sale for John Doe
    {
      id: "sale_2",
      order_number: 1002,
      total: 15.50,
      payment_methods: ["Credit"],
      items: [{ id: "prod_pizza", name: "Margherita Pizza", quantity: 1, price: 15.50 }],
      status: "Fulfilled",
      created_at: subDays(now, 5).toISOString(),
      customer_id: "cust_johndoe",
      employee_id: ownerId,
      pos_device_id: "pos_bar",
    },
    // Sale 3: Room booking for Jane Smith
     {
      id: "sale_3",
      order_number: 1003,
      total: 150.00,
      payment_methods: ["Card"],
      items: [{ id: "prod_room_102", name: "Standard Room 102", quantity: 1, price: 150.00 }],
      status: "Fulfilled",
      created_at: subDays(now, 2).toISOString(),
      customer_id: "cust_janesmith",
      employee_id: ownerId,
      pos_device_id: "pos_front",
    },
    // Sale 4: Voided sale
    {
      id: "sale_4_voided",
      order_number: 1004,
      total: 4.50,
      payment_methods: ["Cash"],
      items: [{ id: "prod_fries", name: "French Fries", quantity: 1, price: 4.50 }],
      status: "Fulfilled",
      created_at: subDays(now, 3).toISOString(),
      customer_id: "cust_walkin",
      employee_id: ownerId,
      pos_device_id: "pos_front",
    },
  ];

  const debts = [
    {
      id: "debt_1",
      sale_id: "sale_2",
      customer_id: "cust_johndoe",
      amount: 15.50,
      status: "Unpaid",
      created_at: subDays(now, 5).toISOString(),
    },
  ];

  const reservations = [
     {
      id: "res_1",
      guest_name: "Jane Smith",
      product_id: "prod_room_102",
      check_in: subDays(now, 2).toISOString(),
      check_out: addDays(now, 1).toISOString(),
      status: "Checked-in",
      sale_id: "sale_3",
      created_at: subDays(now, 2).toISOString(),
    },
  ];
  
  const openTickets = [
    {
        id: "ticket_1",
        ticket_name: "Table 5 Order",
        employee_id: ownerId,
        customer_id: "cust_walkin",
        items: [{ id: "prod_salad", name: "Chicken Caesar Salad", quantity: 2, price: 10.25 }, { id: "prod_juice", name: "Fresh Orange Juice", quantity: 2, price: 4.00 }] as SaleItem[],
        total: (10.25 * 2) + (4.00 * 2),
        created_at: subDays(now, 1).toISOString(),
    }
  ];

  const voidedLogs = [
    {
        id: "void_1_receipt",
        type: "receipt",
        voided_by_employee_id: ownerId,
        created_at: subDays(now, 2).toISOString(),
        data: sales.find(s => s.id === "sale_4_voided")
    },
    {
        id: "void_2_ticket",
        type: "ticket",
        voided_by_employee_id: ownerId,
        created_at: subDays(now, 1).toISOString(),
        data: {
            id: "ticket_2_voided",
            ticket_name: "Mistake Order",
            employee_id: ownerId,
            items: [{ id: "prod_coke", name: "Coca-Cola", quantity: 5, price: 2.50 }] as SaleItem[],
            total: 12.50,
            created_at: subDays(now, 2).toISOString(),
        }
    }
  ];

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

  return { sales, debts, reservations, settings, openTickets, voidedLogs };
};

// 3. The main seeding function
export const seedDatabaseWithMockData = (batch: WriteBatch, ownerId: string, businessName: string) => {
    
  // --- Add static data to batch ---
  MOCK_CATEGORIES.forEach(item => batch.set(doc(db, "categories", item.id), item));
  MOCK_PRODUCTS.forEach(item => batch.set(doc(db, "products", item.id), item));
  MOCK_CUSTOMERS.forEach(item => batch.set(doc(db, "customers", item.id), item));
  MOCK_STORES.forEach(item => batch.set(doc(db, "stores", item.id), item));
  MOCK_POS_DEVICES.forEach(item => batch.set(doc(db, "pos_devices", item.id), item));
  MOCK_PRINTERS.forEach(item => batch.set(doc(db, "printers", item.id), item));
  MOCK_TAXES.forEach(item => batch.set(doc(db, "taxes", item.id), item));

  // --- Generate and add dynamic data to batch ---
  const { sales, debts, reservations, settings, openTickets, voidedLogs } = generateDynamicMockData(ownerId, businessName);

  sales.forEach(item => batch.set(doc(db, "sales", item.id), item));
  debts.forEach(item => batch.set(doc(db, "debts", item.id), item));
  reservations.forEach(item => batch.set(doc(db, "reservations", item.id), item));
  openTickets.forEach(item => batch.set(doc(db, "open_tickets", item.id), item));
  voidedLogs.forEach(item => batch.set(doc(db, "voided_logs", item.id), item));

  // --- Add settings document ---
  batch.set(doc(db, "settings", "global"), settings);

  // Note: The Owner user is added separately in the sign-up flow to ensure it's part of the same transaction
};
