create or replace function public.get_storefront_product_variants(
  target_product_id uuid default null
)
returns table (
  variant_id uuid,
  product_id uuid,
  color_id uuid,
  color_name text,
  size_id uuid,
  size_name text,
  size_sort_order integer,
  available_quantity integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    product_variants.id as variant_id,
    product_variants.product_id,
    product_variants.color_id,
    colors.name as color_name,
    product_variants.size_id,
    sizes.name as size_name,
    sizes.sort_order as size_sort_order,
    greatest(
      coalesce(sum(variant_inventory.quantity - variant_inventory.reserved_quantity), 0),
      0
    )::integer as available_quantity
  from public.product_variants
  join public.products
    on products.id = product_variants.product_id
  join public.categories
    on categories.id = products.category_id
  join public.colors
    on colors.id = product_variants.color_id
  join public.sizes
    on sizes.id = product_variants.size_id
  left join public.variant_inventory
    on variant_inventory.variant_id = product_variants.id
  where products.is_active = true
    and categories.is_active = true
    and (target_product_id is null or product_variants.product_id = target_product_id)
  group by
    product_variants.id,
    product_variants.product_id,
    product_variants.color_id,
    colors.name,
    product_variants.size_id,
    sizes.name,
    sizes.sort_order
  order by lower(colors.name), sizes.sort_order, lower(sizes.name);
$$;

revoke all on function public.get_storefront_product_variants(uuid) from public;
grant execute on function public.get_storefront_product_variants(uuid) to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;

drop policy if exists categories_public_read_active on public.categories;
create policy categories_public_read_active
on public.categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists products_public_read_active on public.products;
create policy products_public_read_active
on public.products
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.categories
    where categories.id = products.category_id
      and categories.is_active = true
  )
);

drop policy if exists product_images_public_read_active on public.product_images;
create policy product_images_public_read_active
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    join public.categories
      on categories.id = products.category_id
    where products.id = product_images.product_id
      and products.is_active = true
      and categories.is_active = true
  )
);
