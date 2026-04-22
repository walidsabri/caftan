do $$
declare
  pending_order_item record;
  inventory_row record;
  remaining_quantity integer;
  reserved_chunk_quantity integer;
begin
  for pending_order_item in
    select
      order_items.id,
      order_items.variant_id,
      order_items.quantity,
      orders.order_number
    from public.order_items
    join public.orders
      on orders.id = order_items.order_id
    where orders.status in ('pending', 'confirmed')
      and order_items.assigned_stock_owner_id is null
      and not exists (
        select 1
        from public.order_item_reservations
        where order_item_reservations.order_item_id = order_items.id
      )
    order by
      orders.created_at asc,
      order_items.created_at asc,
      order_items.id asc
  loop
    remaining_quantity := pending_order_item.quantity;

    for inventory_row in
      select
        variant_inventory.id,
        variant_inventory.stock_owner_id,
        greatest(
          variant_inventory.quantity - variant_inventory.reserved_quantity,
          0
        )::integer as available_quantity
      from public.variant_inventory
      where variant_inventory.variant_id = pending_order_item.variant_id
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
        pending_order_item.id,
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
        pending_order_item.variant_id,
        inventory_row.stock_owner_id,
        pending_order_item.id,
        'reserve',
        reserved_chunk_quantity,
        'Backfilled reservation for existing pending order'
      );

      remaining_quantity := remaining_quantity - reserved_chunk_quantity;
    end loop;

    if remaining_quantity > 0 then
      raise exception
        'Unable to reserve enough stock for order %.',
        pending_order_item.order_number;
    end if;
  end loop;
end;
$$;
