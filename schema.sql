-- Drop existing tables in reverse order of dependency to avoid errors
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.open_tickets CASCADE;
DROP TABLE IF EXISTS public.pos_devices CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- Drop the function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Drop users table if it exists (assuming it's managed by this script and not just auth)
DROP TABLE IF EXISTS public.users CASCADE;


-- Create the stores table first as other tables depend on it
CREATE TABLE public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL
);

-- Create the categories table
create table public.categories (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text not null,
    primary key (id)
);

-- Create the products table
create table public.products (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text not null,
    price real not null,
    stock integer not null,
    image_url text null,
    category_id uuid null,
    primary key (id),
    constraint products_category_id_fkey foreign key (category_id) references categories (id) on delete set null
);

-- Create the customers table
create table public.customers (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text not null,
    email text not null,
    phone text null,
    primary key (id)
);


-- Create the users table to store public user data
create table public.users (
  id uuid not null references auth.users on delete cascade,
  email text not null,
  name text not null,
  avatar_url text null,
  role text not null,
  permissions jsonb null,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url, role, permissions)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'role',
    (new.raw_user_meta_data ->> 'permissions')::jsonb
  );
  return new;
end;
$$;

-- Create a trigger to execute the function on new user sign-up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Create POS Devices table
CREATE TABLE public.pos_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    store_id TEXT NOT NULL,
    CONSTRAINT pos_devices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE
);

-- Create the sales table
create table public.sales (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    order_number serial not null,
    total real not null,
    items jsonb not null,
    payment_methods jsonb not null,
    status text not null,
    customer_id uuid null,
    employee_id uuid null,
    pos_device_id TEXT,
    primary key (id),
    constraint sales_customer_id_fkey foreign key (customer_id) references customers (id) on delete set null,
    constraint sales_employee_id_fkey foreign key (employee_id) references users (id) on delete set null,
    CONSTRAINT fk_pos_device FOREIGN KEY (pos_device_id) REFERENCES public.pos_devices(id)
);

-- Create the debts table
create table public.debts (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    amount real not null,
    status text not null,
    customer_id uuid null,
    sale_id uuid null,
    primary key (id),
    constraint debts_customer_id_fkey foreign key (customer_id) references customers (id) on delete set null,
    constraint debts_sale_id_fkey foreign key (sale_id) references sales (id) on delete cascade
);

-- Create the reservations table
create table public.reservations (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    check_in timestamp with time zone not null,
    check_out timestamp with time zone not null,
    guest_name text not null,
    status text not null,
    product_id uuid null,
    primary key (id),
    constraint reservations_product_id_fkey foreign key (product_id) references products (id) on delete set null
);

-- Create the open_tickets table
create table public.open_tickets (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    total real not null,
    items jsonb not null,
    notes text null,
    ticket_name text null,
    employee_id uuid null,
    customer_id uuid null,
    primary key (id),
    constraint open_tickets_employee_id_fkey foreign key (employee_id) references users (id) on delete set null,
    constraint open_tickets_customer_id_fkey foreign key (customer_id) references customers (id) on delete set null
);

-- SEED DATA --

-- Seed some default data for a better starting experience
INSERT INTO public.stores (id, name, address) VALUES
('store_1', 'Main Branch', '123 Main St, Anytown, USA'),
('store_2', 'Casoni Outdoor Bar', '456 Oak Ave, Sometown, USA');

INSERT INTO public.pos_devices (id, name, store_id) VALUES
('pos_1', 'Front Counter', 'store_1'),
('pos_2', 'Bar Terminal', 'store_1'),
('pos_3', 'Outdoor Bar POS', 'store_2');

INSERT INTO public.categories (name) VALUES
('Food'),
('Beverages'),
('Room');

INSERT INTO public.customers (name, email, phone) VALUES
('Walk-in Customer', 'walkin@example.com', '111-111-1111'),
('John Doe', 'john.doe@example.com', '123-456-7890');
