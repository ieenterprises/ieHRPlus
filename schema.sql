-- Drop tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS public.debts;
DROP TABLE IF EXISTS public.open_tickets;
DROP TABLE IF EXISTS public.reservations;
DROP TABLE IF EXISTS public.sales;
DROP TABLE IF EXISTS public.printers;
DROP TABLE IF EXISTS public.pos_devices;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.stores;

-- Drop functions and other objects if they exist
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Create stores table first as other tables depend on it
CREATE TABLE public.stores (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL
);

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    avatar_url TEXT,
    permissions JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pos_devices table
CREATE TABLE public.pos_devices (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    total REAL NOT NULL,
    items JSONB NOT NULL,
    payment_methods JSONB NOT NULL,
    status TEXT NOT NULL,
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pos_device_id TEXT REFERENCES public.pos_devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create debts table
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create open_tickets table
CREATE TABLE public.open_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_name TEXT,
    items JSONB NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, avatar_url, permissions)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        new.email,
        new.raw_user_meta_data->>'role',
        new.raw_user_meta_data->>'avatar_url',
        (new.raw_user_meta_data->>'permissions')::jsonb
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policies for public access (users can see their own data, etc.)
-- Allow public access to stores (all users need this info)
DROP POLICY IF EXISTS "Allow public read access to stores" ON public.stores;
CREATE POLICY "Allow public read access to stores" ON public.stores FOR SELECT USING (true);

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Allow individual read access to users" ON public.users;
CREATE POLICY "Allow individual read access to users" ON public.users FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Allow individual update access to users" ON public.users;
CREATE POLICY "Allow individual update access to users" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Allow read access to all authenticated users for some tables
DROP POLICY IF EXISTS "Allow authenticated read access to categories" ON public.categories;
CREATE POLICY "Allow authenticated read access to categories" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read access to products" ON public.products;
CREATE POLICY "Allow authenticated read access to products" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read access to customers" ON public.customers;
CREATE POLICY "Allow authenticated read access to customers" ON public.customers FOR SELECT TO authenticated USING (true);

-- Allow service_role to manage everything (needed for admin operations)
-- Example for one table, repeat for others as necessary or create a role
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
CREATE POLICY "Allow admin full access" ON public.users FOR ALL USING (true) WITH CHECK (true);
-- You would create similar admin policies for all tables for full control from server-side admin client

-- Allow authenticated users to perform actions based on their role (more complex policies)
-- For example, allow users to insert sales
DROP POLICY IF EXISTS "Allow authenticated users to create sales" ON public.sales;
CREATE POLICY "Allow authenticated users to create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

-- Allow users to view sales they created
DROP POLICY IF EXISTS "Allow individual read access to sales" ON public.sales;
CREATE POLICY "Allow individual read access to sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = employee_id);


-- Policies for full access to all tables for the 'service_role' key
-- This is crucial for server-side actions (`supabaseAdmin`).
CREATE POLICY "Allow service role full access on stores" ON public.stores FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on users" ON public.users FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on categories" ON public.categories FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on products" ON public.products FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on customers" ON public.customers FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on pos_devices" ON public.pos_devices FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on sales" ON public.sales FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on debts" ON public.debts FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on open_tickets" ON public.open_tickets FOR ALL TO service_role;
CREATE POLICY "Allow service role full access on reservations" ON public.reservations FOR ALL TO service_role;


-- Pre-populate some data (optional, but helpful for development)

-- Insert a default "Walk-in Customer"
INSERT INTO public.customers (name, email, phone) VALUES ('Walk-in Customer', 'walkin@example.com', NULL)
ON CONFLICT (email) DO NOTHING;

-- Insert a default "Room" category
INSERT INTO public.categories (name) VALUES ('Room')
ON CONFLICT (name) DO NOTHING;
