create table if not exists public.order_item_reservations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  stock_owner_id uuid not null references public.stock_owners(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint order_item_reservations_unique unique (order_item_id, stock_owner_id)
);

create index if not exists order_item_reservations_order_item_id_idx
on public.order_item_reservations(order_item_id);

create index if not exists order_item_reservations_stock_owner_id_idx
on public.order_item_reservations(stock_owner_id);

alter table public.order_item_reservations enable row level security;

drop policy if exists order_item_reservations_admin_all on public.order_item_reservations;
create policy order_item_reservations_admin_all
on public.order_item_reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
  created_order_item record;
  inventory_row record;
  remaining_quantity integer;
  reserved_chunk_quantity integer;
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

  for created_order_item in
    select
      order_items.id,
      order_items.variant_id,
      order_items.quantity
    from public.order_items
    where order_items.order_id = created_order_id
    order by order_items.created_at, order_items.id
  loop
    remaining_quantity := created_order_item.quantity;

    for inventory_row in
      select
        variant_inventory.id,
        variant_inventory.stock_owner_id,
        greatest(
          variant_inventory.quantity - variant_inventory.reserved_quantity,
          0
        )::integer as available_quantity
      from public.variant_inventory
      where variant_inventory.variant_id = created_order_item.variant_id
        and variant_inventory.quantity > variant_inventory.reserved_quantity
      order by
        greatest(
          variant_inventory.quantity - variant_inventory.reserved_quantity,
          0
        ) desc,
        variant_inventory.created_at asc,
        variant_inventory.id asc
      for update of variant_inventory
    loop
      exit when remaining_quantity <= 0;

      if inventory_row.available_quantity <= 0 then
        continue;
      end if;

      reserved_chunk_quantity := least(
        remaining_quantity,
        inventory_row.available_quantity
      );

      update public.variant_inventory
      set
        reserved_quantity = reserved_quantity + reserved_chunk_quantity,
        updated_at = now()
      where id = inventory_row.id;

      insert into public.order_item_reservations (
        order_item_id,
        stock_owner_id,
        quantity
      )
      values (
        created_order_item.id,
        inventory_row.stock_owner_id,
        reserved_chunk_quantity
      )
      on conflict (order_item_id, stock_owner_id)
      do update
      set quantity = public.order_item_reservations.quantity + excluded.quantity;

      insert into public.stock_movements (
        variant_id,
        stock_owner_id,
        order_item_id,
        movement_type,
        quantity,
        note
      )
      values (
        created_order_item.variant_id,
        inventory_row.stock_owner_id,
        created_order_item.id,
        'reserve',
        reserved_chunk_quantity,
        'Stock reserved automatically at checkout'
      );

      remaining_quantity := remaining_quantity - reserved_chunk_quantity;
    end loop;

    if remaining_quantity > 0 then
      raise exception 'One or more items are no longer available in the requested quantity.';
    end if;
  end loop;

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
