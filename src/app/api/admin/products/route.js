import { NextResponse } from "next/server";
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
} from "./product-payload";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = await request.json();
    const validation = validateProductPayload(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.errors },
        { status: 400 },
      );
    }

    const title = String(body.title).trim();
    const categoryId = String(body.categoryId).trim();
    const price = sanitizeCount(body.price);
    const oldPrice =
      body.oldPrice === "" || body.oldPrice == null
        ? null
        : sanitizeCount(body.oldPrice);

    const colors = body.colors;
    const stockByColor = body.stockByColor || {};
    const mediaByColor = body.mediaByColor || {};

    const finalSlug = await buildUniqueProductSlug(supabase, title);

    const firstColorWithImage = colors.find(
      (color) =>
        Array.isArray(mediaByColor[color]) && mediaByColor[color].length > 0,
    );

    const firstImage =
      firstColorWithImage && mediaByColor[firstColorWithImage]
        ? mediaByColor[firstColorWithImage][0]
        : null;

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        category_id: categoryId,
        name: title,
        slug: finalSlug,
        price,
        old_price: oldPrice,
        cover_image_url: firstImage?.url ?? null,
        cover_image_public_id: firstImage?.publicId ?? null,
      })
      .select("id, slug")
      .single();

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 400 },
      );
    }

    const stockOwnersMap = await getStockOwnersMap(supabase);
    const colorMap = new Map();

    for (const colorName of colors) {
      const colorRecord = await getOrCreateColor(supabase, colorName);
      colorMap.set(colorName, colorRecord.id);

      const mediaItems = Array.isArray(mediaByColor[colorName])
        ? mediaByColor[colorName]
        : [];

      for (let index = 0; index < mediaItems.length; index += 1) {
        const mediaItem = mediaItems[index];

        const { error: imageError } = await supabase
          .from("product_images")
          .insert({
            product_id: product.id,
            color_id: colorRecord.id,
            image_url: mediaItem.url,
            image_public_id: mediaItem.publicId,
            alt_text: `${title} - ${colorName}`,
            sort_order: index,
          });

        if (imageError) {
          return NextResponse.json(
            { error: imageError.message },
            { status: 400 },
          );
        }
      }
    }

    for (const colorName of colors) {
      const rows = Array.isArray(stockByColor[colorName])
        ? stockByColor[colorName]
        : [];
      const activeRows = rows.filter(hasRowContent);
      const colorId = colorMap.get(colorName);

      for (const row of activeRows) {
        const sizeRecord = await getSizeByName(supabase, row.size);

        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .insert({
            product_id: product.id,
            color_id: colorId,
            size_id: sizeRecord.id,
          })
          .select("id")
          .single();

        if (variantError) {
          return NextResponse.json(
            { error: variantError.message },
            { status: 400 },
          );
        }

        const owners = row.owners || {};

        for (const [ownerName, rawQuantity] of Object.entries(owners)) {
          const quantity = sanitizeCount(rawQuantity);
          if (quantity <= 0) continue;

          const stockOwnerId = stockOwnersMap.get(ownerName);

          if (!stockOwnerId) {
            return NextResponse.json(
              { error: `Unknown stock owner: ${ownerName}` },
              { status: 400 },
            );
          }

          const { error: inventoryError } = await supabase
            .from("variant_inventory")
            .insert({
              variant_id: variant.id,
              stock_owner_id: stockOwnerId,
              quantity,
              reserved_quantity: 0,
            });

          if (inventoryError) {
            return NextResponse.json(
              { error: inventoryError.message },
              { status: 400 },
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
      slug: product.slug,
      message: "Product created successfully.",
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
