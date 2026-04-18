import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeCount(value) {
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function hasRowContent(row) {
  if (!row) return false;
  const size = String(row.size || "").trim();
  const quantity = String(row.quantity || "").trim();
  const owners = row.owners || {};

  return (
    size !== "" ||
    quantity !== "" ||
    Object.values(owners).some((value) => String(value || "").trim() !== "")
  );
}

function validatePayload(payload) {
  const errors = [];

  const title = String(payload?.title || "").trim();
  const categoryId = String(payload?.categoryId || "").trim();
  const price = sanitizeCount(payload?.price);
  const oldPriceRaw = payload?.oldPrice;
  const oldPrice =
    oldPriceRaw === "" || oldPriceRaw == null
      ? null
      : sanitizeCount(oldPriceRaw);
  const totalQuantity = sanitizeCount(payload?.quantity);

  const colors = Array.isArray(payload?.colors) ? payload.colors : [];
  const stockByColor = payload?.stockByColor || {};
  const mediaByColor = payload?.mediaByColor || {};

  if (!title) errors.push("Product title is required.");
  if (!categoryId) errors.push("Category is required.");
  if (price <= 0) errors.push("Price must be greater than 0.");
  if (oldPrice !== null && oldPrice <= price) {
    errors.push("Old price must be greater than current price.");
  }
  if (totalQuantity <= 0) {
    errors.push("Total quantity must be greater than 0.");
  }
  if (!colors.length) {
    errors.push("At least one color is required.");
  }

  let detailedQuantity = 0;

  for (const colorName of colors) {
    const rows = Array.isArray(stockByColor[colorName])
      ? stockByColor[colorName]
      : [];
    const activeRows = rows.filter(hasRowContent);

    if (!activeRows.length) {
      errors.push(`${colorName}: add at least one size row.`);
      continue;
    }

    for (let index = 0; index < activeRows.length; index += 1) {
      const row = activeRows[index];
      const size = String(row.size || "").trim();
      const rowQuantity = sanitizeCount(row.quantity);
      const owners = row.owners || {};
      const ownerTotal = Object.values(owners).reduce(
        (sum, value) => sum + sanitizeCount(value),
        0,
      );

      const label = size
        ? `${colorName} / ${size}`
        : `${colorName} / row ${index + 1}`;

      if (!size) {
        errors.push(`${colorName}: one row has no size.`);
      }

      if (rowQuantity <= 0) {
        errors.push(`${label}: quantity must be greater than 0.`);
        continue;
      }

      if (ownerTotal !== rowQuantity) {
        errors.push(
          `${label}: owner allocation (${ownerTotal}) must match row quantity (${rowQuantity}).`,
        );
      }

      detailedQuantity += rowQuantity;
    }

    const media = Array.isArray(mediaByColor[colorName])
      ? mediaByColor[colorName]
      : [];
    for (const item of media) {
      if (!item?.url || !item?.publicId) {
        errors.push(`${colorName}: every image must include url and publicId.`);
        break;
      }
    }
  }

  if (detailedQuantity !== totalQuantity) {
    errors.push(
      `Detailed quantity (${detailedQuantity}) must match total quantity (${totalQuantity}).`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function getOrCreateColor(supabase, colorName) {
  const normalized = String(colorName || "").trim();

  const { data: existing, error: existingError } = await supabase
    .from("colors")
    .select("id, name")
    .eq("name", normalized)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("colors")
    .insert({ name: normalized })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

async function getSizeByName(supabase, sizeName) {
  const normalized = String(sizeName || "").trim();

  const { data, error } = await supabase
    .from("sizes")
    .select("id, name")
    .eq("name", normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Size "${normalized}" does not exist.`);

  return data;
}

async function getStockOwnersMap(supabase) {
  const { data, error } = await supabase
    .from("stock_owners")
    .select("id, name")
    .eq("is_active", true);

  if (error) throw error;

  return new Map(data.map((owner) => [owner.name, owner.id]));
}

export async function POST(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = validatePayload(body);

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

    const baseSlug = slugify(title);
    let finalSlug = baseSlug;

    const { data: existingProduct, error: existingProductError } =
      await supabase
        .from("products")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

    if (existingProductError) {
      return NextResponse.json(
        { error: existingProductError.message },
        { status: 400 },
      );
    }

    if (existingProduct) {
      finalSlug = `${baseSlug}-${Date.now()}`;
    }

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
