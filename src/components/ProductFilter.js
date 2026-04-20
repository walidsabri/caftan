"use client";

import { Settings2, X } from "lucide-react";
import { geist } from "@/app/fonts";
import { Separator } from "@/components/ui/separator";

import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

export default function ProductFilter({
  isOpen,
  onOpenChange,
  minPrice,
  maxPrice,
  priceRange,
  onPriceRangeChange,
  selectedSizes,
  selectedColors,
  sizeOptions,
  colorOptions,
  onToggleSize,
  onToggleColor,
  onReset,
}) {
  const sliderMax = maxPrice > minPrice ? maxPrice : minPrice + 1000;

  const formatPrice = (price) => {
    return price === maxPrice ? `${price} DA` : `${price} DA`;
  };

  const handleToggle = () => {
    onOpenChange?.(!isOpen);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleToggle}
        className="w-fit cursor-pointer rounded-2xl border-caftan-border bg-caftan-surface px-4 py-2 font-mono text-caftan-text shadow-sm">
        <span>Filtre</span>
        <Settings2 className="size-4" />
      </Button>

      {/* Mobile Bottom Drawer */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 transition-opacity duration-300 md:hidden">
          <button
            type="button"
            aria-label="Fermer le panneau de filtres"
            onClick={handleToggle}
            className="absolute inset-0 bg-caftan-text/35"
          />

          <div className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-t-3xl border border-b-0 border-caftan-border bg-caftan-surface shadow-2xl transition-transform duration-300 ease-out">
            <div className="flex items-start justify-between gap-4 border-b border-caftan-border bg-caftan-cream px-5 py-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-caftan-brand">
                  Menu
                </p>
                <h2 className="text-lg font-semibold text-caftan-text">
                  Filtres
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                aria-label="Fermer les filtres"
                className="cursor-pointer rounded-full text-caftan-text">
                <X className="size-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto bg-caftan-cream px-5 py-5">
              <ul className="flex flex-col gap-4">
                <li className="flex flex-col space-y-3 pb-4">
                  <p className={`text-base font-semibold ${geist.className}`}>
                    Filtrage par prix :
                  </p>
                  <label className="text-center text-xs tabular-nums text-caftan-text">
                    De {formatPrice(priceRange[0])} A{" "}
                    {formatPrice(priceRange[1])}
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={priceRange}
                      onValueChange={onPriceRangeChange}
                      min={minPrice}
                      max={sliderMax}
                      step={500}
                      aria-label="Price range slider"
                      className="w-full"
                    />
                  </div>
                </li>
                <Separator />
                {sizeOptions.length ? (
                  <>
                    <li className="pb-4">
                      <p
                        className={`mb-3 text-base font-semibold ${geist.className}`}>
                        Filtrage par taille :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => onToggleSize(size)}
                            className={`flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                              selectedSizes.includes(size)
                                ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                                : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand/50"
                            }`}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </li>
                    <Separator />
                  </>
                ) : null}
                {colorOptions.length ? (
                  <li className="pb-2">
                    <p
                      className={`mb-3 text-base font-semibold ${geist.className}`}>
                      Filtrage par couleurs :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => onToggleColor(color)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${geist.className} ${
                            selectedColors.includes(color)
                              ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                              : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand/50"
                          }`}>
                          {color}
                        </button>
                      ))}
                    </div>
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="flex gap-3 border-t border-caftan-border bg-caftan-cream px-5 py-4">
              <button
                type="button"
                onClick={onReset}
                className="flex-1 cursor-pointer rounded-2xl border border-caftan-border px-5 py-3 text-base font-medium text-caftan-text transition-colors hover:bg-caftan-surface">
                Reset
              </button>
              <button
                type="button"
                onClick={handleToggle}
                className="flex-1 cursor-pointer rounded-2xl bg-caftan-brand px-5 py-3 text-base text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
                Voir les produits
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
