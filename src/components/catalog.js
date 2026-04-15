"use client";

import Link from "next/link";
import ProductItem from "./product";
import { featuredProducts, getCategoryName } from "@/lib/catalog-data";

export default function Catalog() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 text-center font-mono text-4xl md:text-6xl">
          Nouveautes
        </h2>

        <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductItem
              key={product.id}
              {...product}
              categoryName={getCategoryName(product.categorySlug)}
              href={`/products/${product.slug}`}
            />
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/products"
            className="cursor-pointer rounded-sm border border-caftan-brand bg-caftan-brand px-8 py-3 font-mono text-xl text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
            Voir toutes les Caftans
          </Link>
        </div>
      </div>
    </section>
  );
}
