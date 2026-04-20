"use client";

import { Slider } from "./ui/slider";
import { geist } from "@/app/fonts";
import { Separator } from "@/components/ui/separator";

export default function FilterSidebar({
  isOpen,
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

  return (
    <>
      {/* Filter Sidebar - shows conditionally on desktop */}
      {isOpen && (
        <div className="hidden h-[calc(100vh-7rem)] w-[var(--sidebar-width)] flex-col overflow-hidden border-r border-caftan-border bg-caftan-surface shadow-sm md:fixed md:left-0 md:top-28 md:z-30 md:flex">
          {/* <div className="flex items-start justify-between gap-4 px-6 py-4 bg-white border-b border-caftan-border">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-caftan-brand">
                Menu
              </p>
              <h2 className="text-lg font-semibold text-caftan-text">
                Filtres
              </h2>
            </div>
          </div> */}
          <ul className="flex flex-1 flex-col gap-4 overflow-y-auto bg-caftan-cream px-6 py-6">
            <li className="space-y-2 flex flex-col pb-4 ">
              <p className={` text-base font-semibold ${geist.className}`}>
                Filtrage par prix :
              </p>
              <label className={`tabular-nums text-xs text-center  `}>
                De {formatPrice(priceRange[0])} A {formatPrice(priceRange[1])}
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
                <li className="">
                  <p className={` text-base font-semibold ${geist.className} mb-2`}>
                    Filtrage par taille :
                  </p>
                  <div className="flex flex-row gap-3 pb-4 flex-wrap">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onToggleSize(size)}
                        className={`flex h-10 min-w-10 items-center justify-center rounded-sm border px-3 text-sm font-semibold transition-colors ${
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
              <>
                <li>
                  <p className={` text-base font-semibold ${geist.className} mb-2`}>
                    Filtrage par couleurs :
                  </p>
                  <div className="flex flex-row gap-3 pb-4 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onToggleColor(color)}
                        className={`flex items-center justify-center rounded-sm border px-2 py-2 text-sm font-semibold transition-colors ${geist.className} ${
                          selectedColors.includes(color)
                            ? "border-caftan-brand bg-caftan-brand text-caftan-cream"
                            : "border-caftan-border bg-caftan-surface text-caftan-text hover:border-caftan-brand/50"
                        }`}>
                        {color}
                      </button>
                    ))}
                  </div>
                </li>
                <Separator />
              </>
            ) : null}
          </ul>
          <div className="mt-auto flex flex-row justify-center gap-2 border-t border-caftan-border bg-caftan-cream px-6 py-4">
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer rounded-2xl border border-caftan-border px-7 py-2 text-base font-medium text-caftan-text transition-colors hover:bg-caftan-surface">
              Reset
            </button>
            <button
              type="button"
              className="cursor-default rounded-2xl bg-caftan-brand px-7 py-2 text-base text-caftan-cream">
              Filtres actifs
            </button>
          </div>
        </div>
      )}
    </>
  );
}
