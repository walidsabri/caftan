import { NextResponse } from "next/server";
import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
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

function compareLabels(firstLabel = "", secondLabel = "") {
  return firstLabel.localeCompare(secondLabel);
}

function getAvailableInventoryQuantity(inventoryRow) {
  return Math.max(
    0,
    Number(inventoryRow?.quantity || 0) -
      Number(inventoryRow?.reserved_quantity || 0),
  );
}

function getProductColorNames(productVariants) {
  return Array.from(
    new Set(
      (productVariants ?? [])
        .map((variant) => variant.colors?.name?.trim())
        .filter(Boolean),
    ),
  ).sort(compareLabels);
}

function getProductSizeEntries(productVariants) {
  const sizeEntriesByName = new Map();

  for (const variant of productVariants ?? []) {
    const sizeName = variant.sizes?.name?.trim();

    if (!sizeName) {
      continue;
    }

    sizeEntriesByName.set(sizeName, {
      name: sizeName,
      sortOrder: Number(variant.sizes?.sort_order) || 0,
    });
  }

  return Array.from(sizeEntriesByName.values()).sort(
    (firstSize, secondSize) =>
      firstSize.sortOrder - secondSize.sortOrder ||
      compareLabels(firstSize.name, secondSize.name),
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { unauthorizedResponse } = await ensureAdminRouteAccess(supabase);

    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const [
      productsResponse,
      stockOwnersResponse,
      sizesResponse,
      categoriesResponse,
    ] = await Promise.all([
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
          is_active,
          created_at,
          categories (
            name
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
              quantity,
              reserved_quantity,
              stock_owners (
                name
              )
            )
          )
        `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("stock_owners")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase.from("sizes").select("name, sort_order"),
      supabase.from("categories").select("name").order("name", { ascending: true }),
    ]);

    if (
      productsResponse.error ||
      stockOwnersResponse.error ||
      sizesResponse.error ||
      categoriesResponse.error
    ) {
      return NextResponse.json(
        {
          error:
            productsResponse.error?.message ||
            stockOwnersResponse.error?.message ||
            sizesResponse.error?.message ||
            categoriesResponse.error?.message ||
            "Failed to load products.",
        },
        { status: 400 },
      );
    }

    const rawProducts = productsResponse.data || [];
    const variantIds = [];
    const productIdByVariantId = new Map();

    rawProducts.forEach((product) => {
      (product.product_variants ?? []).forEach((variant) => {
        if (!variant?.id) {
          return;
        }

        variantIds.push(variant.id);
        productIdByVariantId.set(variant.id, product.id);
      });
    });

    const lastRestockByProductId = new Map();

    if (variantIds.length) {
      const restockResponse = await supabase
        .from("stock_movements")
        .select("variant_id, created_at")
        .in("variant_id", variantIds)
        .eq("movement_type", "restock")
        .order("created_at", { ascending: false });

      if (restockResponse.error) {
        return NextResponse.json(
          {
            error: restockResponse.error.message || "Failed to load products.",
          },
          { status: 400 },
        );
      }

      (restockResponse.data || []).forEach((movement) => {
        const productId = productIdByVariantId.get(movement.variant_id);

        if (!productId || lastRestockByProductId.has(productId)) {
          return;
        }

        lastRestockByProductId.set(productId, movement.created_at);
      });
    }

    const mappedProducts = rawProducts.map((product) => {
      const colorNames = getProductColorNames(product.product_variants);
      const sizeEntries = getProductSizeEntries(product.product_variants);
      const availableQuantity = (product.product_variants ?? []).reduce(
        (productSum, variant) =>
          productSum +
          (variant.variant_inventory ?? []).reduce(
            (variantSum, inventoryRow) =>
              variantSum + getAvailableInventoryQuantity(inventoryRow),
            0,
          ),
        0,
      );
      const assignedOwners = Array.from(
        new Set(
          (product.product_variants ?? []).flatMap((variant) =>
            (variant.variant_inventory ?? [])
              .filter((inventoryRow) => Number(inventoryRow.quantity) > 0)
              .map((inventoryRow) => inventoryRow.stock_owners?.name)
              .filter(Boolean),
          ),
        ),
      ).sort(compareLabels);

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        oldPrice: product.old_price,
        image: product.cover_image_url,
        category: product.categories?.name ?? "Sans categorie",
        status: product.is_active ? "Active" : "Inactive",
        createdAt: product.created_at,
        lastRestockAt: lastRestockByProductId.get(product.id) ?? null,
        availableQuantity,
        stockState: availableQuantity > 0 ? "In stock" : "Out of stock",
        assignedOwners,
        colorNames,
        sizeNames: sizeEntries.map((sizeEntry) => sizeEntry.name),
      };
    });

    const assigneeOptions = Array.from(
      new Set([
        ...SHOP_OWNERS,
        ...(stockOwnersResponse.data || [])
          .map((owner) => owner.name?.trim())
          .filter(Boolean),
        ...mappedProducts.flatMap((product) => product.assignedOwners),
      ]),
    ).sort(compareLabels);
    const sizeOptions = (sizesResponse.data || [])
      .map((size) => ({
        name: size.name?.trim(),
        sortOrder: Number(size.sort_order) || 0,
      }))
      .filter((size) => Boolean(size.name))
      .sort(
        (firstSize, secondSize) =>
          firstSize.sortOrder - secondSize.sortOrder ||
          compareLabels(firstSize.name, secondSize.name),
      )
      .map((size) => size.name);
    const categoryOptions = Array.from(
      new Set(
        (categoriesResponse.data || [])
          .map((category) => category.name?.trim())
          .filter(Boolean),
      ),
    ).sort(compareLabels);

    return NextResponse.json({
      products: mappedProducts,
      assigneeOptions,
      sizeOptions,
      categoryOptions,
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
