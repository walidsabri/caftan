export function sanitizeCount(value) {
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function hasRowContent(row) {
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

export function validateProductPayload(payload, options = {}) {
  const errors = [];
  const allowZeroQuantity = Boolean(options.allowZeroQuantity);

  const title = String(payload?.title || "").trim();
  const categoryId = String(payload?.categoryId || "").trim();
  const price = sanitizeCount(payload?.price);
  const oldPriceRaw = payload?.oldPrice;
  const oldPrice =
    oldPriceRaw === "" || oldPriceRaw == null
      ? null
      : sanitizeCount(oldPriceRaw);
  const totalQuantityRaw = String(payload?.quantity ?? "").trim();
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
  if (!totalQuantityRaw) {
    errors.push("Total quantity is required.");
  } else if (!allowZeroQuantity && totalQuantity <= 0) {
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
      const rowQuantityRaw = String(row.quantity ?? "").trim();
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

      if (!rowQuantityRaw) {
        errors.push(`${label}: quantity is required.`);
        continue;
      }

      if (!allowZeroQuantity && rowQuantity <= 0) {
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

export async function getOrCreateColor(supabase, colorName) {
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

export async function getOrCreateSize(supabase, sizeName) {
  const normalized = String(sizeName || "").trim();

  const { data: existing, error: existingError } = await supabase
    .from("sizes")
    .select("id, name, sort_order")
    .eq("name", normalized)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: lastSize, error: lastSizeError } = await supabase
    .from("sizes")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSizeError) throw lastSizeError;

  const nextSortOrder = sanitizeCount(lastSize?.sort_order) + 1;
  const { data, error } = await supabase
    .from("sizes")
    .insert({
      name: normalized,
      sort_order: nextSortOrder,
    })
    .select("id, name, sort_order")
    .single();

  if (error) throw error;
  return data;
}

export async function getSizeByName(supabase, sizeName) {
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

export function validateRestockPayload(payload) {
  const errors = [];
  const totalQuantityRaw = String(payload?.quantity ?? "").trim();
  const totalQuantity = sanitizeCount(payload?.quantity);
  const colors = Array.isArray(payload?.colors) ? payload.colors : [];
  const stockByColor = payload?.stockByColor || {};
  const mediaByColor = payload?.mediaByColor || {};

  if (!totalQuantityRaw) {
    errors.push("Total quantity is required.");
  } else if (totalQuantity <= 0) {
    errors.push("Total quantity to add must be greater than 0.");
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
      const rowQuantityRaw = String(row.quantity ?? "").trim();
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

      if (!rowQuantityRaw) {
        errors.push(`${label}: quantity is required.`);
        continue;
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

export async function getStockOwnersMap(supabase) {
  const { data, error } = await supabase
    .from("stock_owners")
    .select("id, name")
    .eq("is_active", true);

  if (error) throw error;

  return new Map(data.map((owner) => [owner.name, owner.id]));
}

export async function buildUniqueProductSlug(
  supabase,
  title,
  excludeProductId = null,
) {
  const baseSlug = slugify(title);
  let finalSlug = baseSlug;

  const query = supabase.from("products").select("id").eq("slug", finalSlug);
  const scopedQuery = excludeProductId
    ? query.neq("id", excludeProductId)
    : query;
  const { data: existingProduct, error } = await scopedQuery.maybeSingle();

  if (error) {
    throw error;
  }

  if (existingProduct) {
    finalSlug = `${baseSlug}-${Date.now()}`;
  }

  return finalSlug;
}
