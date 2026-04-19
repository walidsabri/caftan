create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.bootstrap_admin_profile(
  admin_email text,
  admin_name text default null
)
returns public.admin_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  target_user_email text;
  target_user_name text;
  profile public.admin_profiles;
begin
  select
    id,
    email,
    coalesce(
      raw_user_meta_data ->> 'full_name',
      raw_user_meta_data ->> 'name'
    )
  into
    target_user_id,
    target_user_email,
    target_user_name
  from auth.users
  where lower(email) = lower(admin_email)
    and deleted_at is null
  order by created_at desc
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for %', admin_email;
  end if;

  insert into public.admin_profiles (id, email, full_name)
  values (
    target_user_id,
    target_user_email,
    coalesce(admin_name, target_user_name)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.admin_profiles.full_name)
  returning * into profile;

  return profile;
end;
$$;

alter table public.admin_profiles enable row level security;
drop policy if exists admin_profiles_select_own on public.admin_profiles;
create policy admin_profiles_select_own
on public.admin_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists admin_profiles_admin_read on public.admin_profiles;
create policy admin_profiles_admin_read
on public.admin_profiles
for select
to authenticated
using (public.is_admin());

alter table public.stock_owners enable row level security;
drop policy if exists stock_owners_admin_all on public.stock_owners;
create policy stock_owners_admin_all
on public.stock_owners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.categories enable row level security;
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.products enable row level security;
drop policy if exists products_admin_all on public.products;
create policy products_admin_all
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.colors enable row level security;
drop policy if exists colors_admin_all on public.colors;
create policy colors_admin_all
on public.colors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.sizes enable row level security;
drop policy if exists sizes_admin_all on public.sizes;
create policy sizes_admin_all
on public.sizes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.product_images enable row level security;
drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.product_variants enable row level security;
drop policy if exists product_variants_admin_all on public.product_variants;
create policy product_variants_admin_all
on public.product_variants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.variant_inventory enable row level security;
drop policy if exists variant_inventory_admin_all on public.variant_inventory;
create policy variant_inventory_admin_all
on public.variant_inventory
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.orders enable row level security;
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.order_items enable row level security;
drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.stock_movements enable row level security;
drop policy if exists stock_movements_admin_all on public.stock_movements;
create policy stock_movements_admin_all
on public.stock_movements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
