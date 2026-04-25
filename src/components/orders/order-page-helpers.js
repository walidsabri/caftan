import { format, subDays } from "date-fns";

export const DATE_SHORTCUTS = [
  {
    label: "Last 24h",
    getRange: () => ({
      from: subDays(new Date(), 1),
      to: new Date(),
    }),
  },
  {
    label: "7 Days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "30 Days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "90 Days",
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: "1 Year",
    getRange: () => ({
      from: subDays(new Date(), 364),
      to: new Date(),
    }),
  },
];

export function formatDateRangeLabel(range) {
  if (!range?.from) {
    return null;
  }

  if (!range.to) {
    return format(range.from, "LLL dd, y");
  }

  return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
}

function formatOrderItemLabel(item) {
  const parts = [item.product_name];

  if (item.color_name) {
    parts.push(item.color_name);
  }

  if (item.size_name) {
    parts.push(item.size_name);
  }

  const label = parts.filter(Boolean).join(" / ");

  if (Number(item.quantity) > 1) {
    return `${label} x${item.quantity}`;
  }

  return label;
}

function getReservationQuantitiesByOwnerId(orderItem) {
  return new Map(
    (orderItem.order_item_reservations ?? []).map((reservation) => [
      reservation.stock_owner_id,
      Number(reservation.quantity) || 0,
    ]),
  );
}

export function createOrderVariantReservationKey(orderId, variantId) {
  return `${orderId}:${variantId}`;
}

export function createInventoryRowsByVariantId(inventoryRows) {
  return (inventoryRows ?? []).reduce((variantsMap, inventoryRow) => {
    const variantId = inventoryRow.variant_id;
    const stockOwnerId = inventoryRow.stock_owner_id;

    if (!variantId || !stockOwnerId) {
      return variantsMap;
    }

    if (!variantsMap.has(variantId)) {
      variantsMap.set(variantId, new Map());
    }

    variantsMap.get(variantId).set(stockOwnerId, inventoryRow);
    return variantsMap;
  }, new Map());
}

export function buildOrderVariantReservationMap(orders) {
  return (orders ?? []).reduce((variantsMap, order) => {
    for (const orderItem of order.order_items ?? []) {
      if (orderItem.assigned_stock_owner_id || !orderItem.variant_id) {
        continue;
      }

      const reservationKey = createOrderVariantReservationKey(
        order.id,
        orderItem.variant_id,
      );

      if (!variantsMap.has(reservationKey)) {
        variantsMap.set(reservationKey, new Map());
      }

      const ownerReservationsMap = variantsMap.get(reservationKey);

      for (const [stockOwnerId, quantity] of getReservationQuantitiesByOwnerId(
        orderItem,
      )) {
        ownerReservationsMap.set(
          stockOwnerId,
          (ownerReservationsMap.get(stockOwnerId) ?? 0) + quantity,
        );
      }
    }

    return variantsMap;
  }, new Map());
}

function getOrderItemOwnerOptions(
  orderId,
  orderItem,
  stockOwners,
  inventoryRowsByVariantId,
  orderVariantReservationMap,
) {
  const assignedOwnerId = orderItem.assigned_stock_owner_id ?? null;
  const inventoryRowsByOwnerId =
    inventoryRowsByVariantId.get(orderItem.variant_id) ?? new Map();
  const variantReservationsByOwnerId =
    orderVariantReservationMap.get(
      createOrderVariantReservationKey(orderId, orderItem.variant_id),
    ) ?? new Map();

  return stockOwners.map((owner) => {
    const inventoryRow = inventoryRowsByOwnerId.get(owner.id);
    const reservedForCurrentVariant =
      variantReservationsByOwnerId.get(owner.id) ?? 0;
    const availableQuantity = inventoryRow
      ? Number(inventoryRow.quantity || 0) -
        Number(inventoryRow.reserved_quantity || 0) +
        reservedForCurrentVariant
      : 0;
    const canAssign =
      owner.id === assignedOwnerId ||
      availableQuantity >= Number(orderItem.quantity || 0);

    return {
      value: owner.name,
      label: owner.name,
      canAssign,
      statusLabel: canAssign ? "" : "Out of stock",
    };
  });
}

function mapOrderItem(
  orderId,
  orderItem,
  stockOwners,
  stockOwnersById,
  inventoryRowsByVariantId,
  orderVariantReservationMap,
  assignmentHistoryOrderItemIds,
) {
  const ownerOptions = getOrderItemOwnerOptions(
    orderId,
    orderItem,
    stockOwners,
    inventoryRowsByVariantId,
    orderVariantReservationMap,
  );
  const owner = stockOwnersById.get(orderItem.assigned_stock_owner_id) ?? "";

  return {
    id: orderItem.id,
    variantId: orderItem.variant_id,
    label: formatOrderItemLabel(orderItem),
    quantity: Number(orderItem.quantity) || 0,
    owner,
    suggestedOwner: "",
    hasAssignmentHistory: assignmentHistoryOrderItemIds.has(orderItem.id),
    ownerOptions,
  };
}

function buildDeliveryAddress(order) {
  return [order.address, order.commune, order.wilaya].filter(Boolean).join(", ");
}

function buildOwnerSummary(orderItems) {
  const assignedOwners = Array.from(
    new Set(orderItems.map((orderItem) => orderItem.owner).filter(Boolean)),
  );

  if (!assignedOwners.length) {
    return "";
  }

  if (assignedOwners.length === 1) {
    return assignedOwners[0];
  }

  return `${assignedOwners[0]} +${assignedOwners.length - 1}`;
}

export function mapOrderRow(
  order,
  stockOwners,
  stockOwnersById,
  inventoryRowsByVariantId,
  orderVariantReservationMap,
  assignmentHistoryOrderItemIds,
) {
  const orderItems = (order.order_items ?? []).map((orderItem) =>
    mapOrderItem(
      order.id,
      orderItem,
      stockOwners,
      stockOwnersById,
      inventoryRowsByVariantId,
      orderVariantReservationMap,
      assignmentHistoryOrderItemIds,
    ),
  );
  const resolvedOrderItems =
    orderItems.length === 1 && !orderItems[0].owner
      ? (() => {
          const eligibleOwners = orderItems[0].ownerOptions.filter(
            (option) => option.canAssign,
          );

          if (eligibleOwners.length !== 1) {
            return orderItems;
          }

          return [
            {
              ...orderItems[0],
              suggestedOwner: eligibleOwners[0].value,
            },
          ];
        })()
      : orderItems;
  const ownerNames = Array.from(
    new Set(
      resolvedOrderItems.map((orderItem) => orderItem.owner).filter(Boolean),
    ),
  );

  return {
    id: order.id,
    orderNumber: order.order_number,
    date: order.created_at,
    client: order.customer_name,
    clientPhone: order.customer_phone,
    orderItems: resolvedOrderItems,
    products: resolvedOrderItems.map((orderItem) => orderItem.label),
    deliveryAddress: buildDeliveryAddress(order),
    deliveryMethod: order.shipping_method === "desk" ? "desk" : "home",
    deliveryMethodLabel:
      order.shipping_method === "desk" ? "Store Pickup" : "Home Delivery",
    status: order.status || "pending",
    totalPrice: Number(order.total_amount) || 0,
    owner: buildOwnerSummary(resolvedOrderItems),
    ownerNames,
    shippingCompany: order.shipping_company ?? "",
    shippingStatus: order.shipping_status ?? "",
    trackingNumber: order.tracking_number ?? "",
    shippingExternalId: order.shipping_external_id ?? "",
    isFullyAssigned:
      resolvedOrderItems.length > 0 &&
      resolvedOrderItems.every((orderItem) => Boolean(orderItem.owner)),
  };
}
