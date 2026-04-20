"use client";

import { useState } from "react";
import ProductFilter from "@/components/ProductFilter";
import FilterSidebar from "@/components/FilterSidebar";
import ProductItem from "@/components/product";
import { cn } from "@/lib/utils";

const optionCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

export default function ProductCollectionPage({
  title,
  description,
  products,
  linkMode = "flat",
  categorySlug = null,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const prices = products.map((product) => product.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const colorOptions = Array.from(
    new Set(products.flatMap((product) => product.colors ?? [])),
  ).sort(optionCollator.compare);
  const sizeOptions = Array.from(
    new Set(products.flatMap((product) => product.sizes ?? [])),
  ).sort(optionCollator.compare);

  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  const hasPriceFilter = priceRange[0] > minPrice || priceRange[1] < maxPrice;
  const hasActiveFilters =
    hasPriceFilter || selectedSizes.length > 0 || selectedColors.length > 0;

  const filteredProducts = products.filter((product) => {
    const matchesPrice =
      product.price >= priceRange[0] && product.price <= priceRange[1];
    const matchesSizes =
      !selectedSizes.length ||
      selectedSizes.some((size) => product.sizes?.includes(size));
    const matchesColors =
      !selectedColors.length ||
      selectedColors.some((color) => product.colors?.includes(color));

    return matchesPrice && matchesSizes && matchesColors;
  });

  function toggleSize(size) {
    setSelectedSizes((currentSizes) =>
      currentSizes.includes(size)
        ? currentSizes.filter((currentSize) => currentSize !== size)
        : [...currentSizes, size],
    );
  }

  function toggleColor(color) {
    setSelectedColors((currentColors) =>
      currentColors.includes(color)
        ? currentColors.filter((currentColor) => currentColor !== color)
        : [...currentColors, color],
    );
  }

  function resetFilters() {
    setPriceRange([minPrice, maxPrice]);
    setSelectedSizes([]);
    setSelectedColors([]);
  }

  return (
    <div className="pb-10 [--sidebar-width:20rem]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-4 text-center md:gap-3 md:px-6 md:py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex w-full items-center justify-center gap-3 md:flex-col md:items-center md:gap-2">
            <p className="text-lg font-light uppercase tracking-[0.24em] text-caftan-brand text-center">
              {title}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end px-4 md:mb-3 md:hidden">
        <ProductFilter
          isOpen={filterOpen}
          onOpenChange={setFilterOpen}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          selectedSizes={selectedSizes}
          selectedColors={selectedColors}
          sizeOptions={sizeOptions}
          colorOptions={colorOptions}
          onToggleSize={toggleSize}
          onToggleColor={toggleColor}
          onReset={resetFilters}
        />
      </div>

      <div className={cn("flex", filterOpen ? "md:gap-8" : "md:gap-0")}>
        <FilterSidebar
          isOpen={filterOpen}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          selectedSizes={selectedSizes}
          selectedColors={selectedColors}
          sizeOptions={sizeOptions}
          colorOptions={colorOptions}
          onToggleSize={toggleSize}
          onToggleColor={toggleColor}
          onReset={resetFilters}
        />
        <div
          aria-hidden="true"
          className={cn(
            "hidden shrink-0 transition-[width] duration-300 ease-out md:block",
            filterOpen ? "w-[var(--sidebar-width)]" : "w-0",
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <section className="w-full px-4 md:px-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 md:mt-6">
              <div className="hidden justify-end md:flex">
                <ProductFilter
                  isOpen={filterOpen}
                  onOpenChange={setFilterOpen}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  sizeOptions={sizeOptions}
                  colorOptions={colorOptions}
                  onToggleSize={toggleSize}
                  onToggleColor={toggleColor}
                  onReset={resetFilters}
                />
              </div>

              {filteredProducts.length ? (
                <div className="grid w-full grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
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
                    {products.length
                      ? "Aucun produit ne correspond aux filtres"
                      : "Aucun produit disponible"}
                  </h2>
                  <p className="mt-2 text-sm text-caftan-text">
                    {products.length
                      ? "Essayez d'elargir la fourchette de prix ou de retirer quelques filtres."
                      : "Les produits apparaitront ici quand ils seront publies depuis le dashboard."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-5 rounded-full border border-caftan-border px-5 py-3 text-sm font-medium text-caftan-text transition-colors hover:bg-caftan-cream">
                      Reinitialiser les filtres
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
