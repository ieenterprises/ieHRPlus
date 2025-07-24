-- Drop existing tables in reverse order of creation to avoid foreign key constraints
DROP TABLE IF EXISTS public.debts;
DROP TABLE IF EXISTS public.reservations;
DROP TABLE IF EXISTS public.sales;
DROP TABLE IF EXISTS public.open_tickets;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.pos_devices;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.users;

-- Create users table
-- This table is managed by Supabase Auth, but we define it here for clarity and to add custom columns.
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying NOT NULL UNIQUE,
    role character varying NOT NULL,
    avatar_url character varying,
    permissions jsonb,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read their own user record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users to update their own user record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Function to create a public user profile when a new auth user is created.
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

-- Trigger to execute the function upon new user creation in Supabase Auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create stores table
CREATE TABLE public.stores (
    id text NOT NULL PRIMARY KEY DEFAULT 'store_' || substr(md5(random()::text), 0, 8),
    name character varying NOT NULL,
    address character varying
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read stores" ON public.stores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/owner to manage stores" ON public.stores FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrator', 'Owner')
);

-- Create pos_devices table
CREATE TABLE public.pos_devices (
    id text NOT NULL PRIMARY KEY DEFAULT 'pos_' || substr(md5(random()::text), 0, 8),
    name character varying NOT NULL,
    store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE
);
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read POS devices" ON public.pos_devices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/owner to manage POS devices" ON public.pos_devices FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrator', 'Owner')
);


-- Create categories table
CREATE TABLE public.categories (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/owner to manage categories" ON public.categories FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrator', 'Owner')
);

-- Create products table
CREATE TABLE public.products (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    price double precision NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to manage products" ON public.products FOR ALL USING (
    'MANAGE_ITEMS_BO' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);

-- Create customers table
CREATE TABLE public.customers (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read customers" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to manage customers" ON public.customers FOR ALL USING (
    'MANAGE_CUSTOMERS' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);


-- Create sales table
CREATE TABLE public.sales (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number serial,
    items jsonb NOT NULL,
    total double precision NOT NULL,
    payment_methods jsonb NOT NULL,
    status character varying NOT NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    employee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    pos_device_id text REFERENCES public.pos_devices(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read sales" ON public.sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to create sales" ON public.sales FOR INSERT WITH CHECK (
    'ACCEPT_PAYMENTS' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);

-- Create open_tickets table
CREATE TABLE public.open_tickets (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_name character varying,
    items jsonb NOT NULL,
    total double precision NOT NULL,
    notes text,
    employee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.open_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read open tickets" ON public.open_tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to manage open tickets" ON public.open_tickets FOR ALL USING (
    'MANAGE_OPEN_TICKETS' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);


-- Create debts table
CREATE TABLE public.debts (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    amount double precision NOT NULL,
    status character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read debts" ON public.debts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to manage debts" ON public.debts FOR ALL USING (
    'VIEW_ALL_RECEIPTS' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);


-- Create reservations table
CREATE TABLE public.reservations (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name character varying NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    check_in timestamp with time zone NOT NULL,
    check_out timestamp with time zone NOT NULL,
    status character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read reservations" ON public.reservations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authorized users to manage reservations" ON public.reservations FOR ALL USING (
    'MANAGE_ITEMS_BO' = ANY (SELECT jsonb_array_elements_text((SELECT permissions FROM public.users WHERE id = auth.uid()))::text)
);


-- Insert initial data (optional, but good for starting)
INSERT INTO public.customers (name, email, phone) VALUES ('Walk-in Customer', 'walkin@example.com', NULL);
INSERT INTO public.categories (name) VALUES ('Food'), ('Beverage'), ('Room');
