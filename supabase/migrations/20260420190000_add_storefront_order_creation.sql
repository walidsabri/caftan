alter table public.orders
add column if not exists shipping_method text
  check (shipping_method in ('home', 'desk'));

create or replace function public.create_storefront_order(
  customer_name_input text,
  customer_phone_input text,
  wilaya_input text,
  commune_input text,
  address_input text,
  notes_input text,
  shipping_method_input text,
  shipping_fee_input integer,
  order_items_input jsonb
)
returns table (
  order_id uuid,
  order_number text,
  subtotal integer,
  shipping_fee integer,
  total_amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_customer_name text := nullif(btrim(customer_name_input), '');
  normalized_customer_phone text := nullif(btrim(customer_phone_input), '');
  normalized_wilaya text := nullif(btrim(wilaya_input), '');
  normalized_commune text := nullif(btrim(commune_input), '');
  normalized_address text := nullif(btrim(address_input), '');
  normalized_notes text := nullif(btrim(notes_input), '');
  normalized_shipping_method text := lower(nullif(btrim(shipping_method_input), ''));
  normalized_shipping_fee integer := greatest(coalesce(shipping_fee_input, 0), 0);
  generated_order_number text := concat(
    'CFT-',
    to_char(now(), 'YYYYMMDD'),
    '-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
  created_order_id uuid;
  computed_subtotal integer;
begin
  if normalized_customer_name is null then
    raise exception 'Customer name is required.';
  end if;

  if normalized_customer_phone is null then
    raise exception 'Customer phone is required.';
  end if;

  if normalized_wilaya is null then
    raise exception 'Wilaya is required.';
  end if;

  if normalized_address is null then
    raise exception 'Address is required.';
  end if;

  if normalized_shipping_method not in ('home', 'desk') then
    raise exception 'Invalid shipping method.';
  end if;

  if order_items_input is null
    or jsonb_typeof(order_items_input) <> 'array'
    or jsonb_array_length(order_items_input) = 0 then
    raise exception 'At least one order item is required.';
  end if;

  with parsed_items as (
    select
      (item ->> 'variantId')::uuid as variant_id,
      greatest(coalesce((item ->> 'quantity')::integer, 0), 0) as quantity
    from jsonb_array_elements(order_items_input) as item
  ),
  aggregated_items as (
    select
      variant_id,
      sum(quantity)::integer as quantity
    from parsed_items
    group by variant_id
  ),
  resolved_items as (
    select
      aggregated_items.variant_id,
      aggregated_items.quantity,
      product_variants.product_id,
      products.name as product_name,
      colors.name as color_name,
      sizes.name as size_name,
      products.price as unit_price,
      greatest(
        coalesce(sum(variant_inventory.quantity - variant_inventory.reserved_quantity), 0),
        0
      )::integer as available_quantity
    from aggregated_items
    join public.product_variants
      on product_variants.id = aggregated_items.variant_id
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
    where aggregated_items.quantity > 0
      and products.is_active = true
      and categories.is_active = true
    group by
      aggregated_items.variant_id,
      aggregated_items.quantity,
      product_variants.product_id,
      products.name,
      colors.name,
      sizes.name,
      products.price
  )
  select
    coalesce(sum(resolved_items.unit_price * resolved_items.quantity), 0)::integer
  into computed_subtotal
  from resolved_items;

  if exists (
    with parsed_items as (
      select
        (item ->> 'variantId')::uuid as variant_id,
        greatest(coalesce((item ->> 'quantity')::integer, 0), 0) as quantity
      from jsonb_array_elements(order_items_input) as item
    ),
    aggregated_items as (
      select
        variant_id,
        sum(quantity)::integer as quantity
      from parsed_items
      group by variant_id
    ),
    resolved_items as (
      select distinct
        aggregated_items.variant_id
      from aggregated_items
      join public.product_variants
        on product_variants.id = aggregated_items.variant_id
      join public.products
        on products.id = product_variants.product_id
      join public.categories
        on categories.id = products.category_id
      where aggregated_items.quantity > 0
        and products.is_active = true
        and categories.is_active = true
    )
    select 1
    from aggregated_items
    left join resolved_items
      on resolved_items.variant_id = aggregated_items.variant_id
    where aggregated_items.quantity <= 0
      or resolved_items.variant_id is null
  ) then
    raise exception 'One or more order items are invalid or unavailable.';
  end if;

  if computed_subtotal <= 0 then
    raise exception 'No valid order items were provided.';
  end if;

  if exists (
    with parsed_items as (
      select
        (item ->> 'variantId')::uuid as variant_id,
        greatest(coalesce((item ->> 'quantity')::integer, 0), 0) as quantity
      from jsonb_array_elements(order_items_input) as item
    ),
    aggregated_items as (
      select
        variant_id,
        sum(quantity)::integer as quantity
      from parsed_items
      group by variant_id
    ),
    resolved_items as (
      select
        aggregated_items.variant_id,
        aggregated_items.quantity,
        greatest(
          coalesce(sum(variant_inventory.quantity - variant_inventory.reserved_quantity), 0),
          0
        )::integer as available_quantity
      from aggregated_items
      join public.product_variants
        on product_variants.id = aggregated_items.variant_id
      join public.products
        on products.id = product_variants.product_id
      join public.categories
        on categories.id = products.category_id
      left join public.variant_inventory
        on variant_inventory.variant_id = product_variants.id
      where aggregated_items.quantity > 0
        and products.is_active = true
        and categories.is_active = true
      group by aggregated_items.variant_id, aggregated_items.quantity
    )
    select 1
    from resolved_items
    where quantity > available_quantity
  ) then
    raise exception 'One or more items are no longer available in the requested quantity.';
  end if;

  insert into public.orders (
    order_number,
    customer_name,
    customer_phone,
    wilaya,
    commune,
    address,
    notes,
    status,
    subtotal,
    shipping_method,
    shipping_fee,
    total_amount,
    shipping_company
  )
  values (
    generated_order_number,
    normalized_customer_name,
    normalized_customer_phone,
    normalized_wilaya,
    normalized_commune,
    normalized_address,
    normalized_notes,
    'pending',
    computed_subtotal,
    normalized_shipping_method,
    normalized_shipping_fee,
    computed_subtotal + normalized_shipping_fee,
    'ZR Express'
  )
  returning id into created_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    color_name,
    size_name,
    unit_price,
    quantity
  )
  with parsed_items as (
    select
      (item ->> 'variantId')::uuid as variant_id,
      greatest(coalesce((item ->> 'quantity')::integer, 0), 0) as quantity
    from jsonb_array_elements(order_items_input) as item
  ),
  aggregated_items as (
    select
      variant_id,
      sum(quantity)::integer as quantity
    from parsed_items
    group by variant_id
  ),
  resolved_items as (
    select
      aggregated_items.variant_id,
      aggregated_items.quantity,
      product_variants.product_id,
      products.name as product_name,
      colors.name as color_name,
      sizes.name as size_name,
      products.price as unit_price
    from aggregated_items
    join public.product_variants
      on product_variants.id = aggregated_items.variant_id
    join public.products
      on products.id = product_variants.product_id
    join public.categories
      on categories.id = products.category_id
    join public.colors
      on colors.id = product_variants.color_id
    join public.sizes
      on sizes.id = product_variants.size_id
    where aggregated_items.quantity > 0
      and products.is_active = true
      and categories.is_active = true
  )
  select
    created_order_id,
    resolved_items.product_id,
    resolved_items.variant_id,
    resolved_items.product_name,
    resolved_items.color_name,
    resolved_items.size_name,
    resolved_items.unit_price,
    resolved_items.quantity
  from resolved_items;

  return query
  select
    created_order_id,
    generated_order_number,
    computed_subtotal,
    normalized_shipping_fee,
    computed_subtotal + normalized_shipping_fee;
end;
$$;

revoke all on function public.create_storefront_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) from public;

grant execute on function public.create_storefront_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) to anon, authenticated;
