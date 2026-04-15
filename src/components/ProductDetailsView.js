"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import caftanTest from "../../public/caftan-test.jpg";
import { Dot } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import ProductItem from "@/components/product";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ProductDetailsView({
  product,
  category,
  relatedProducts = [],
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const sizes = Array.from({ length: 9 }, (_, i) => 36 + i * 2);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [sizeError, setSizeError] = useState("");

  const handleSizeChange = (size) => {
    const nextSize = selectedSize === size ? null : size;

    setSelectedSize(nextSize);

    if (nextSize) {
      setSizeError("");
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError("Veuillez choisir une taille avant d'ajouter au panier.");
      return;
    }

    const selectedImage = getImageForColor(selectedColor);

    addItem({
      productId: product.id,
      slug: product.slug,
      categorySlug: product.categorySlug,
      name: product.name,
      price: product.price,
      image:
        typeof selectedImage === "string" ? selectedImage : selectedImage.src,
      size: String(selectedSize),
      color: selectedColor,
      quantity: 1,
    });

    router.push("/cart");
  };

  // Map colors to images (update paths based on your actual image structure)
  const getImageForColor = (color) => {
    const colorMap = {
      [product.colors[0]]: caftanTest,
      // Add more color-to-image mappings as needed
    };
    return colorMap[color] || caftanTest;
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
            <Image
              src={getImageForColor(selectedColor)}
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
              <h1 className="text-2xl font-semibold leading-tight text-caftan-text md:text-5xl">
                {product.name}
              </h1>
              <p className="text-2xl font-semibold tracking-[0.08em] text-caftan-brand md:text-3xl">
                {product.price} DA
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-caftan-text">
                Taille disponible
              </p>
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`flex h-10 w-10 cursor-pointer items-center justify-center border text-sm font-semibold shadow-sm shadow-caftan-brand/10 transition-colors ${
                      selectedSize === size
                        ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                        : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand hover:bg-caftan-light/55"
                    }`}>
                    {size}
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
                {product.colors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`cursor-pointer border px-5 py-2 text-sm font-medium shadow-lg shadow-caftan-brand/10 transition-colors ${
                      selectedColor === color
                        ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                        : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand hover:bg-caftan-light/55"
                    }`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="cursor-pointer rounded-2xl border border-caftan-brand bg-caftan-brand px-14 py-4 text-base text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
                Ajouter au panier
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
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
            </div>
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
