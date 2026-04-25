import { NextResponse } from "next/server";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function sanitizeCount(value) {
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

function getAvailableInventoryQuantity(inventoryRow) {
  return Math.max(
    0,
    sanitizeCount(inventoryRow?.quantity) -
      sanitizeCount(inventoryRow?.reserved_quantity),
  );
}

function sortOwners(ownerNames) {
  return [...ownerNames].sort((firstOwner, secondOwner) => {
    const firstIndex = SHOP_OWNERS.indexOf(firstOwner);
    const secondIndex = SHOP_OWNERS.indexOf(secondOwner);

    if (firstIndex !== -1 || secondIndex !== -1) {
      if (firstIndex === -1) return 1;
      if (secondIndex === -1) return -1;
      return firstIndex - secondIndex;
    }

    return firstOwner.localeCompare(secondOwner);
  });
}

function sortVariants(firstVariant, secondVariant) {
  const firstColor = firstVariant.colors?.name ?? "";
  const secondColor = secondVariant.colors?.name ?? "";

  if (firstColor !== secondColor) {
    return firstColor.localeCompare(secondColor);
  }

  const firstSortOrder = sanitizeCount(firstVariant.sizes?.sort_order);
  const secondSortOrder = sanitizeCount(secondVariant.sizes?.sort_order);

  if (firstSortOrder !== secondSortOrder) {
    return firstSortOrder - secondSortOrder;
  }

  return (firstVariant.sizes?.name ?? "").localeCompare(
    secondVariant.sizes?.name ?? "",
  );
}

async function fetchTransferProductGraph(supabase, productId) {
  return supabase
    .from("products")
    .select(
      `
      id,
      name,
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
          id,
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
    .eq("id", productId)
    .maybeSingle();
}

async function fetchVariantForTransfer(supabase, productId, variantId) {
  return supabase
    .from("product_variants")
    .select(
      `
      id,
      product_id,
      colors (
        name
      ),
      sizes (
        name
      )
    `,
    )
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();
}

async function fetchInventoryRow(supabase, variantId, stockOwnerId) {
  const { data, error } = await supabase
    .from("variant_inventory")
    .select("id, quantity, reserved_quantity")
    .eq("variant_id", variantId)
    .eq("stock_owner_id", stockOwnerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function restoreTransferredQuantity({
  supabase,
  inventoryId,
  expectedQuantity,
  expectedReservedQuantity,
  restoredQuantity,
}) {
  const { data, error } = await supabase
    .from("variant_inventory")
    .update({
      quantity: restoredQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventoryId)
    .eq("quantity", expectedQuantity)
    .eq("reserved_quantity", expectedReservedQuantity)
    .select("id")
    .maybeSingle();

  return !error && Boolean(data);
}

async function cleanupEmptyInventoryRow({
  supabase,
  inventoryId,
}) {
  const { error } = await supabase
    .from("variant_inventory")
    .delete()
    .eq("id", inventoryId)
    .eq("quantity", 0)
    .eq("reserved_quantity", 0);

  return !error;
}

async function creditReceiverInventory({
  supabase,
  variantId,
  stockOwnerId,
  transferQuantity,
}) {
  const receiverInventory = await fetchInventoryRow(supabase, variantId, stockOwnerId);

  if (receiverInventory) {
    const { data, error } = await supabase
      .from("variant_inventory")
      .update({
        quantity: sanitizeCount(receiverInventory.quantity) + transferQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiverInventory.id)
      .eq("quantity", receiverInventory.quantity)
      .eq("reserved_quantity", receiverInventory.reserved_quantity)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Le stock du destinataire a change. Rechargez et reessayez.");
    }

    return;
  }

  const { error: insertError } = await supabase.from("variant_inventory").insert({
    variant_id: variantId,
    stock_owner_id: stockOwnerId,
    quantity: transferQuantity,
    reserved_quantity: 0,
  });

  if (!insertError) {
    return;
  }

  const retryReceiverInventory = await fetchInventoryRow(
    supabase,
    variantId,
    stockOwnerId,
  );

  if (!retryReceiverInventory) {
    throw new Error(insertError.message);
  }

  const { data, error } = await supabase
    .from("variant_inventory")
    .update({
      quantity: sanitizeCount(retryReceiverInventory.quantity) + transferQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", retryReceiverInventory.id)
    .eq("quantity", retryReceiverInventory.quantity)
    .eq("reserved_quantity", retryReceiverInventory.reserved_quantity)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Le stock du destinataire a change. Rechargez et reessayez.");
  }
}

export async function GET(_request, { params }) {
  try {
    const { productId } = await params;

    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const [productResponse, stockOwnersResponse] = await Promise.all([
      fetchTransferProductGraph(supabase, productId),
      supabase
        .from("stock_owners")
        .select("name")
        .eq("is_active", true),
    ]);

    if (productResponse.error) {
      return NextResponse.json(
        { error: productResponse.error.message },
        { status: 400 },
      );
    }

    if (!productResponse.data) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    if (stockOwnersResponse.error) {
      return NextResponse.json(
        { error: stockOwnersResponse.error.message },
        { status: 400 },
      );
    }

    const ownerNames = sortOwners(
      Array.from(
        new Set(
          (stockOwnersResponse.data ?? [])
            .map((owner) => owner.name?.trim())
            .filter(Boolean),
        ),
      ),
    );

    const ownerTotals = Object.fromEntries(ownerNames.map((owner) => [owner, 0]));
    const stockRows = [...(productResponse.data.product_variants ?? [])]
      .sort(sortVariants)
      .map((variant) => {
        const ownerQuantities = Object.fromEntries(
          ownerNames.map((owner) => [owner, 0]),
        );

        for (const inventoryRow of variant.variant_inventory ?? []) {
          const ownerName = inventoryRow.stock_owners?.name?.trim();

          if (!ownerName || !(ownerName in ownerQuantities)) {
            continue;
          }

          const availableQuantity = getAvailableInventoryQuantity(inventoryRow);

          ownerQuantities[ownerName] = availableQuantity;
          ownerTotals[ownerName] += availableQuantity;
        }

        return {
          variantId: variant.id,
          colorName: variant.colors?.name ?? "",
          sizeName: variant.sizes?.name ?? "",
          ownerQuantities,
        };
      })
      .filter((stockRow) =>
        Object.values(stockRow.ownerQuantities).some((quantity) => quantity > 0),
      );

    return NextResponse.json({
      product: {
        id: productResponse.data.id,
        name: productResponse.data.name,
        ownerOptions: ownerNames.map((ownerName) => ({
          name: ownerName,
          totalAvailable: ownerTotals[ownerName] ?? 0,
        })),
        stockRows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load product transfer data.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const fromOwnerName =
      typeof body?.fromOwnerName === "string" ? body.fromOwnerName.trim() : "";
    const toOwnerName =
      typeof body?.toOwnerName === "string" ? body.toOwnerName.trim() : "";
    const variantId =
      typeof body?.variantId === "string" ? body.variantId.trim() : "";
    const transferQuantity = sanitizeCount(body?.quantity);

    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }

    if (!fromOwnerName || !toOwnerName) {
      return NextResponse.json(
        { error: "Choisissez le proprietaire qui donne et celui qui recoit." },
        { status: 400 },
      );
    }

    if (fromOwnerName === toOwnerName) {
      return NextResponse.json(
        { error: "Le proprietaire source et le destinataire doivent etre differents." },
        { status: 400 },
      );
    }

    if (!variantId) {
      return NextResponse.json(
        { error: "Choisissez une couleur et une taille a transferer." },
        { status: 400 },
      );
    }

    if (transferQuantity <= 0) {
      return NextResponse.json(
        { error: "Entrez une quantite de transfert valide." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const [ownersResponse, variantResponse] = await Promise.all([
      supabase
        .from("stock_owners")
        .select("id, name")
        .in("name", [fromOwnerName, toOwnerName])
        .eq("is_active", true),
      fetchVariantForTransfer(supabase, productId, variantId),
    ]);

    if (ownersResponse.error) {
      return NextResponse.json(
        { error: ownersResponse.error.message },
        { status: 400 },
      );
    }

    if (variantResponse.error) {
      return NextResponse.json(
        { error: variantResponse.error.message },
        { status: 400 },
      );
    }

    if (!variantResponse.data) {
      return NextResponse.json(
        { error: "La variante selectionnee est introuvable pour ce produit." },
        { status: 404 },
      );
    }

    const ownersByName = new Map(
      (ownersResponse.data ?? []).map((owner) => [owner.name, owner]),
    );
    const fromOwner = ownersByName.get(fromOwnerName);
    const toOwner = ownersByName.get(toOwnerName);

    if (!fromOwner || !toOwner) {
      return NextResponse.json(
        { error: "Un des proprietaires selectionnes est introuvable." },
        { status: 400 },
      );
    }

    const giverInventory = await fetchInventoryRow(
      supabase,
      variantId,
      fromOwner.id,
    );

    if (!giverInventory) {
      return NextResponse.json(
        { error: "Le proprietaire source n'a aucun stock pour cette variante." },
        { status: 400 },
      );
    }

    const giverAvailableQuantity = getAvailableInventoryQuantity(giverInventory);
    const giverReservedQuantity = sanitizeCount(giverInventory.reserved_quantity);

    if (giverAvailableQuantity < transferQuantity) {
      return NextResponse.json(
        {
          error:
            "La quantite demandee depasse le stock disponible du proprietaire source.",
        },
        { status: 400 },
      );
    }

    const giverNextQuantity =
      sanitizeCount(giverInventory.quantity) - transferQuantity;
    const { data: updatedGiverInventory, error: updateGiverError } = await supabase
      .from("variant_inventory")
      .update({
        quantity: giverNextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", giverInventory.id)
      .eq("quantity", giverInventory.quantity)
      .eq("reserved_quantity", giverInventory.reserved_quantity)
      .select("id")
      .maybeSingle();

    if (updateGiverError || !updatedGiverInventory) {
      return NextResponse.json(
        {
          error:
            "Le stock du proprietaire source a change. Rechargez puis reessayez.",
        },
        { status: 409 },
      );
    }

    try {
      await creditReceiverInventory({
        supabase,
        variantId,
        stockOwnerId: toOwner.id,
        transferQuantity,
      });
    } catch (error) {
      const rollbackSucceeded = await restoreTransferredQuantity({
        supabase,
        inventoryId: giverInventory.id,
        expectedQuantity: giverNextQuantity,
        expectedReservedQuantity: giverReservedQuantity,
        restoredQuantity: sanitizeCount(giverInventory.quantity),
      });

      if (!rollbackSucceeded) {
        return NextResponse.json(
          {
            error:
              "Le transfert a echoue apres une modification de stock. Verifiez manuellement cette variante avant de recommencer.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Impossible de crediter le proprietaire destinataire.",
        },
        { status: 409 },
      );
    }

    if (giverNextQuantity === 0 && giverReservedQuantity === 0) {
      await cleanupEmptyInventoryRow({
        supabase,
        inventoryId: giverInventory.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${transferQuantity} piece${
        transferQuantity > 1 ? "s" : ""
      } transferee${transferQuantity > 1 ? "s" : ""} de ${fromOwnerName} vers ${toOwnerName}.`,
      transfer: {
        productId,
        variantId,
        colorName: variantResponse.data.colors?.name ?? "",
        sizeName: variantResponse.data.sizes?.name ?? "",
        fromOwnerName,
        toOwnerName,
        quantity: transferQuantity,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to transfer stock.",
      },
      { status: 500 },
    );
  }
}
