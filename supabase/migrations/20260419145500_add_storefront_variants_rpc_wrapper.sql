create or replace function public.get_storefront_product_variants()
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
  select *
  from public.get_storefront_product_variants(null::uuid);
$$;

revoke all on function public.get_storefront_product_variants() from public;
grant execute on function public.get_storefront_product_variants() to anon, authenticated;
