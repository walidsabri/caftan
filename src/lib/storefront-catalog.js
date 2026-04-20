import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

const productTextCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});
const NEW_PRODUCT_WINDOW_DAYS = 14;

function isNewStorefrontProduct(createdAt) {
  if (!createdAt) {
    return false;
  }

  const createdAtMs = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function createStorefrontClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase storefront environment variables are missing.");
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function compareSizeOptions(firstSize, secondSize) {
  const firstSortOrder = Number(firstSize.sortOrder ?? Number.MAX_SAFE_INTEGER);
  const secondSortOrder = Number(secondSize.sortOrder ?? Number.MAX_SAFE_INTEGER);

  if (firstSortOrder !== secondSortOrder) {
    return firstSortOrder - secondSortOrder;
  }

  return productTextCollator.compare(firstSize.name, secondSize.name);
}

function compareVariants(firstVariant, secondVariant) {
  const colorComparison = productTextCollator.compare(
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

  return productTextCollator.compare(firstVariant.sizeName, secondVariant.sizeName);
}

function buildDiscountPercent(price, oldPrice) {
  if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || oldPrice <= price) {
    return null;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function groupRowsBy(rows, getKey) {
  return rows.reduce((groups, row) => {
    const key = getKey(row);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
    return groups;
  }, new Map());
}

async function fetchStorefrontVariants(supabase) {
  const noArgResponse = await supabase.rpc("get_storefront_product_variants");

  if (!noArgResponse.error) {
    return noArgResponse;
  }

  if (!noArgResponse.error.message?.includes("get_storefront_product_variants")) {
    return noArgResponse;
  }

  return supabase.rpc("get_storefront_product_variants", {
    target_product_id: null,
  });
}

function mapStorefrontProduct(productRow, category, imageRows, variantRows) {
  const colorNamesById = new Map();
  const colorOptionsById = new Map();
  const sizeOptionsById = new Map();
  const totalAvailableQuantity = variantRows.reduce(
    (sum, variantRow) => sum + variantRow.availableQuantity,
    0,
  );

  const variants = [...variantRows]
    .sort(compareVariants)
    .map((variantRow) => {
      colorNamesById.set(variantRow.colorId, variantRow.colorName);
      colorOptionsById.set(variantRow.colorId, {
        id: variantRow.colorId,
        name: variantRow.colorName,
      });
      sizeOptionsById.set(variantRow.sizeId, {
        id: variantRow.sizeId,
        name: variantRow.sizeName,
        sortOrder: variantRow.sizeSortOrder,
      });

      return {
        id: variantRow.id,
        colorId: variantRow.colorId,
        colorName: variantRow.colorName,
        sizeId: variantRow.sizeId,
        sizeName: variantRow.sizeName,
        sizeSortOrder: variantRow.sizeSortOrder,
        availableQuantity: variantRow.availableQuantity,
        inStock: variantRow.availableQuantity > 0,
      };
    });

  const images = [...imageRows]
    .sort((firstImage, secondImage) => firstImage.sortOrder - secondImage.sortOrder)
    .map((imageRow, index) => ({
      id: imageRow.id,
      url: imageRow.imageUrl,
      altText: imageRow.altText || `${productRow.name} image ${index + 1}`,
      colorId: imageRow.colorId,
      colorName: imageRow.colorId ? colorNamesById.get(imageRow.colorId) ?? null : null,
      sortOrder: imageRow.sortOrder,
    }));

  images.forEach((image) => {
    if (image.colorId && image.colorName && !colorOptionsById.has(image.colorId)) {
      colorOptionsById.set(image.colorId, {
        id: image.colorId,
        name: image.colorName,
      });
    }
  });

  const colorOptions = Array.from(colorOptionsById.values()).sort((firstColor, secondColor) =>
    productTextCollator.compare(firstColor.name, secondColor.name),
  );
  const sizeOptions = Array.from(sizeOptionsById.values()).sort(compareSizeOptions);

  return {
    id: productRow.id,
    name: productRow.name,
    slug: productRow.slug,
    description: productRow.description || "",
    price: productRow.price,
    oldPrice: productRow.oldPrice,
    hasOffer: productRow.oldPrice != null && productRow.oldPrice > productRow.price,
    discountPercent: buildDiscountPercent(productRow.price, productRow.oldPrice),
    isNew: isNewStorefrontProduct(productRow.createdAt),
    image: productRow.coverImageUrl || images[0]?.url || "/caftan-test.jpg",
    images,
    colors: colorOptions.map((color) => color.name),
    sizes: sizeOptions.map((size) => size.name),
    colorOptions,
    sizeOptions,
    variants,
    availableQuantity: totalAvailableQuantity,
    isSoldOut: totalAvailableQuantity <= 0,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryDescription: category.description,
    createdAt: productRow.createdAt,
  };
}

const getStorefrontCatalog = cache(async () => {
  const supabase = createStorefrontClient();

  const [categoriesResponse, productsResponse, variantsResponse] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, description")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, category_id, name, slug, description, price, old_price, cover_image_url, created_at",
      )
      .order("created_at", { ascending: false }),
    fetchStorefrontVariants(supabase),
  ]);

  if (categoriesResponse.error) {
    throw new Error(categoriesResponse.error.message);
  }

  if (productsResponse.error) {
    throw new Error(productsResponse.error.message);
  }

  if (variantsResponse.error) {
    throw new Error(variantsResponse.error.message);
  }

  const categories = (categoriesResponse.data ?? []).map((categoryRow) => ({
    id: categoryRow.id,
    name: categoryRow.name,
    slug: categoryRow.slug,
    description: categoryRow.description || "",
  }));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const productRows = (productsResponse.data ?? [])
    .map((productRow) => ({
      id: productRow.id,
      categoryId: productRow.category_id,
      name: productRow.name,
      slug: productRow.slug,
      description: productRow.description || "",
      price: productRow.price,
      oldPrice: productRow.old_price,
      coverImageUrl: productRow.cover_image_url,
      createdAt: productRow.created_at,
    }))
    .filter((productRow) => categoriesById.has(productRow.categoryId));
  const productIds = productRows.map((productRow) => productRow.id);

  let imageRows = [];

  if (productIds.length) {
    const imagesResponse = await supabase
      .from("product_images")
      .select("id, product_id, color_id, image_url, alt_text, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (imagesResponse.error) {
      throw new Error(imagesResponse.error.message);
    }

    imageRows = (imagesResponse.data ?? []).map((imageRow) => ({
      id: imageRow.id,
      productId: imageRow.product_id,
      colorId: imageRow.color_id,
      imageUrl: imageRow.image_url,
      altText: imageRow.alt_text,
      sortOrder: imageRow.sort_order ?? 0,
    }));
  }

  const variantsByProductId = groupRowsBy(
    (variantsResponse.data ?? []).map((variantRow) => ({
      id: variantRow.variant_id,
      productId: variantRow.product_id,
      colorId: variantRow.color_id,
      colorName: variantRow.color_name,
      sizeId: variantRow.size_id,
      sizeName: variantRow.size_name,
      sizeSortOrder: variantRow.size_sort_order,
      availableQuantity: Number(variantRow.available_quantity) || 0,
    })),
    (variantRow) => variantRow.productId,
  );
  const imagesByProductId = groupRowsBy(imageRows, (imageRow) => imageRow.productId);

  const products = productRows.map((productRow) =>
    mapStorefrontProduct(
      productRow,
      categoriesById.get(productRow.categoryId),
      imagesByProductId.get(productRow.id) ?? [],
      variantsByProductId.get(productRow.id) ?? [],
    ),
  );

  return {
    categories,
    products,
  };
});

export async function getStorefrontNavigationData() {
  const { categories, products } = await getStorefrontCatalog();

  return {
    categories: categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    productCategoryBySlug: Object.fromEntries(
      products.map((product) => [product.slug, product.categorySlug]),
    ),
  };
}

export async function getStorefrontFeaturedProducts(limit = 8) {
  const { products } = await getStorefrontCatalog();
  return products.slice(0, limit);
}

export async function getStorefrontProducts() {
  const { products } = await getStorefrontCatalog();
  return products;
}

export async function getStorefrontCategories() {
  const { categories } = await getStorefrontCatalog();
  return categories;
}

export async function getStorefrontCategoryBySlug(slug) {
  const { categories } = await getStorefrontCatalog();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getStorefrontProductBySlug(slug) {
  const { products } = await getStorefrontCatalog();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getStorefrontProductsByCategory(categorySlug) {
  const { products } = await getStorefrontCatalog();
  return products.filter((product) => product.categorySlug === categorySlug);
}

export async function getStorefrontRelatedProducts(productId, categorySlug, limit = 4) {
  const categoryProducts = await getStorefrontProductsByCategory(categorySlug);

  return categoryProducts
    .filter((product) => product.id !== productId)
    .slice(0, limit);
}
