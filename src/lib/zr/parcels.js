import { randomUUID } from "crypto";
import { createZrParcel } from "@/lib/zr/services";
import { getZrAccountKeyForOwner } from "@/lib/zr/accounts";

function normalizeAlgerianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("213")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+213${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+213${digits}`;
  }

  return phone;
}

function getDeliveryType(shippingMethod) {
  return shippingMethod === "desk" ? "pickup-point" : "home";
}

function buildDescription(orderItems) {
  const names = orderItems.map((item) => item.product_name).filter(Boolean);
  const description = names.join(", ");

  if (!description) {
    return "Commande boutique";
  }

  return description.slice(0, 250);
}

export function buildZrParcelPayload({ order, orderItems }) {
  const cityTerritoryId = order.zr_city_territory_id;
  const districtTerritoryId = order.zr_district_territory_id;

  if (!cityTerritoryId || !districtTerritoryId) {
    throw new Error(
      "Missing ZR territory IDs. Order must include zr_city_territory_id and zr_district_territory_id.",
    );
  }

  return {
    customer: {
      customerId: randomUUID(),
      name: order.customer_name,
      phone: {
        number1: normalizeAlgerianPhone(order.customer_phone),
      },
    },
    deliveryAddress: {
      street: order.address,
      cityTerritoryId,
      districtTerritoryId,
    },
    orderedProducts: orderItems.map((item) => ({
      productName: `${item.product_name} - ${item.color_name} - ${item.size_name}`,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      stockType: "none",
    })),
    amount: order.total_amount,
    description: buildDescription(orderItems),
    deliveryType: getDeliveryType(order.shipping_method),
    externalId: order.order_number,
  };
}

export async function dispatchOrderToZr({ order, orderItems, ownerName }) {
  const accountKey = getZrAccountKeyForOwner(ownerName);
  const payload = buildZrParcelPayload({ order, orderItems });

  const response = await createZrParcel({
    accountKey,
    payload,
  });

  return {
    accountKey,
    payload,
    response,
  };
}
