-- In your Supabase project's SQL Editor, create a new query
-- and paste the entire content of this file to create all necessary tables.

-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    stock INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Owner', 'Administrator', 'Manager', 'Cashier')),
    avatar_url TEXT,
    pin TEXT,
    permissions JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    items JSONB NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_methods JSONB NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Fulfilled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Debts Table
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Unpaid', 'Paid')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Reservations Table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Confirmed', 'Checked-in', 'Checked-out')),
    created_at TIMESTAMPTZ DEFAULT now()
);


-- Enable Row Level Security (RLS) for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access for all tables
CREATE POLICY "Public read access for categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access for users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read access for customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public read access for sales" ON sales FOR SELECT USING (true);
CREATE POLICY "Public read access for debts" ON debts FOR SELECT USING (true);
CREATE POLICY "Public read access for reservations" ON reservations FOR SELECT USING (true);

-- Create policies to allow all actions for authenticated users (you can restrict this further)
CREATE POLICY "Allow all actions for authenticated users on categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on debts" ON debts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all actions for authenticated users on reservations" ON reservations FOR ALL USING (auth.role() = 'authenticated');


-- Insert some sample data to get started

-- Insert Categories
INSERT INTO categories (id, name) VALUES
('8a52e2a5-8153-4131-9556-3c527054f1a2', 'Food'),
('3c527054-f1a2-4e69-95a7-8a52e2a58153', 'Drink'),
('95a78a52-e2a5-4e69-8153-3c527054f1a2', 'Snack'),
('4e698153-3c52-4a52-95a7-8a52e2a5f1a2', 'Room');

-- Insert Users
INSERT INTO users (name, email, role, pin, permissions) VALUES
('Alice Johnson', 'alice@orderflow.com', 'Owner', '1111', '["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "CHANGE_TAXES", "MANAGE_OPEN_TICKETS", "VOID_SAVED_ITEMS", "OPEN_CASH_DRAWER_NO_SALE", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "REPRINT_RECEIPTS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "VIEW_ITEM_COST_POS", "CHANGE_SETTINGS_POS", "ACCESS_LIVE_CHAT_POS", "LOGIN_WITH_EMAIL", "VIEW_SALES_REPORTS", "CANCEL_RECEIPTS", "MANAGE_ITEMS_BO", "VIEW_ITEM_COST_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS", "MANAGE_FEATURE_SETTINGS", "MANAGE_BILLING", "MANAGE_PAYMENT_TYPES", "MANAGE_LOYALTY_PROGRAM", "MANAGE_TAXES", "MANAGE_KITCHEN_PRINTERS", "MANAGE_DINING_OPTIONS", "MANAGE_POS_DEVICES", "ACCESS_LIVE_CHAT_BO"]'::jsonb),
('Bob Williams', 'bob@orderflow.com', 'Administrator', '2222', '["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "CHANGE_TAXES", "MANAGE_OPEN_TICKETS", "VOID_SAVED_ITEMS", "OPEN_CASH_DRAWER_NO_SALE", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "REPRINT_RECEIPTS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "VIEW_ITEM_COST_POS", "CHANGE_SETTINGS_POS", "ACCESS_LIVE_CHAT_POS", "LOGIN_WITH_EMAIL", "VIEW_SALES_REPORTS", "CANCEL_RECEIPTS", "MANAGE_ITEMS_BO", "VIEW_ITEM_COST_BO", "MANAGE_EMPLOYEES", "MANAGE_CUSTOMERS", "MANAGE_FEATURE_SETTINGS", "MANAGE_BILLING", "MANAGE_PAYMENT_TYPES", "MANAGE_LOYALTY_PROGRAM", "MANAGE_TAXES", "MANAGE_KITCHEN_PRINTERS", "MANAGE_DINING_OPTIONS", "MANAGE_POS_DEVICES", "ACCESS_LIVE_CHAT_BO"]'::jsonb),
('Charlie Brown', 'charlie@orderflow.com', 'Manager', '3333', '["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "APPLY_DISCOUNTS", "VIEW_ALL_RECEIPTS", "PERFORM_REFUNDS", "VIEW_SHIFT_REPORT", "MANAGE_ITEMS_POS", "LOGIN_WITH_EMAIL", "VIEW_SALES_REPORTS", "MANAGE_EMPLOYEES"]'::jsonb),
('Diana Prince', 'diana@orderflow.com', 'Cashier', '4444', '["LOGIN_WITH_PIN", "ACCEPT_PAYMENTS", "VIEW_ALL_RECEIPTS"]'::jsonb),
('Eve Adams', 'eve@orderflow.com', 'Cashier', '5555', '["LOGIN_WITH_PIN", "VIEW_ALL_RECEIPTS"]'::jsonb);
