"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import caftanTest from "../../public/caftan-test.jpg";
import { Dot } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import ProductItem from "@/components/product";
import { formatPrice } from "@/lib/format-price";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function getDefaultColor(product) {
  return (
    product.variants.find((variant) => variant.inStock)?.colorName ??
    product.colorOptions[0]?.name ??
    null
  );
}

function getDefaultSize(product, colorName) {
  const matchingVariants = product.variants.filter((variant) =>
    colorName ? variant.colorName === colorName : true,
  );

  return (
    matchingVariants.find((variant) => variant.inStock)?.sizeName ??
    matchingVariants[0]?.sizeName ??
    null
  );
}

export default function ProductDetailsView({
  product,
  category,
  relatedProducts = [],
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState(() =>
    getDefaultColor(product),
  );
  const [selectedSize, setSelectedSize] = useState(() =>
    getDefaultSize(product, getDefaultColor(product)),
  );
  const [sizeError, setSizeError] = useState("");

  const variantsForSelectedColor = product.variants.filter((variant) =>
    selectedColor ? variant.colorName === selectedColor : true,
  );
  const sizeOptions = variantsForSelectedColor.length
    ? variantsForSelectedColor
    : product.variants;
  const selectedVariant =
    product.variants.find(
      (variant) =>
        variant.colorName === selectedColor &&
        variant.sizeName === selectedSize,
    ) ?? null;
  const currentImage =
    product.images.find(
      (image) =>
        !selectedColor ||
        image.colorName === selectedColor ||
        image.colorName == null,
    )?.url ??
    product.image ??
    caftanTest;
  const currentPriceClass = product.hasOffer
    ? "text-red-600"
    : "text-caftan-brand";
  const oldPriceClass = product.hasOffer ? "text-black" : "text-caftan-brand";

  const handleSizeChange = (size) => {
    const targetVariant = sizeOptions.find(
      (variant) => variant.sizeName === size,
    );

    if (!targetVariant || !targetVariant.inStock) {
      return;
    }

    const nextSize = selectedSize === size ? null : size;

    setSelectedSize(nextSize);

    if (nextSize) {
      setSizeError("");
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setSelectedSize(getDefaultSize(product, color));
    setSizeError("");
  };

  const handleAddToCart = () => {
    if (product.isSoldOut) {
      setSizeError("Ce produit est actuellement indisponible.");
      return;
    }

    if (!selectedVariant || !selectedVariant.inStock) {
      setSizeError(
        "Veuillez choisir une taille disponible avant d'ajouter au panier.",
      );
      return;
    }

    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      slug: product.slug,
      categorySlug: product.categorySlug,
      name: product.name,
      price: product.price,
      image: typeof currentImage === "string" ? currentImage : currentImage.src,
      size: String(selectedVariant.sizeName),
      color: selectedColor,
      quantity: 1,
    });

    router.push("/cart");
  };

  return (
    <div className="w-full px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Breadcrumb className="mt-2 md:mt-4">
          <BreadcrumbList className="text-xs uppercase tracking-[0.18em] text-caftan-brand md:text-sm md:tracking-[0.12em]">
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Dot className="size-4 text-caftan-brand" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/products/${category.slug}`}>
                {category.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Dot className="size-4 text-caftan-brand" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[12rem] md:max-w-none">
                {product.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex w-full flex-col justify-start gap-5 bg-caftan-cream p-4 shadow-sm shadow-caftan-brand/10 md:flex-row md:items-start md:gap-12">
          <div className="relative w-full overflow-hidden rounded-sm aspect-[8/9] md:w-[38%] md:aspect-[4/5] md:shrink-0">
            <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
              {product.isNew ? (
                <span className="bg-black px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.18em] text-white">
                  Nouveau
                </span>
              ) : null}
              {product.hasOffer ? (
                <span className="bg-red-600 px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.18em] text-white">
                  Promotion
                </span>
              ) : null}
              {product.isSoldOut ? (
                <span className="rounded-full bg-black px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white">
                  Epuisé
                </span>
              ) : null}
            </div>
            <Image
              src={currentImage}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 38vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-start gap-5 md:gap-6">
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-caftan-brand">
              {category.name}
            </p>

            <div className="space-y-3">
              <h1 className="text-2xl font-thin leading-tight text-caftan-text md:text-5xl uppercase">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <p
                  className={`text-2xl font-thin tracking-[0.08em] md:text-3xl ${currentPriceClass}`}>
                  {formatPrice(product.price)}
                </p>
                {product.oldPrice ? (
                  <p
                    className={`text-lg line-through font-thin md:text-xl ${oldPriceClass}`}>
                    {formatPrice(product.oldPrice)}
                  </p>
                ) : null}
              </div>
              {product.description ? (
                <p className="max-w-2xl text-sm leading-6 text-caftan-text md:text-base">
                  {product.description}
                </p>
              ) : null}
              <p className="text-sm text-caftan-brand-dark">
                {product.isSoldOut
                  ? "Toutes les variantes sont en rupture de stock."
                  : `${product.availableQuantity} piece${product.availableQuantity > 1 ? "s" : ""} disponible${product.availableQuantity > 1 ? "s" : ""} pour le moment.`}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-caftan-text">
                Taille disponible
              </p>
              <div className="flex flex-wrap gap-2.5">
                {sizeOptions.map((variant) => (
                  <button
                    type="button"
                    key={`${variant.colorId}-${variant.sizeId}`}
                    disabled={!variant.inStock}
                    onClick={() => handleSizeChange(variant.sizeName)}
                    className={`flex h-10 min-w-10 cursor-pointer items-center justify-center border px-3 text-sm font-semibold shadow-sm shadow-caftan-brand/10 transition-colors ${
                      selectedSize === variant.sizeName
                        ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                        : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand hover:bg-caftan-light/55"
                    } ${
                      !variant.inStock
                        ? "cursor-not-allowed opacity-40 line-through hover:border-caftan-border hover:bg-caftan-surface"
                        : ""
                    }`}>
                    {variant.sizeName}
                  </button>
                ))}
              </div>
              {sizeError ? (
                <p className="text-sm text-red-600" role="alert">
                  {sizeError}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-caftan-text">
                Couleurs Disponible
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.colorOptions.map((color) => {
                  const hasStockForColor = product.variants.some(
                    (variant) =>
                      variant.colorName === color.name && variant.inStock,
                  );

                  return (
                    <button
                      type="button"
                      key={color.id}
                      onClick={() => handleColorChange(color.name)}
                      className={`cursor-pointer border px-5 py-2 text-sm font-medium shadow-lg shadow-caftan-brand/10 transition-colors ${
                        selectedColor === color.name
                          ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                          : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand hover:bg-caftan-light/55"
                      } ${!hasStockForColor ? "opacity-50 line-through" : ""}`}>
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.isSoldOut}
                className="cursor-pointer w-full rounded-2xl border border-caftan-brand bg-caftan-brand px-14 py-4 text-base text-caftan-cream transition-colors hover:bg-caftan-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
                {product.isSoldOut
                  ? "Produit indisponible"
                  : "Ajouter au panier"}
              </button>
            </div>

            {/* <div className="flex flex-col gap-3 justify-center pt-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/products"
                className="rounded-full border border-caftan-border px-5 py-3 text-center text-sm font-medium text-caftan-text transition-colors hover:bg-caftan-surface">
                Back to all products
              </Link>
              <Link
                href={`/products/${category.slug}`}
                className="rounded-full bg-caftan-brand px-5 py-3 text-center text-sm font-medium text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
                More {category.name}
              </Link>
            </div> */}
          </div>
        </div>
      </div>
      {relatedProducts.length ? (
        <section className="mx-auto mt-12 w-full max-w-6xl px-4 md:mt-16 md:px-6">
          <div className="mb-6 flex flex-col items-center gap-2 text-center md:mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-caftan-brand">
              Plus de {category.name}
            </p>
            <h2 className="text-2xl font-semibold text-caftan-text md:text-3xl">
              Produits similaires
            </h2>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="w-full">
                <ProductItem
                  {...relatedProduct}
                  href={`/products/${category.slug}/${relatedProduct.slug}`}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
