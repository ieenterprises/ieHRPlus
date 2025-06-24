export type Product = {
  id: string;
  name: string;
  category: "Food" | "Drink" | "Snack";
  price: number;
  imageUrl: string;
};

export const products: Product[] = [
  { id: "1", name: "Espresso", category: "Drink", price: 2.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "2", name: "Latte", category: "Drink", price: 3.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "3", name: "Cappuccino", category: "Drink", price: 3.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "4", name: "Croissant", category: "Food", price: 2.75, imageUrl: "https://placehold.co/300x200.png", },
  { id: "5", name: "Muffin", category: "Food", price: 2.25, imageUrl: "https://placehold.co/300x200.png", },
  { id: "6", name: "Avocado Toast", category: "Food", price: 8.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "7", name: "Iced Tea", category: "Drink", price: 3.0, imageUrl: "https://placehold.co/300x200.png", },
  { id: "8", name: "Orange Juice", category: "Drink", price: 4.0, imageUrl: "https://placehold.co/300x200.png", },
  { id: "9", name: "Bagel", category: "Food", price: 4.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "10", name: "Cookie", category: "Snack", price: 1.5, imageUrl: "https://placehold.co/300x200.png", },
  { id: "11", name: "Granola Bar", category: "Snack", price: 2.0, imageUrl: "https://placehold.co/300x200.png", },
  { id: "12", name: "Fruit Salad", category: "Food", price: 6.0, imageUrl: "https://placehold.co/300x200.png", },
];

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Manager" | "Cashier";
  avatarUrl: string;
};

export const users: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@orderflow.com", role: "Manager", avatarUrl: "https://placehold.co/100x100.png" },
  { id: "2", name: "Bob Williams", email: "bob@orderflow.com", role: "Cashier", avatarUrl: "https://placehold.co/100x100.png" },
  { id: "3", name: "Charlie Brown", email: "charlie@orderflow.com", role: "Cashier", avatarUrl: "https://placehold.co/100x100.png" },
  { id: "4", name: "Diana Prince", email: "diana@orderflow.com", role: "Cashier", avatarUrl: "https://placehold.co/100x100.png" },
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
];

export const salesByEmployee = [
    { name: "Bob W.", sales: 12450 },
    { name: "Charlie B.", sales: 9870 },
    { name: "Diana P.", sales: 11500 },
];
