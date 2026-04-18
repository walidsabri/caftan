create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_owners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  price integer not null check (price >= 0),
  old_price integer check (old_price is null or old_price > price),
  cover_image_url text,
  cover_image_public_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid references public.colors(id) on delete set null,
  image_url text not null,
  image_public_id text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx
on public.product_images(product_id);

create index if not exists product_images_color_id_idx
on public.product_images(color_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete restrict,
  size_id uuid not null references public.sizes(id) on delete restrict,
  sku text,
  created_at timestamptz not null default now(),
  constraint product_variants_unique unique (product_id, color_id, size_id),
  constraint product_variants_sku_unique unique (sku)
);

create index if not exists product_variants_product_id_idx
on public.product_variants(product_id);

create index if not exists product_variants_color_id_idx
on public.product_variants(color_id);

create index if not exists product_variants_size_id_idx
on public.product_variants(size_id);

create table if not exists public.variant_inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  stock_owner_id uuid not null references public.stock_owners(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variant_inventory_unique unique (variant_id, stock_owner_id),
  constraint reserved_not_more_than_quantity check (reserved_quantity <= quantity)
);

drop trigger if exists variant_inventory_set_updated_at on public.variant_inventory;
create trigger variant_inventory_set_updated_at
before update on public.variant_inventory
for each row
execute function public.set_updated_at();

create index if not exists variant_inventory_variant_id_idx
on public.variant_inventory(variant_id);

create index if not exists variant_inventory_owner_id_idx
on public.variant_inventory(stock_owner_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  wilaya text not null,
  commune text,
  address text not null,
  notes text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'confirmed',
      'assigned',
      'preparing',
      'shipped',
      'delivered',
      'cancelled',
      'returned'
    )),
  assigned_stock_owner_id uuid references public.stock_owners(id) on delete set null,
  subtotal integer not null default 0 check (subtotal >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  shipping_company text,
  shipping_status text,
  tracking_number text,
  shipping_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create index if not exists orders_status_idx
on public.orders(status);

create index if not exists orders_assigned_stock_owner_id_idx
on public.orders(assigned_stock_owner_id);

create index if not exists orders_created_at_idx
on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  color_name text not null,
  size_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  assigned_stock_owner_id uuid references public.stock_owners(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx
on public.order_items(order_id);

create index if not exists order_items_variant_id_idx
on public.order_items(variant_id);

create index if not exists order_items_assigned_stock_owner_id_idx
on public.order_items(assigned_stock_owner_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  stock_owner_id uuid not null references public.stock_owners(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete set null,
  movement_type text not null
    check (movement_type in (
      'initial',
      'restock',
      'reserve',
      'release',
      'sale',
      'adjustment',
      'return'
    )),
  quantity integer not null,
  note text,
  created_by_admin_id uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_variant_id_idx
on public.stock_movements(variant_id);

create index if not exists stock_movements_owner_id_idx
on public.stock_movements(stock_owner_id);

create index if not exists stock_movements_order_item_id_idx
on public.stock_movements(order_item_id);

create index if not exists stock_movements_created_at_idx
on public.stock_movements(created_at desc);