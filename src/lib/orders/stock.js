import { createClient } from "@/lib/supabase/server";

async function getOrderItemWithReservations(supabase, orderItemId) {
  const { data: orderItem, error: orderItemError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      variant_id,
      quantity,
      assigned_stock_owner_id,
      order_item_reservations (
        id,
        stock_owner_id,
        quantity
      )
    `,
    )
    .eq("id", orderItemId)
    .single();

  if (orderItemError) {
    throw new Error(orderItemError.message);
  }

  return orderItem;
}

async function getOrderItemForSplit(supabase, orderItemId) {
  const { data: orderItem, error: orderItemError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      product_id,
      variant_id,
      product_name,
      color_name,
      size_name,
      unit_price,
      quantity,
      assigned_stock_owner_id,
      order_item_reservations (
        id,
        stock_owner_id,
        quantity,
        created_at
      )
    `,
    )
    .eq("id", orderItemId)
    .single();

  if (orderItemError) {
    throw new Error(orderItemError.message);
  }

  return orderItem;
}

async function getInventoryRow(supabase, variantId, stockOwnerId) {
  const { data: inventory, error: inventoryError } = await supabase
    .from("variant_inventory")
    .select("id, quantity, reserved_quantity")
    .eq("variant_id", variantId)
    .eq("stock_owner_id", stockOwnerId)
    .single();

  if (inventoryError) {
    throw new Error(inventoryError.message);
  }

  return inventory;
}

async function swapOrderItemReservations({
  supabase,
  targetOrderItem,
  donorOrderItemId,
}) {
  const { data: donorOrderItem, error: donorOrderItemError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_item_reservations (
        stock_owner_id,
        quantity
      )
    `,
    )
    .eq("id", donorOrderItemId)
    .single();

  if (donorOrderItemError) {
    throw new Error(donorOrderItemError.message);
  }

  const targetReservations = Array.isArray(targetOrderItem.order_item_reservations)
    ? targetOrderItem.order_item_reservations
    : [];
  const donorReservations = Array.isArray(donorOrderItem.order_item_reservations)
    ? donorOrderItem.order_item_reservations
    : [];
  const reservationOrderItemIds = [targetOrderItem.id, donorOrderItem.id];
  const { error: deleteReservationsError } = await supabase
    .from("order_item_reservations")
    .delete()
    .in("order_item_id", reservationOrderItemIds);

  if (deleteReservationsError) {
    throw new Error(deleteReservationsError.message);
  }

  const swappedReservationsPayload = [
    ...donorReservations.map((reservation) => ({
      order_item_id: targetOrderItem.id,
      stock_owner_id: reservation.stock_owner_id,
      quantity: reservation.quantity,
    })),
    ...targetReservations.map((reservation) => ({
      order_item_id: donorOrderItem.id,
      stock_owner_id: reservation.stock_owner_id,
      quantity: reservation.quantity,
    })),
  ];

  if (!swappedReservationsPayload.length) {
    return;
  }

  const { error: insertReservationsError } = await supabase
    .from("order_item_reservations")
    .insert(swappedReservationsPayload);

  if (insertReservationsError) {
    throw new Error(insertReservationsError.message);
  }
}

async function ensureOrderItemReservationOwner({
  supabase,
  orderItem,
  stockOwnerId,
}) {
  const orderItemReservations = Array.isArray(orderItem.order_item_reservations)
    ? orderItem.order_item_reservations
    : [];
  const reservedForSelectedOwner = orderItemReservations.reduce(
    (sum, reservation) =>
      reservation.stock_owner_id === stockOwnerId
        ? sum + Number(reservation.quantity || 0)
        : sum,
    0,
  );

  if (
    reservedForSelectedOwner >= Number(orderItem.quantity || 0) ||
    Number(orderItem.quantity || 0) !== 1
  ) {
    return orderItem;
  }

  const { data: siblingOrderItems, error: siblingOrderItemsError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_item_reservations (
        stock_owner_id,
        quantity
      )
    `,
    )
    .eq("order_id", orderItem.order_id)
    .eq("variant_id", orderItem.variant_id)
    .is("assigned_stock_owner_id", null)
    .neq("id", orderItem.id)
    .order("created_at", { ascending: true });

  if (siblingOrderItemsError) {
    throw new Error(siblingOrderItemsError.message);
  }

  const donorOrderItem = (siblingOrderItems ?? []).find((siblingOrderItem) =>
    (siblingOrderItem.order_item_reservations ?? []).some(
      (reservation) =>
        reservation.stock_owner_id === stockOwnerId &&
        Number(reservation.quantity || 0) >= Number(orderItem.quantity || 0),
    ),
  );

  if (!donorOrderItem) {
    return orderItem;
  }

  await swapOrderItemReservations({
    supabase,
    targetOrderItem: orderItem,
    donorOrderItemId: donorOrderItem.id,
  });

  return getOrderItemWithReservations(supabase, orderItem.id);
}

export async function splitOrderItemIntoUnits({
  orderItemId,
  supabaseClient = null,
}) {
  const supabase = supabaseClient ?? (await createClient());
  const orderItem = await getOrderItemForSplit(supabase, orderItemId);
  const unitCount = Number(orderItem.quantity) || 0;

  if (unitCount <= 1) {
    return {
      success: true,
      unchanged: true,
      orderItemIds: [orderItem.id],
    };
  }

  const insertedRowsPayload = Array.from({ length: unitCount }, () => ({
    order_id: orderItem.order_id,
    product_id: orderItem.product_id,
    variant_id: orderItem.variant_id,
    product_name: orderItem.product_name,
    color_name: orderItem.color_name,
    size_name: orderItem.size_name,
    unit_price: orderItem.unit_price,
    quantity: 1,
    assigned_stock_owner_id: orderItem.assigned_stock_owner_id,
  }));
  const { data: insertedOrderItems, error: insertOrderItemsError } = await supabase
    .from("order_items")
    .insert(insertedRowsPayload)
    .select("id");

  if (insertOrderItemsError) {
    throw new Error(insertOrderItemsError.message);
  }

  const insertedOrderItemIds = (insertedOrderItems ?? []).map((item) => item.id);

  try {
    const reservationUnitOwnerIds = (orderItem.order_item_reservations ?? [])
      .slice()
      .sort((firstReservation, secondReservation) => {
        const firstCreatedAt = new Date(
          firstReservation.created_at || 0,
        ).getTime();
        const secondCreatedAt = new Date(
          secondReservation.created_at || 0,
        ).getTime();

        if (firstCreatedAt !== secondCreatedAt) {
          return firstCreatedAt - secondCreatedAt;
        }

        return String(firstReservation.id).localeCompare(
          String(secondReservation.id),
        );
      })
      .flatMap((reservation) =>
        Array.from(
          { length: Number(reservation.quantity) || 0 },
          () => reservation.stock_owner_id,
        ),
      );
    const reservationRowsPayload = insertedOrderItemIds
      .map((insertedOrderItemId, index) => {
        const stockOwnerId = reservationUnitOwnerIds[index];

        if (!stockOwnerId) {
          return null;
        }

        return {
          order_item_id: insertedOrderItemId,
          stock_owner_id: stockOwnerId,
          quantity: 1,
        };
      })
      .filter(Boolean);

    if (reservationRowsPayload.length) {
      const { error: insertReservationsError } = await supabase
        .from("order_item_reservations")
        .insert(reservationRowsPayload);

      if (insertReservationsError) {
        throw new Error(insertReservationsError.message);
      }
    }

    const { error: deleteOriginalOrderItemError } = await supabase
      .from("order_items")
      .delete()
      .eq("id", orderItem.id);

    if (deleteOriginalOrderItemError) {
      throw new Error(deleteOriginalOrderItemError.message);
    }
  } catch (error) {
    await supabase.from("order_items").delete().in("id", insertedOrderItemIds);
    throw error;
  }

  return {
    success: true,
    orderItemIds: insertedOrderItemIds,
  };
}

export async function releaseReservationsForOrderItem({
  orderItemId,
  adminId = null,
  supabaseClient = null,
  note = "Stock reservation released",
}) {
  const supabase = supabaseClient ?? (await createClient());
  const orderItem = await getOrderItemWithReservations(supabase, orderItemId);
  const reservations = Array.isArray(orderItem.order_item_reservations)
    ? orderItem.order_item_reservations
    : [];

  if (!reservations.length) {
    return {
      success: true,
      skipped: true,
      orderItemId: orderItem.id,
    };
  }

  for (const reservation of reservations) {
    const inventory = await getInventoryRow(
      supabase,
      orderItem.variant_id,
      reservation.stock_owner_id,
    );

    if (inventory.reserved_quantity < reservation.quantity) {
      throw new Error("Reserved stock is inconsistent for this order item.");
    }

    const { error: updateInventoryError } = await supabase
      .from("variant_inventory")
      .update({
        reserved_quantity: inventory.reserved_quantity - reservation.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventory.id);

    if (updateInventoryError) {
      throw new Error(updateInventoryError.message);
    }

    const { error: movementError } = await supabase.from("stock_movements").insert({
      variant_id: orderItem.variant_id,
      stock_owner_id: reservation.stock_owner_id,
      order_item_id: orderItem.id,
      movement_type: "release",
      quantity: reservation.quantity,
      note,
      created_by_admin_id: adminId,
    });

    if (movementError) {
      throw new Error(movementError.message);
    }
  }

  const { error: deleteReservationsError } = await supabase
    .from("order_item_reservations")
    .delete()
    .eq("order_item_id", orderItem.id);

  if (deleteReservationsError) {
    throw new Error(deleteReservationsError.message);
  }

  return {
    success: true,
    orderItemId: orderItem.id,
  };
}

export async function assignAndDeductStockForOrderItem({
  orderItemId,
  stockOwnerId,
  adminId = null,
  supabaseClient = null,
}) {
  const supabase = supabaseClient ?? (await createClient());
  let orderItem = await getOrderItemWithReservations(supabase, orderItemId);

  if (orderItem.assigned_stock_owner_id) {
    throw new Error("This order item is already assigned.");
  }

  orderItem = await ensureOrderItemReservationOwner({
    supabase,
    orderItem,
    stockOwnerId,
  });

  const reservations = Array.isArray(orderItem.order_item_reservations)
    ? orderItem.order_item_reservations
    : [];
  const reservedForSelectedOwner = reservations.reduce((sum, reservation) => {
    if (reservation.stock_owner_id !== stockOwnerId) {
      return sum;
    }

    return sum + Number(reservation.quantity || 0);
  }, 0);
  const inventoryBeforeRelease = await getInventoryRow(
    supabase,
    orderItem.variant_id,
    stockOwnerId,
  );
  const availableQuantityAfterReservationRelease =
    Number(inventoryBeforeRelease.quantity || 0) -
    Number(inventoryBeforeRelease.reserved_quantity || 0) +
    reservedForSelectedOwner;

  if (availableQuantityAfterReservationRelease < orderItem.quantity) {
    throw new Error("Not enough stock for this owner.");
  }

  if (reservations.length) {
    await releaseReservationsForOrderItem({
      orderItemId: orderItem.id,
      adminId,
      supabaseClient: supabase,
      note: "Stock reservation released during owner assignment",
    });
  }

  const inventory = await getInventoryRow(
    supabase,
    orderItem.variant_id,
    stockOwnerId,
  );

  const { error: updateInventoryError } = await supabase
    .from("variant_inventory")
    .update({
      quantity: inventory.quantity - orderItem.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventory.id);

  if (updateInventoryError) {
    throw new Error(updateInventoryError.message);
  }

  const { error: updateOrderItemError } = await supabase
    .from("order_items")
    .update({
      assigned_stock_owner_id: stockOwnerId,
    })
    .eq("id", orderItem.id);

  if (updateOrderItemError) {
    throw new Error(updateOrderItemError.message);
  }

  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      variant_id: orderItem.variant_id,
      stock_owner_id: stockOwnerId,
      order_item_id: orderItem.id,
      movement_type: "sale",
      quantity: orderItem.quantity,
      note: "Stock deducted immediately on admin assignment",
      created_by_admin_id: adminId,
    });

  if (movementError) {
    throw new Error(movementError.message);
  }

  return {
    success: true,
    orderItemId: orderItem.id,
  };
}

export async function moveAssignedOrderItemToReservation({
  orderItemId,
  adminId = null,
  supabaseClient = null,
}) {
  const supabase = supabaseClient ?? (await createClient());
  const orderItem = await getOrderItemWithReservations(supabase, orderItemId);

  if (!orderItem.assigned_stock_owner_id) {
    return {
      success: true,
      unchanged: true,
      orderItemId: orderItem.id,
    };
  }

  if ((orderItem.order_item_reservations ?? []).length) {
    throw new Error("Assigned order item still has active reservations.");
  }

  const inventory = await getInventoryRow(
    supabase,
    orderItem.variant_id,
    orderItem.assigned_stock_owner_id,
  );
  const nextQuantity = Number(inventory.quantity || 0) + Number(orderItem.quantity || 0);
  const nextReservedQuantity =
    Number(inventory.reserved_quantity || 0) + Number(orderItem.quantity || 0);

  const { error: updateInventoryError } = await supabase
    .from("variant_inventory")
    .update({
      quantity: nextQuantity,
      reserved_quantity: nextReservedQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventory.id);

  if (updateInventoryError) {
    throw new Error(updateInventoryError.message);
  }

  const movementRows = [
    {
      variant_id: orderItem.variant_id,
      stock_owner_id: orderItem.assigned_stock_owner_id,
      order_item_id: orderItem.id,
      movement_type: "return",
      quantity: orderItem.quantity,
      note: "Stock restored after removing owner assignment",
      created_by_admin_id: adminId,
    },
    {
      variant_id: orderItem.variant_id,
      stock_owner_id: orderItem.assigned_stock_owner_id,
      order_item_id: orderItem.id,
      movement_type: "reserve",
      quantity: orderItem.quantity,
      note: "Stock reserved again after removing owner assignment",
      created_by_admin_id: adminId,
    },
  ];
  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert(movementRows);

  if (movementError) {
    throw new Error(movementError.message);
  }

  const { error: upsertReservationError } = await supabase
    .from("order_item_reservations")
    .upsert(
      {
        order_item_id: orderItem.id,
        stock_owner_id: orderItem.assigned_stock_owner_id,
        quantity: orderItem.quantity,
      },
      {
        onConflict: "order_item_id,stock_owner_id",
      },
    );

  if (upsertReservationError) {
    throw new Error(upsertReservationError.message);
  }

  const { error: clearAssignmentError } = await supabase
    .from("order_items")
    .update({
      assigned_stock_owner_id: null,
    })
    .eq("id", orderItem.id);

  if (clearAssignmentError) {
    throw new Error(clearAssignmentError.message);
  }

  return {
    success: true,
    orderItemId: orderItem.id,
    stockOwnerId: orderItem.assigned_stock_owner_id,
  };
}

export async function syncOrderAssignmentState({
  orderId,
  supabaseClient = null,
}) {
  const supabase = supabaseClient ?? (await createClient());
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("assigned_stock_owner_id")
    .eq("order_id", orderId);

  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  const assignedOwnerIds = Array.from(
    new Set(
      (orderItems ?? [])
        .map((orderItem) => orderItem.assigned_stock_owner_id)
        .filter(Boolean),
    ),
  );
  const isFullyAssigned =
    (orderItems ?? []).length > 0 &&
    (orderItems ?? []).every((orderItem) => Boolean(orderItem.assigned_stock_owner_id));
  const nextAssignedStockOwnerId =
    isFullyAssigned && assignedOwnerIds.length === 1 ? assignedOwnerIds[0] : null;
  const nextStatus = isFullyAssigned
    ? order.status === "pending" || order.status === "confirmed" || order.status === "assigned"
      ? "assigned"
      : order.status
    : order.status === "assigned"
      ? "pending"
      : order.status;

  const { error: updateOrderError } = await supabase
    .from("orders")
    .update({
      assigned_stock_owner_id: nextAssignedStockOwnerId,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateOrderError) {
    throw new Error(updateOrderError.message);
  }

  return {
    success: true,
    orderId,
    isFullyAssigned,
    assignedStockOwnerId: nextAssignedStockOwnerId,
    status: nextStatus,
  };
}

export async function restoreStockForCancelledOrderItem({
  orderItemId,
  adminId = null,
}) {
  const supabase = await createClient();
  const orderItem = await getOrderItemWithReservations(supabase, orderItemId);

  if (!orderItem.assigned_stock_owner_id) {
    return releaseReservationsForOrderItem({
      orderItemId: orderItem.id,
      adminId,
      supabaseClient: supabase,
      note: "Stock reservation released after order cancellation",
    });
  }

  await releaseReservationsForOrderItem({
    orderItemId: orderItem.id,
    adminId,
    supabaseClient: supabase,
    note: "Stock reservation released after order cancellation",
  });
  const inventory = await getInventoryRow(
    supabase,
    orderItem.variant_id,
    orderItem.assigned_stock_owner_id,
  );

  const { error: updateInventoryError } = await supabase
    .from("variant_inventory")
    .update({
      quantity: inventory.quantity + orderItem.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventory.id);

  if (updateInventoryError) {
    throw new Error(updateInventoryError.message);
  }

  const { error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      variant_id: orderItem.variant_id,
      stock_owner_id: orderItem.assigned_stock_owner_id,
      order_item_id: orderItem.id,
      movement_type: "return",
      quantity: orderItem.quantity,
      note: "Stock restored after order cancellation",
      created_by_admin_id: adminId,
    });

  if (movementError) {
    throw new Error(movementError.message);
  }

  const { error: clearAssignmentError } = await supabase
    .from("order_items")
    .update({
      assigned_stock_owner_id: null,
    })
    .eq("id", orderItem.id);

  if (clearAssignmentError) {
    throw new Error(clearAssignmentError.message);
  }

  return {
    success: true,
    orderItemId: orderItem.id,
  };
}
