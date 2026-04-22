import { NextResponse } from "next/server";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

import {
  getOrCreateColor,
  getOrCreateSize,
  getStockOwnersMap,
  hasRowContent,
  sanitizeCount,
  validateRestockPayload,
} from "../../product-payload";

export const runtime = "nodejs";

function getVariantKey(colorId, sizeId) {
  return `${colorId}:${sizeId}`;
}

async function fetchProductForRestock(supabase, productId) {
  return supabase
    .from("products")
    .select(
      `
      id,
      name,
      cover_image_url,
      cover_image_public_id,
      product_images (
        id,
        color_id,
        sort_order
      ),
      product_variants (
        id,
        color_id,
        size_id,
        variant_inventory (
          id,
          stock_owner_id,
          quantity,
          reserved_quantity
        )
      )
    `,
    )
    .eq("id", productId)
    .maybeSingle();
}

export async function POST(request, { params }) {
  try {
    const { productId } = await params;
    const supabase = await createClient();
    const { adminProfile, unauthorizedResponse } =
      await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = await request.json();
    const validation = validateRestockPayload(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.errors },
        { status: 400 },
      );
    }

    const { data: product, error: productError } = await fetchProductForRestock(
      supabase,
      productId,
    );

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 400 },
      );
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const colors = Array.isArray(body.colors) ? body.colors : [];
    const stockByColor = body.stockByColor || {};
    const mediaByColor = body.mediaByColor || {};
    const note =
      String(body.note || "").trim() || "Manual restock from admin panel";
    const stockOwnersMap = await getStockOwnersMap(supabase);
    const colorMap = new Map();
    const imageCountByColorId = new Map();
    const variantsByKey = new Map(
      (product.product_variants ?? []).map((variant) => [
        getVariantKey(variant.color_id, variant.size_id),
        {
          ...variant,
          variant_inventory: [...(variant.variant_inventory ?? [])],
        },
      ]),
    );
    let firstInsertedImage = null;

    for (const image of product.product_images ?? []) {
      const colorId = image.color_id;
      const nextSortOrder = sanitizeCount(image.sort_order) + 1;
      imageCountByColorId.set(
        colorId,
        Math.max(imageCountByColorId.get(colorId) ?? 0, nextSortOrder),
      );
    }

    for (const colorName of colors) {
      const colorRecord = await getOrCreateColor(supabase, colorName);
      colorMap.set(colorName, colorRecord.id);
    }

    for (const colorName of colors) {
      const colorId = colorMap.get(colorName);
      const mediaItems = Array.isArray(mediaByColor[colorName])
        ? mediaByColor[colorName]
        : [];
      const nextSortOrder = imageCountByColorId.get(colorId) ?? 0;

      for (let index = 0; index < mediaItems.length; index += 1) {
        const mediaItem = mediaItems[index];

        if (!firstInsertedImage) {
          firstInsertedImage = mediaItem;
        }

        const { error: imageError } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            color_id: colorId,
            image_url: mediaItem.url,
            image_public_id: mediaItem.publicId,
            alt_text: `${product.name} - ${colorName}`,
            sort_order: nextSortOrder + index,
          });

        if (imageError) {
          return NextResponse.json(
            { error: imageError.message },
            { status: 400 },
          );
        }
      }

      if (mediaItems.length) {
        imageCountByColorId.set(colorId, nextSortOrder + mediaItems.length);
      }
    }

    if (!product.cover_image_url && firstInsertedImage) {
      const { error: coverImageError } = await supabase
        .from("products")
        .update({
          cover_image_url: firstInsertedImage.url,
          cover_image_public_id: firstInsertedImage.publicId,
        })
        .eq("id", productId);

      if (coverImageError) {
        return NextResponse.json(
          { error: coverImageError.message },
          { status: 400 },
        );
      }
    }

    for (const colorName of colors) {
      const rows = Array.isArray(stockByColor[colorName])
        ? stockByColor[colorName]
        : [];
      const activeRows = rows.filter(hasRowContent);
      const colorId = colorMap.get(colorName);

      for (const row of activeRows) {
        const sizeRecord = await getOrCreateSize(supabase, row.size);
        const variantKey = getVariantKey(colorId, sizeRecord.id);
        let variant = variantsByKey.get(variantKey);

        if (!variant) {
          const { data: insertedVariant, error: insertedVariantError } =
            await supabase
              .from("product_variants")
              .insert({
                product_id: productId,
                color_id: colorId,
                size_id: sizeRecord.id,
              })
              .select("id, color_id, size_id")
              .single();

          if (insertedVariantError) {
            return NextResponse.json(
              { error: insertedVariantError.message },
              { status: 400 },
            );
          }

          variant = {
            ...insertedVariant,
            variant_inventory: [],
          };
          variantsByKey.set(variantKey, variant);
        }

        const inventoryByOwnerId = new Map(
          (variant.variant_inventory ?? []).map((inventoryRow) => [
            inventoryRow.stock_owner_id,
            inventoryRow,
          ]),
        );
        const movementRows = [];

        for (const ownerName of SHOP_OWNERS) {
          const addedQuantity = sanitizeCount(row.owners?.[ownerName]);

          if (addedQuantity <= 0) {
            continue;
          }

          const stockOwnerId = stockOwnersMap.get(ownerName);

          if (!stockOwnerId) {
            return NextResponse.json(
              { error: `Unknown stock owner: ${ownerName}` },
              { status: 400 },
            );
          }

          const existingInventory = inventoryByOwnerId.get(stockOwnerId);

          if (existingInventory) {
            const nextQuantity =
              sanitizeCount(existingInventory.quantity) + addedQuantity;
            const { error: updateInventoryError } = await supabase
              .from("variant_inventory")
              .update({
                quantity: nextQuantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingInventory.id);

            if (updateInventoryError) {
              return NextResponse.json(
                { error: updateInventoryError.message },
                { status: 400 },
              );
            }

            existingInventory.quantity = nextQuantity;
          } else {
            const { data: insertedInventory, error: insertInventoryError } =
              await supabase
                .from("variant_inventory")
                .insert({
                  variant_id: variant.id,
                  stock_owner_id: stockOwnerId,
                  quantity: addedQuantity,
                  reserved_quantity: 0,
                })
                .select("id, stock_owner_id, quantity, reserved_quantity")
                .single();

            if (insertInventoryError) {
              return NextResponse.json(
                { error: insertInventoryError.message },
                { status: 400 },
              );
            }

            variant.variant_inventory = [
              ...(variant.variant_inventory ?? []),
              insertedInventory,
            ];
            inventoryByOwnerId.set(stockOwnerId, insertedInventory);
          }

          movementRows.push({
            variant_id: variant.id,
            stock_owner_id: stockOwnerId,
            movement_type: "restock",
            quantity: addedQuantity,
            note,
            created_by_admin_id: adminProfile?.id ?? null,
          });
        }

        if (movementRows.length) {
          const { error: movementError } = await supabase
            .from("stock_movements")
            .insert(movementRows);

          if (movementError) {
            return NextResponse.json(
              { error: movementError.message },
              { status: 400 },
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
      message: "Stock added successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
