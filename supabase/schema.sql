-- Create categories table
create table public.categories (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    name text not null,
    constraint categories_pkey primary key (id)
);
alter table public.categories enable row level security;
create policy "Enable all access for all users" on public.categories for all using (true) with check (true);

-- Create products table
create table public.products (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    name text not null,
    price numeric not null,
    stock integer not null,
    image_url text null,
    category_id uuid null,
    constraint products_pkey primary key (id),
    constraint products_category_id_fkey foreign key (category_id) references categories (id) on delete set null
);
alter table public.products enable row level security;
create policy "Enable all access for all users" on public.products for all using (true) with check (true);

-- Create users table
create table public.users (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    name text not null,
    email text not null,
    role text not null,
    pin text null,
    avatar_url text null,
    permissions jsonb null,
    constraint users_pkey primary key (id),
    constraint users_email_key unique (email)
);
alter table public.users enable row level security;
create policy "Enable all access for all users" on public.users for all using (true) with check (true);

-- Create customers table
create table public.customers (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    name text not null,
    email text not null,
    phone text null,
    constraint customers_pkey primary key (id),
    constraint customers_email_key unique (email)
);
alter table public.customers enable row level security;
create policy "Enable all access for all users" on public.customers for all using (true) with check (true);

-- Create sales table
create table public.sales (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    order_number serial,
    items jsonb not null,
    total numeric not null,
    payment_methods jsonb not null,
    status text not null,
    customer_id uuid null,
    employee_id uuid null,
    constraint sales_pkey primary key (id),
    constraint sales_order_number_key unique (order_number),
    constraint sales_customer_id_fkey foreign key (customer_id) references customers (id) on delete set null,
    constraint sales_employee_id_fkey foreign key (employee_id) references users (id) on delete set null
);
alter table public.sales enable row level security;
create policy "Enable all access for all users" on public.sales for all using (true) with check (true);

-- Create reservations table
create table public.reservations (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    guest_name text not null,
    check_in timestamp with time zone not null,
    check_out timestamp with time zone not null,
    status text not null,
    product_id uuid null,
    constraint reservations_pkey primary key (id),
    constraint reservations_product_id_fkey foreign key (product_id) references products (id) on delete set null
);
alter table public.reservations enable row level security;
create policy "Enable all access for all users" on public.reservations for all using (true) with check (true);

-- Create debts table
create table public.debts (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone null default now(),
    amount numeric not null,
    status text not null,
    sale_id uuid null,
    customer_id uuid null,
    constraint debts_pkey primary key (id),
    constraint debts_sale_id_fkey foreign key (sale_id) references sales (id) on delete cascade,
    constraint debts_customer_id_fkey foreign key (customer_id) references customers (id) on delete cascade
);
alter table public.debts enable row level security;
create policy "Enable all access for all users" on public.debts for all using (true) with check (true);


-- SEED DATA
-- Insert a mandatory 'Room' category for reservations to work, plus a few others.
INSERT INTO public.categories (name) VALUES ('Room'), ('Food'), ('Drinks');

-- Insert a default Administrator user
INSERT INTO public.users (name, email, role, pin, permissions, avatar_url) VALUES 
('Admin User', 'admin@orderflow.com', 'Administrator', '1234', '["LOGIN_WITH_PIN","ACCEPT_PAYMENTS","APPLY_DISCOUNTS","CHANGE_TAXES","MANAGE_OPEN_TICKETS","VOID_SAVED_ITEMS","OPEN_CASH_DRAWER_NO_SALE","VIEW_ALL_RECEIPTS","PERFORM_REFUNDS","REPRINT_RECEIPTS","VIEW_SHIFT_REPORT","MANAGE_ITEMS_POS","VIEW_ITEM_COST_POS","CHANGE_SETTINGS_POS","ACCESS_LIVE_CHAT_POS","LOGIN_WITH_EMAIL","VIEW_SALES_REPORTS","CANCEL_RECEIPTS","MANAGE_ITEMS_BO","VIEW_ITEM_COST_BO","MANAGE_EMPLOYEES","MANAGE_CUSTOMERS","MANAGE_FEATURE_SETTINGS","MANAGE_BILLING","MANAGE_PAYMENT_TYPES","MANAGE_LOYALTY_PROGRAM","MANAGE_TAXES","MANAGE_KITCHEN_PRINTERS","MANAGE_DINING_OPTIONS","MANAGE_POS_DEVICES","ACCESS_LIVE_CHAT_BO"]'::jsonb, 'https://placehold.co/100x100.png');

-- Insert a default Cashier user for testing permissions
INSERT INTO public.users (name, email, role, pin, permissions, avatar_url) VALUES
('Eve Adams', 'eve@orderflow.com', 'Cashier', '5555', '["LOGIN_WITH_PIN"]'::jsonb, 'https://placehold.co/100x100.png');
