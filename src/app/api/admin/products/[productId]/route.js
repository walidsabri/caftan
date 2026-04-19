import { NextResponse } from "next/server";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import cloudinary from "@/lib/cloudinary";
import { ensureAdminRouteAccess } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

import {
  buildUniqueProductSlug,
  getOrCreateColor,
  getSizeByName,
  getStockOwnersMap,
  hasRowContent,
  sanitizeCount,
  validateProductPayload,
} from "../product-payload";

export const runtime = "nodejs";

async function cleanupCloudinaryImages(publicIds) {
  if (!publicIds.length) {
    return;
  }

  await Promise.allSettled(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      }),
    ),
  );
}

function createOwnerSplit() {
  return Object.fromEntries(SHOP_OWNERS.map((owner) => [owner, ""]));
}

function serializeProductForEditor(product) {
  const images = [...(product.product_images ?? [])].sort(
    (firstImage, secondImage) =>
      sanitizeCount(firstImage.sort_order) - sanitizeCount(secondImage.sort_order),
  );
  const variants = [...(product.product_variants ?? [])].sort((first, second) => {
    const firstColor = first.colors?.name ?? "";
    const secondColor = second.colors?.name ?? "";

    if (firstColor !== secondColor) {
      return firstColor.localeCompare(secondColor);
    }

    const firstSortOrder = sanitizeCount(first.sizes?.sort_order);
    const secondSortOrder = sanitizeCount(second.sizes?.sort_order);

    if (firstSortOrder !== secondSortOrder) {
      return firstSortOrder - secondSortOrder;
    }

    return (first.sizes?.name ?? "").localeCompare(second.sizes?.name ?? "");
  });

  const colors = [];
  const mediaByColor = {};
  const stockByColor = {};

  function ensureColor(colorName) {
    if (!colorName) {
      return;
    }

    if (!colors.includes(colorName)) {
      colors.push(colorName);
    }

    if (!mediaByColor[colorName]) {
      mediaByColor[colorName] = [];
    }

    if (!stockByColor[colorName]) {
      stockByColor[colorName] = [];
    }
  }

  images.forEach((image, index) => {
    const colorName = image.colors?.name;
    ensureColor(colorName);

    if (!colorName) {
      return;
    }

    mediaByColor[colorName].push({
      id: `media-${image.id ?? index}`,
      name: image.alt_text || `Image ${index + 1}`,
      previewUrl: image.image_url,
      url: image.image_url,
      publicId: image.image_public_id,
      isUploading: false,
    });
  });

  variants.forEach((variant) => {
    const colorName = variant.colors?.name;
    ensureColor(colorName);

    if (!colorName) {
      return;
    }

    const owners = createOwnerSplit();
    let rowQuantity = 0;

    for (const inventoryRow of variant.variant_inventory ?? []) {
      const ownerName = inventoryRow.stock_owners?.name;
      const quantity = sanitizeCount(inventoryRow.quantity);

      rowQuantity += quantity;

      if (ownerName && ownerName in owners) {
        owners[ownerName] = quantity > 0 ? `${quantity}` : "";
      }
    }

    stockByColor[colorName].push({
      id: `variant-${variant.id}`,
      size: variant.sizes?.name ?? "",
      quantity: rowQuantity > 0 ? `${rowQuantity}` : "",
      owners,
    });
  });

  const totalQuantity = Object.values(stockByColor).reduce(
    (sum, rows) =>
      sum +
      rows.reduce((rowsSum, row) => rowsSum + sanitizeCount(row.quantity), 0),
    0,
  );

  return {
    id: product.id,
    title: product.name,
    categoryId: product.category_id,
    price: product.price == null ? "" : `${product.price}`,
    oldPrice: product.old_price == null ? "" : `${product.old_price}`,
    quantity: `${totalQuantity}`,
    colors,
    stockByColor,
    mediaByColor,
  };
}

async function fetchProductGraph(supabase, productId) {
  return supabase
    .from("products")
    .select(
      `
      id,
      category_id,
      name,
      slug,
      price,
      old_price,
      cover_image_url,
      cover_image_public_id,
      is_active,
      product_images (
        id,
        image_url,
        image_public_id,
        alt_text,
        sort_order,
        colors (
          name
        )
      ),
      product_variants (
        id,
        color_id,
        size_id,
        created_at,
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

async function handleStatusPatch(supabase, productId, isActive) {
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("id, is_active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    product: data,
    message: "Product status updated successfully.",
  });
}

async function handleFullPatch(supabase, productId, body) {
  const validation = validateProductPayload(body);

  if (!validation.isValid) {
    return NextResponse.json(
      { error: "Validation failed.", details: validation.errors },
      { status: 400 },
    );
  }

  const { data: existingProduct, error: existingProductError } =
    await fetchProductGraph(supabase, productId);

  if (existingProductError) {
    return NextResponse.json(
      { error: existingProductError.message },
      { status: 400 },
    );
  }

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const title = String(body.title).trim();
  const categoryId = String(body.categoryId).trim();
  const price = sanitizeCount(body.price);
  const oldPrice =
    body.oldPrice === "" || body.oldPrice == null
      ? null
      : sanitizeCount(body.oldPrice);
  const colors = Array.isArray(body.colors) ? body.colors : [];
  const stockByColor = body.stockByColor || {};
  const mediaByColor = body.mediaByColor || {};

  const finalSlug = await buildUniqueProductSlug(supabase, title, productId);
  const stockOwnersMap = await getStockOwnersMap(supabase);
  const colorMap = new Map();

  for (const colorName of colors) {
    const colorRecord = await getOrCreateColor(supabase, colorName);
    colorMap.set(colorName, colorRecord.id);
  }

  const existingVariants = existingProduct.product_variants ?? [];
  const existingVariantsByKey = new Map(
    existingVariants.map((variant) => [
      `${variant.color_id}:${variant.size_id}`,
      variant,
    ]),
  );
  const processedVariantIds = new Set();

  for (const colorName of colors) {
    const rows = Array.isArray(stockByColor[colorName])
      ? stockByColor[colorName]
      : [];
    const activeRows = rows.filter(hasRowContent);
    const colorId = colorMap.get(colorName);

    for (const row of activeRows) {
      const sizeRecord = await getSizeByName(supabase, row.size);
      const variantKey = `${colorId}:${sizeRecord.id}`;
      let variant = existingVariantsByKey.get(variantKey);

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
      }

      processedVariantIds.add(variant.id);

      const existingInventoryByOwner = new Map(
        (variant.variant_inventory ?? []).map((inventoryRow) => [
          inventoryRow.stock_owners?.name,
          inventoryRow,
        ]),
      );

      for (const ownerName of SHOP_OWNERS) {
        const stockOwnerId = stockOwnersMap.get(ownerName);

        if (!stockOwnerId) {
          return NextResponse.json(
            { error: `Unknown stock owner: ${ownerName}` },
            { status: 400 },
          );
        }

        const quantity = sanitizeCount(row.owners?.[ownerName]);
        const existingInventory = existingInventoryByOwner.get(ownerName);
        const reservedQuantity = sanitizeCount(
          existingInventory?.reserved_quantity,
        );

        if (quantity < reservedQuantity) {
          return NextResponse.json(
            {
              error: `${colorName} / ${String(row.size || "").trim()}: ${ownerName} cannot be reduced below reserved quantity (${reservedQuantity}).`,
            },
            { status: 400 },
          );
        }

        if (existingInventory) {
          const { error: updateInventoryError } = await supabase
            .from("variant_inventory")
            .update({
              quantity,
            })
            .eq("id", existingInventory.id);

          if (updateInventoryError) {
            return NextResponse.json(
              { error: updateInventoryError.message },
              { status: 400 },
            );
          }

          continue;
        }

        if (quantity <= 0) {
          continue;
        }

        const { error: insertInventoryError } = await supabase
          .from("variant_inventory")
          .insert({
            variant_id: variant.id,
            stock_owner_id: stockOwnerId,
            quantity,
            reserved_quantity: 0,
          });

        if (insertInventoryError) {
          return NextResponse.json(
            { error: insertInventoryError.message },
            { status: 400 },
          );
        }
      }
    }
  }

  for (const variant of existingVariants) {
    if (processedVariantIds.has(variant.id)) {
      continue;
    }

    const { error: deleteVariantError } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variant.id);

    if (deleteVariantError) {
      if (
        deleteVariantError.code === "23503" ||
        deleteVariantError.message.includes("violates foreign key constraint")
      ) {
        return NextResponse.json(
          {
            error:
              "Impossible de retirer une variante de ce produit car elle est deja utilisee dans des commandes.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: deleteVariantError.message },
        { status: 400 },
      );
    }
  }

  const oldPublicIds = new Set(
    [
      existingProduct.cover_image_public_id,
      ...(existingProduct.product_images ?? []).map((image) => image.image_public_id),
    ].filter(Boolean),
  );
  const nextPublicIds = new Set();

  const { error: deleteImagesError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteImagesError) {
    return NextResponse.json(
      { error: deleteImagesError.message },
      { status: 400 },
    );
  }

  for (const colorName of colors) {
    const colorId = colorMap.get(colorName);
    const mediaItems = Array.isArray(mediaByColor[colorName])
      ? mediaByColor[colorName]
      : [];

    for (let index = 0; index < mediaItems.length; index += 1) {
      const mediaItem = mediaItems[index];

      if (mediaItem?.publicId) {
        nextPublicIds.add(mediaItem.publicId);
      }

      const { error: insertImageError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          color_id: colorId,
          image_url: mediaItem.url,
          image_public_id: mediaItem.publicId,
          alt_text: `${title} - ${colorName}`,
          sort_order: index,
        });

      if (insertImageError) {
        return NextResponse.json(
          { error: insertImageError.message },
          { status: 400 },
        );
      }
    }
  }

  const firstColorWithImage = colors.find(
    (colorName) =>
      Array.isArray(mediaByColor[colorName]) && mediaByColor[colorName].length > 0,
  );
  const firstImage =
    firstColorWithImage && mediaByColor[firstColorWithImage]
      ? mediaByColor[firstColorWithImage][0]
      : null;

  const { data: updatedProduct, error: updateProductError } = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name: title,
      slug: finalSlug,
      price,
      old_price: oldPrice,
      cover_image_url: firstImage?.url ?? null,
      cover_image_public_id: firstImage?.publicId ?? null,
    })
    .eq("id", productId)
    .select("id, slug")
    .maybeSingle();

  if (updateProductError) {
    return NextResponse.json(
      { error: updateProductError.message },
      { status: 400 },
    );
  }

  if (!updatedProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const removedPublicIds = [...oldPublicIds].filter(
    (publicId) => !nextPublicIds.has(publicId),
  );

  await cleanupCloudinaryImages(removedPublicIds);

  return NextResponse.json({
    success: true,
    productId: updatedProduct.id,
    slug: updatedProduct.slug,
    message: "Product updated successfully.",
  });
}

export async function GET(_request, { params }) {
  try {
    const { productId } = await params;
    const supabase = await createClient();

    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { data: product, error } = await fetchProductGraph(supabase, productId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: serializeProductForEditor(product),
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

export async function PATCH(request, { params }) {
  try {
    const { productId } = await params;
    const supabase = await createClient();

    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = await request.json();

    if (typeof body?.isActive === "boolean" && !("title" in body)) {
      return handleStatusPatch(supabase, productId, body.isActive);
    }

    return handleFullPatch(supabase, productId, body);
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

export async function DELETE(_request, { params }) {
  try {
    const { productId } = await params;
    const supabase = await createClient();

    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        id,
        cover_image_public_id,
        product_images (
          image_public_id
        )
      `,
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 400 },
      );
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const publicIds = Array.from(
      new Set(
        [
          product.cover_image_public_id,
          ...(product.product_images ?? []).map((image) => image.image_public_id),
        ].filter(Boolean),
      ),
    );

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      if (
        deleteError.code === "23503" ||
        deleteError.message.includes("violates foreign key constraint")
      ) {
        return NextResponse.json(
          {
            error:
              "Impossible de supprimer ce produit car il est deja utilise dans des commandes.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 },
      );
    }

    await cleanupCloudinaryImages(publicIds);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully.",
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
