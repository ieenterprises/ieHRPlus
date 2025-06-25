import { AnyPermission, posPermissions, backOfficePermissions } from './permissions';

export type Category = {
  id: string;
  name: string;
};

export const categories: Category[] = [
  { id: "food", name: "Food" },
  { id: "drink", name: "Drink" },
  { id: "snack", name: "Snack" },
  { id: "room", name: "Room" },
];

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
};

export const products: Product[] = [
  { id: "room-101", name: "Single Room", category: "room", price: 80, imageUrl: "https://placehold.co/300x200.png", stock: 5 },
  { id: "room-201", name: "Double Room", category: "room", price: 120, imageUrl: "https://placehold.co/300x200.png", stock: 3 },
  { id: "room-301", name: "Suite", category: "room", price: 200, imageUrl: "https://placehold.co/300x200.png", stock: 2 },
  { id: "1", name: "Espresso", category: "drink", price: 2.5, imageUrl: "https://placehold.co/300x200.png", stock: 100 },
  { id: "2", name: "Latte", category: "drink", price: 3.5, imageUrl: "https://placehold.co/300x200.png", stock: 80 },
  { id: "3", name: "Cappuccino", category: "drink", price: 3.5, imageUrl: "https://placehold.co/300x200.png", stock: 75 },
  { id: "4", name: "Croissant", category: "food", price: 2.75, imageUrl: "https://placehold.co/300x200.png", stock: 40 },
  { id: "5", name: "Muffin", category: "food", price: 2.25, imageUrl: "https://placehold.co/300x200.png", stock: 50 },
  { id: "6", name: "Avocado Toast", category: "food", price: 8.5, imageUrl: "https://placehold.co/300x200.png", stock: 20 },
  { id: "7", name: "Iced Tea", category: "drink", price: 3.0, imageUrl: "https://placehold.co/300x200.png", stock: 60 },
  { id: "8", name: "Orange Juice", category: "drink", price: 4.0, imageUrl: "https://placehold.co/300x200.png", stock: 0 },
  { id: "9", name: "Bagel", category: "food", price: 4.5, imageUrl: "https://placehold.co/300x200.png", stock: 30 },
  { id: "10", name: "Cookie", category: "snack", price: 1.5, imageUrl: "https://placehold.co/300x200.png", stock: 120 },
  { id: "11", name: "Granola Bar", category: "snack", price: 2.0, imageUrl: "https://placehold.co/300x200.png", stock: 150 },
  { id: "12", name: "Fruit Salad", category: "food", price: 6.0, imageUrl: "https://placehold.co/300x200.png", stock: 15 },
];

export type UserRole = "Owner" | "Administrator" | "Manager" | "Cashier";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  permissions: AnyPermission[];
};

export const users: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@orderflow.com", role: "Owner", avatarUrl: "https://placehold.co/100x100.png", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "2", name: "Bob Williams", email: "bob@orderflow.com", role: "Administrator", avatarUrl: "https://placehold.co/100x100.png", permissions: [...Object.keys(posPermissions), ...Object.keys(backOfficePermissions)] as AnyPermission[] },
  { id: "3", name: "Charlie Brown", email: "charlie@orderflow.com", role: "Manager", avatarUrl: "https://placehold.co/100x100.png", permissions: ["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "LOGIN_WITH_EMAIL", "VIEW_SALES_REPORTS", "MANAGE_EMPLOYEES"] },
  { id: "4", name: "Diana Prince", email: "diana@orderflow.com", role: "Cashier", avatarUrl: "https://placehold.co/100x100.png", permissions: ["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "VIEW_ALL_RECEIPTS"] },
];

export type KitchenOrder = {
  id: string;
  orderNumber: number;
  items: {
    name: string;
    quantity: number;
  }[];
  status: "New" | "In Progress" | "Done";
};

export const kitchenOrders: KitchenOrder[] = [
  { id: "1", orderNumber: 101, items: [{ name: "Latte", quantity: 1 }, { name: "Croissant", quantity: 2 }], status: "New" },
  { id: "2", orderNumber: 102, items: [{ name: "Avocado Toast", quantity: 1 }], status: "In Progress" },
  { id: "3", orderNumber: 103, items: [{ name: "Espresso", quantity: 2 }, { name: "Muffin", quantity: 1 }], status: "New" },
  { id: "4", orderNumber: 104, items: [{ name: "Iced Tea", quantity: 1 }], status: "New" },
];

export const salesByItem = [
    { name: "Avocado Toast", sales: 4000 },
    { name: "Latte", sales: 3000 },
    { name: "Cappuccino", sales: 2000 },
    { name: "Croissant", sales: 2780 },
    { name: "Espresso", sales: 1890 },
    { name: "Muffin", sales: 2390 },
    { name: "Iced Tea", sales: 3490 },
];

export const salesByCategory = [
    { name: "Food", sales: 9170 },
    { name: "Drink", sales: 12080 },
    { name: "Snack", sales: 3890 },
    { name: "Room", sales: 15200 },
];

export const salesByEmployee = [
    { name: "Bob W.", sales: 12450 },
    { name: "Charlie B.", sales: 9870 },
    { name: "Diana P.", sales: 11500 },
];

export type Customer = {
    id: string;
    name: string;
    email: string;
    phone: string;
};

export const customers: Customer[] = [
    { id: "1", name: "John Doe", email: "john.d@example.com", phone: "555-1234" },
    { id: "2", name: "Jane Smith", email: "jane.s@example.com", phone: "555-5678" },
    { id: "3", name: "Peter Jones", email: "peter.j@example.com", phone: "555-9012" },
];

export type Debt = {
  id: string;
  orderNumber: number;
  customerName: string;
  employeeName: string;
  amount: number;
  date: Date;
  status: "Unpaid" | "Paid";
};

export const debts: Debt[] = [
  {
    id: "1",
    orderNumber: 106,
    customerName: "John Doe",
    employeeName: "Diana Prince",
    amount: 8.25,
    date: new Date("2024-05-20"),
    status: "Unpaid",
  },
  {
    id: "2",
    orderNumber: 107,
    customerName: "Jane Smith",
    employeeName: "Charlie Brown",
    amount: 12.50,
    date: new Date("2024-05-21"),
    status: "Unpaid",
  },
  {
    id: "3",
    orderNumber: 108,
    customerName: "Peter Jones",
    employeeName: "Diana Prince",
    amount: 5.75,
    date: new Date("2024-05-18"),
    status: "Paid",
  },
];

export type Room = {
    id: string;
    name: string;
    type: 'Single' | 'Double' | 'Suite';
    pricePerNight: number;
};

export const rooms: Room[] = [
    { id: '101', name: 'Room 101', type: 'Single', pricePerNight: 80 },
    { id: '102', name: 'Room 102', type: 'Single', pricePerNight: 80 },
    { id: '201', name: 'Room 201', type: 'Double', pricePerNight: 120 },
    { id: '202', name: 'Room 202', type: 'Double', pricePerNight: 120 },
    { id: '301', name: 'Suite 301', type: 'Suite', pricePerNight: 200 },
];

export type Reservation = {
    id: string;
    guestName: string;
    roomName: string;
    checkIn: Date;
    checkOut: Date;
    status: 'Confirmed' | 'Checked-in' | 'Checked-out';
};

export const reservations: Reservation[] = [
    { id: '1', guestName: 'Clark Kent', roomName: 'Room 101', checkIn: new Date('2024-08-01'), checkOut: new Date('2024-08-05'), status: 'Confirmed' },
    { id: '2', guestName: 'Lois Lane', roomName: 'Room 201', checkIn: new Date('2024-08-03'), checkOut: new Date('2024-08-07'), status: 'Confirmed' },
    { id: '3', guestName: 'Bruce Wayne', roomName: 'Suite 301', checkIn: new Date('2024-07-28'), checkOut: new Date('2024-08-02'), status: 'Checked-in' },
];

export type Sale = {
  id: string;
  orderNumber: number;
  items: {
    name:string;
    quantity: number;
  }[];
  total: number;
  paymentMethods: string[];
  customerName: string;
  employeeName: string;
  date: Date;
};

export const sales: Sale[] = [
    {
        id: "sale-1",
        orderNumber: 105,
        items: [ { name: "Espresso", quantity: 1 }, { name: "Muffin", quantity: 1 } ],
        total: 4.75,
        paymentMethods: ["Cash"],
        customerName: "Walk-in",
        employeeName: "Diana Prince",
        date: new Date("2024-07-29T10:30:00Z"),
    },
    {
        id: "sale-2",
        orderNumber: 106,
        items: [ { name: "Avocado Toast", quantity: 1 } ],
        total: 8.50,
        paymentMethods: ["Credit"],
        customerName: "John Doe",
        employeeName: "Charlie Brown",
        date: new Date("2024-07-29T10:35:00Z"),
    },
    {
        id: "sale-3",
        orderNumber: 107,
        items: [ { name: "Latte", quantity: 2 }, { name: "Croissant", quantity: 2 } ],
        total: 12.50,
        paymentMethods: ["Card"],
        customerName: "Jane Smith",
        employeeName: "Diana Prince",
        date: new Date("2024-07-29T10:40:00Z"),
    },
    {
        id: "sale-4",
        orderNumber: 108,
        items: [ { name: "Suite", quantity: 1 } ],
        total: 200,
        paymentMethods: ["Card"],
        customerName: "Bruce Wayne",
        employeeName: "Bob Williams",
        date: new Date("2024-07-29T11:00:00Z"),
    },
    {
        id: "sale-5",
        orderNumber: 109,
        items: [ { name: "Iced Tea", quantity: 1 }, { name: "Cookie", quantity: 2 } ],
        total: 6.00,
        paymentMethods: ["Cash", "Card"],
        customerName: "Walk-in",
        employeeName: "Charlie Brown",
        date: new Date("2024-07-29T11:15:00Z"),
    },
];
