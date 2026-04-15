"use client";

import { useState } from "react";
import ProductFilter from "@/components/ProductFilter";
import FilterSidebar from "@/components/FilterSidebar";
import ProductItem from "@/components/product";
import { cn } from "@/lib/utils";

export default function ProductCollectionPage({
  title,
  description,
  products,
  linkMode = "flat",
  categorySlug = null,
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="pb-10 [--sidebar-width:20rem]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 md:px-6 md:py-8">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-caftan-brand">
          Collection
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-caftan-text md:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-caftan-text md:text-base">
              {description}
            </p>
          </div>

          <p className="text-sm text-caftan-brand">
            {products.length} products
          </p>
        </div>
      </div>

      <div className="mb-4 flex justify-end bg-caftan-cream/80 px-4 md:hidden">
        <ProductFilter onOpenChange={setFilterOpen} />
      </div>

      <div className={cn("flex", filterOpen ? "md:gap-8" : "md:gap-0")}>
        <FilterSidebar isOpen={filterOpen} />
        <div
          aria-hidden="true"
          className={cn(
            "hidden shrink-0 transition-[width] duration-300 ease-out md:block",
            filterOpen ? "w-[var(--sidebar-width)]" : "w-0",
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <section className="w-full px-4 md:px-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 md:mt-6">
              <div className="hidden justify-end md:flex">
                <ProductFilter onOpenChange={setFilterOpen} />
              </div>

              {products.length ? (
                <div className="grid w-full grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <div key={product.id} className="w-full">
                      <ProductItem
                        {...product}
                        href={
                          linkMode === "nested" && categorySlug
                            ? `/products/${categorySlug}/${product.slug}`
                            : `/products/${product.slug}`
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-caftan-border bg-caftan-surface px-6 py-12 text-center">
                  <h2 className="text-xl font-semibold text-caftan-text">
                    No products yet
                  </h2>
                  <p className="mt-2 text-sm text-caftan-text">
                    Products for this category will appear here when they are
                    added from the dashboard.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
