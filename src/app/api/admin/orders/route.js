import { NextResponse } from "next/server";

import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import {
  assignAndDeductStockForOrderItem,
  syncOrderAssignmentState,
} from "@/lib/orders/stock";
import { createClient } from "@/lib/supabase/server";
import { getShippingFeeForMethod, resolveShippingRates } from "@/lib/zr/rates";

const textCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value) {
  return normalizeText(value).replace(/\D/g, "");
}

function normalizePositiveInteger(value) {
  const normalizedValue = Number.parseInt(String(value ?? "0"), 10);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    return null;
  }

  return normalizedValue;
}

function getAvailableInventoryQuantity(inventoryRow) {
  return Math.max(
    0,
    Number(inventoryRow?.quantity || 0) -
      Number(inventoryRow?.reserved_quantity || 0),
  );
}

function compareVariants(firstVariant, secondVariant) {
  const colorComparison = textCollator.compare(
    firstVariant.colorName,
    secondVariant.colorName,
  );

  if (colorComparison !== 0) {
    return colorComparison;
  }

  const firstSortOrder = Number(
    firstVariant.sizeSortOrder ?? Number.MAX_SAFE_INTEGER,
  );
  const secondSortOrder = Number(
    secondVariant.sizeSortOrder ?? Number.MAX_SAFE_INTEGER,
  );

  if (firstSortOrder !== secondSortOrder) {
    return firstSortOrder - secondSortOrder;
  }

  return textCollator.compare(firstVariant.sizeName, secondVariant.sizeName);
}

function buildOwnerAvailability(variantInventoryRows, stockOwners) {
  const availableQuantityByOwnerName = new Map();

  for (const inventoryRow of variantInventoryRows ?? []) {
    const ownerName = inventoryRow.stock_owners?.name;

    if (!ownerName) {
      continue;
    }

    availableQuantityByOwnerName.set(
      ownerName,
      (availableQuantityByOwnerName.get(ownerName) ?? 0) +
        getAvailableInventoryQuantity(inventoryRow),
    );
  }

  return stockOwners.map((owner) => ({
    ownerName: owner.name,
    availableQuantity: availableQuantityByOwnerName.get(owner.name) ?? 0,
  }));
}

async function fetchOrderProducts(supabase) {
  const [productsResponse, stockOwnersResponse] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        price,
        old_price,
        cover_image_url,
        created_at,
        is_active,
        categories (
          name,
          is_active
        ),
        product_variants (
          id,
          colors (
            name
          ),
          sizes (
            name,
            sort_order
          ),
          variant_inventory (
            stock_owner_id,
            quantity,
            reserved_quantity,
            stock_owners (
              name
            )
          )
        )
      `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("stock_owners")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (productsResponse.error || stockOwnersResponse.error) {
    throw new Error(
      productsResponse.error?.message ||
        stockOwnersResponse.error?.message ||
        "Failed to load order products.",
    );
  }

  const stockOwners = stockOwnersResponse.data ?? [];

  return (productsResponse.data ?? [])
    .filter((product) => product.categories?.is_active !== false)
    .map((product) => {
      const variants = (product.product_variants ?? [])
        .map((variant) => {
          const ownerAvailability = buildOwnerAvailability(
            variant.variant_inventory,
            stockOwners,
          );
          const availableQuantity = ownerAvailability.reduce(
            (sum, owner) => sum + owner.availableQuantity,
            0,
          );

          return {
            id: variant.id,
            colorName: variant.colors?.name ?? "",
            sizeName: variant.sizes?.name ?? "",
            sizeSortOrder: Number(variant.sizes?.sort_order) || 0,
            availableQuantity,
            ownerAvailability,
          };
        })
        .filter((variant) => variant.availableQuantity > 0)
        .sort(compareVariants);

      const availableQuantity = variants.reduce(
        (sum, variant) => sum + variant.availableQuantity,
        0,
      );

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.categories?.name ?? "Sans categorie",
        price: Number(product.price) || 0,
        oldPrice: product.old_price == null ? null : Number(product.old_price),
        image: product.cover_image_url,
        availableQuantity,
        variants,
      };
    })
    .filter((product) => product.variants.length > 0);
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const itemsByVariantId = new Map();

  for (const item of items) {
    const variantId = normalizeText(
      item?.variantId ??
        item?.variant_id ??
        item?.selectedVariantId ??
        item?.id,
    );
    const quantity = normalizePositiveInteger(item?.quantity);
    const ownerName = normalizeText(item?.ownerName);

    if (!variantId || !UUID_PATTERN.test(variantId) || !quantity) {
      continue;
    }

    if (itemsByVariantId.has(variantId)) {
      const existingItem = itemsByVariantId.get(variantId);
      existingItem.quantity += quantity;
      if (ownerName) {
        existingItem.ownerName = ownerName;
      }
      continue;
    }

    itemsByVariantId.set(variantId, {
      variantId,
      quantity,
      ownerName,
    });
  }

  return Array.from(itemsByVariantId.values());
}

function validateOrderPayload(payload) {
  const fullName = normalizeText(payload?.fullName);
  const phone = normalizePhone(payload?.phone);
  const wilaya = normalizeText(payload?.wilaya);
  const commune = normalizeText(payload?.commune);
  const address = normalizeText(payload?.address);
  const shippingMethod = normalizeText(payload?.shippingMethod).toLowerCase();
  const wilayaCode = normalizeText(payload?.wilayaCode);
  const items = normalizeOrderItems(payload?.items);

  if (!fullName) {
    return { error: "Veuillez entrer le nom complet du client." };
  }

  if (!phone) {
    return { error: "Veuillez entrer le numero de telephone du client." };
  }

  if (phone.length !== 10) {
    return { error: "Le numero doit contenir exactement 10 chiffres." };
  }

  if (!/^(05|06|07)/.test(phone)) {
    return { error: "Le numero doit commencer par 05, 06 ou 07." };
  }

  if (!wilaya) {
    return { error: "Veuillez selectionner une wilaya." };
  }

  if (!commune) {
    return { error: "Veuillez selectionner une commune." };
  }

  if (!address) {
    return { error: "Veuillez entrer une adresse." };
  }

  if (!["home", "desk"].includes(shippingMethod)) {
    return { error: "Veuillez choisir un mode de livraison valide." };
  }

  if (!items.length) {
    return { error: "Ajoutez au moins un produit a la commande." };
  }

  return {
    data: {
      fullName,
      phone,
      wilaya,
      wilayaCode,
      commune,
      address,
      shippingMethod,
      items,
    },
  };
}

async function fetchVariantStateById(supabase, variantIds) {
  const [variantsResponse, stockOwnersResponse] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        `
        id,
        products!inner (
          id,
          is_active,
          categories!inner (
            is_active
          )
        ),
        variant_inventory (
          quantity,
          reserved_quantity,
          stock_owners (
            name
          )
        )
      `,
      )
      .in("id", variantIds),
    supabase
      .from("stock_owners")
      .select("name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (variantsResponse.error || stockOwnersResponse.error) {
    throw new Error(
      variantsResponse.error?.message ||
        stockOwnersResponse.error?.message ||
        "Failed to validate order items.",
    );
  }

  const stockOwners = stockOwnersResponse.data ?? [];

  return new Map(
    (variantsResponse.data ?? [])
      .filter(
        (variant) =>
          variant.products?.is_active &&
          variant.products?.categories?.is_active,
      )
      .map((variant) => [
        variant.id,
        {
          id: variant.id,
          ownerAvailability: buildOwnerAvailability(
            variant.variant_inventory,
            stockOwners,
          ),
        },
      ]),
  );
}

async function assignOrderItems({ supabase, adminId, orderId, items }) {
  const selectedAssignments = items.filter((item) => item.ownerName);

  if (!selectedAssignments.length) {
    return [];
  }

  const uniqueOwnerNames = Array.from(
    new Set(selectedAssignments.map((item) => item.ownerName)),
  );

  const [createdOrderItemsResponse, stockOwnersResponse] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, variant_id")
      .eq("order_id", orderId),
    supabase
      .from("stock_owners")
      .select("id, name")
      .in("name", uniqueOwnerNames)
      .eq("is_active", true),
  ]);

  if (createdOrderItemsResponse.error || stockOwnersResponse.error) {
    throw new Error(
      createdOrderItemsResponse.error?.message ||
        stockOwnersResponse.error?.message ||
        "Failed to assign stock owners.",
    );
  }

  const createdOrderItemByVariantId = new Map(
    (createdOrderItemsResponse.data ?? []).map((orderItem) => [
      orderItem.variant_id,
      orderItem,
    ]),
  );

  const stockOwnerIdByName = new Map(
    (stockOwnersResponse.data ?? []).map((stockOwner) => [
      stockOwner.name,
      stockOwner.id,
    ]),
  );

  const warnings = [];

  for (const item of selectedAssignments) {
    const createdOrderItem = createdOrderItemByVariantId.get(item.variantId);
    const stockOwnerId = stockOwnerIdByName.get(item.ownerName);

    if (!createdOrderItem || !stockOwnerId) {
      warnings.push(
        `${item.ownerName}: impossible d'appliquer l'assignation automatique.`,
      );
      continue;
    }

    try {
      await assignAndDeductStockForOrderItem({
        orderItemId: createdOrderItem.id,
        stockOwnerId,
        adminId,
        supabaseClient: supabase,
      });
    } catch (error) {
      warnings.push(
        `${item.ownerName}: ${
          error instanceof Error ? error.message : "Assignation impossible."
        }`,
      );
    }
  }

  await syncOrderAssignmentState({
    orderId,
    supabaseClient: supabase,
  });

  return warnings;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const products = await fetchOrderProducts(supabase);

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load order products.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { unauthorizedResponse, adminProfile } =
      await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = await request.json();
    const validation = validateOrderPayload(body);

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      fullName,
      phone,
      wilaya,
      wilayaCode,
      commune,
      address,
      shippingMethod,
      items,
    } = validation.data;

    const variantStateById = await fetchVariantStateById(
      supabase,
      items.map((item) => item.variantId),
    );

    for (const item of items) {
      const variantState = variantStateById.get(item.variantId);

      if (!variantState) {
        return NextResponse.json(
          { error: "Un produit selectionne n'est plus disponible." },
          { status: 400 },
        );
      }

      const availableQuantity = variantState.ownerAvailability.reduce(
        (sum, owner) => sum + owner.availableQuantity,
        0,
      );

      if (item.quantity > availableQuantity) {
        return NextResponse.json(
          {
            error:
              "Une ou plusieurs quantites depassent le stock disponible actuel.",
          },
          { status: 400 },
        );
      }

      if (item.ownerName) {
        const ownerAvailability =
          variantState.ownerAvailability.find(
            (owner) => owner.ownerName === item.ownerName,
          )?.availableQuantity ?? 0;

        if (ownerAvailability < item.quantity) {
          return NextResponse.json(
            {
              error: `${item.ownerName} n'a pas assez de stock pour l'un des produits selectionnes.`,
            },
            { status: 400 },
          );
        }
      }
    }

    const shippingResolution = await resolveShippingRates({
      wilaya,
      wilayaCode,
      commune,
    });

    const shippingFee = getShippingFeeForMethod(
      shippingResolution.rates,
      shippingMethod,
    );

    if (!Number.isFinite(shippingFee)) {
      return NextResponse.json(
        {
          error:
            "Aucun tarif ZR Express n'est disponible pour cette combinaison de livraison.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("create_storefront_order", {
      customer_name_input: fullName,
      customer_phone_input: phone,
      wilaya_input: wilaya,
      commune_input: commune,
      address_input: address,
      notes_input: null,
      shipping_method_input: shippingMethod,
      shipping_fee_input: shippingFee,
      order_items_input: items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Impossible d'enregistrer la commande pour le moment.",
        },
        { status: 400 },
      );
    }

    const order = Array.isArray(data) ? data[0] : data;

    if (!order?.order_id || !order?.order_number) {
      return NextResponse.json(
        { error: "La commande a ete creee sans retour exploitable." },
        { status: 500 },
      );
    }

    const { error: updateTerritoryError } = await supabase
      .from("orders")
      .update({
        zr_city_territory_id:
          shippingResolution.zrAddress?.cityTerritoryId ?? null,
        zr_district_territory_id:
          shippingResolution.zrAddress?.districtTerritoryId ?? null,
      })
      .eq("id", order.order_id);

    if (updateTerritoryError) {
      return NextResponse.json(
        {
          error:
            updateTerritoryError.message ||
            "La commande a ete creee, mais les informations ZR n'ont pas ete enregistrees.",
        },
        { status: 400 },
      );
    }

    const assignmentWarnings = await assignOrderItems({
      supabase,
      adminId: adminProfile?.id ?? null,
      orderId: order.order_id,
      items,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.order_id,
        orderNumber: order.order_number,
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
      },
      assignmentWarnings,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No shipping price found for this location."
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun tarif ZR Express n'est disponible pour cette combinaison de livraison.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la commande pour le moment.",
      },
      { status: 500 },
    );
  }
}
