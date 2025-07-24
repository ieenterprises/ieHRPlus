--
-- Create a function to handle new user creation
-- This function will be called by a trigger when a new user is created in the auth.users table
--
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role, permissions, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'role',
    (new.raw_user_meta_data->>'permissions')::json,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;
--
-- Create a trigger to call the handle_new_user function
--
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--
-- Enable Row Level Security (RLS) for all tables
--
alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.pos_devices enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.reservations enable row level security;
alter table public.debts enable row level security;
alter table public.open_tickets enable row level security;

--
-- Create Policies for RLS
-- These are basic policies allowing authenticated users to perform actions.
-- You should review and tighten these policies based on your application's security requirements.
--
-- Users Table
drop policy if exists "Allow authenticated users to view users" on public.users;
create policy "Allow authenticated users to view users" on public.users
  for select using (auth.role() = 'authenticated');
drop policy if exists "Allow owner/admin to manage users" on public.users;
create policy "Allow owner/admin to manage users" on public.users
  for all using (
    (select role from public.users where id = auth.uid()) IN ('Owner', 'Administrator')
  );
drop policy if exists "Allow users to see their own profile" on public.users;
create policy "Allow users to see their own profile" on public.users
  for select using (auth.uid() = id);

-- Stores Table
drop policy if exists "Allow authenticated read access to stores" on public.stores;
create policy "Allow authenticated read access to stores" on public.stores
  for select using (auth.role() = 'authenticated');
drop policy if exists "Allow owner/admin to manage stores" on public.stores;
create policy "Allow owner/admin to manage stores" on public.stores
  for all using (
    (select role from public.users where id = auth.uid()) IN ('Owner', 'Administrator')
  );

-- POS Devices Table
drop policy if exists "Allow authenticated read access to pos_devices" on public.pos_devices;
create policy "Allow authenticated read access to pos_devices" on public.pos_devices
  for select using (auth.role() = 'authenticated');
drop policy if exists "Allow owner/admin to manage pos_devices" on public.pos_devices;
create policy "Allow owner/admin to manage pos_devices" on public.pos_devices
  for all using (
    (select role from public.users where id = auth.uid()) IN ('Owner', 'Administrator')
  );

-- Other tables (simple authenticated access for now, can be refined)
drop policy if exists "Allow authenticated access to all" on public.categories;
create policy "Allow authenticated access to all" on public.categories for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.products;
create policy "Allow authenticated access to all" on public.products for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.customers;
create policy "Allow authenticated access to all" on public.customers for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.sales;
create policy "Allow authenticated access to all" on public.sales for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.reservations;
create policy "Allow authenticated access to all" on public.reservations for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.debts;
create policy "Allow authenticated access to all" on public.debts for all using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated access to all" on public.open_tickets;
create policy "Allow authenticated access to all" on public.open_tickets for all using (auth.role() = 'authenticated');


--
-- Create Tables
--
-- Stores Table
create table if not exists public.stores (
    id text primary key,
    name text not null,
    address text not null
);
-- POS Devices Table
create table if not exists public.pos_devices (
    id text primary key,
    name text not null,
    store_id text not null references public.stores(id) on delete cascade
);
-- Users Table
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamp with time zone default now(),
    email text not null unique,
    name text not null,
    role text not null,
    permissions json,
    avatar_url text
);
-- Categories Table
create table if not exists public.categories (
    id text primary key default 'cat_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    name text not null
);
-- Products Table
create table if not exists public.products (
    id text primary key default 'prod_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    name text not null,
    price real not null,
    stock integer not null default 0,
    category_id text references public.categories(id) on delete set null,
    image_url text
);
-- Customers Table
create table if not exists public.customers (
    id text primary key default 'cust_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    name text not null,
    email text not null,
    phone text
);
-- Sales Table
create table if not exists public.sales (
    id text primary key default 'sale_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    order_number serial,
    total real not null,
    items json not null,
    payment_methods json not null,
    status text not null,
    customer_id text references public.customers(id) on delete set null,
    employee_id uuid references public.users(id) on delete set null,
    pos_device_id text references public.pos_devices(id) on delete set null
);
-- Debts Table
create table if not exists public.debts (
    id text primary key default 'debt_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    amount real not null,
    status text not null,
    customer_id text references public.customers(id) on delete cascade,
    sale_id text references public.sales(id) on delete cascade
);
-- Reservations Table
create table if not exists public.reservations (
    id text primary key default 'res_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    guest_name text not null,
    check_in timestamp with time zone not null,
    check_out timestamp with time zone not null,
    status text not null,
    product_id text references public.products(id) on delete set null
);
-- Open Tickets Table
create table if not exists public.open_tickets (
    id text primary key default 'ticket_' || substr(md5(random()::text), 0, 10),
    created_at timestamp with time zone default now(),
    ticket_name text,
    total real not null,
    items json not null,
    notes text,
    employee_id uuid references public.users(id) on delete set null,
    customer_id text references public.customers(id) on delete set null
);

-- Seed initial data
-- Create a default "Walk-in Customer"
insert into public.customers (id, name, email, phone)
values ('cust_walkin', 'Walk-in Customer', 'walkin@example.com', null)
on conflict (id) do nothing;
