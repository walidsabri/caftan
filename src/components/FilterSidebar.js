"use client";

import { useState } from "react";
import { Slider } from "./ui/slider";
import { geist } from "@/app/fonts";
import { Separator } from "@/components/ui/separator";

export default function FilterSidebar({ isOpen }) {
  const min_price = 15000;
  const max_price = 100000;
  const [priceRange, setPriceRange] = useState([min_price, max_price]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  const sizes = Array.from({ length: 9 }, (_, i) => 36 + i * 2); // [36, 38, 40, 42, 44, 46, 48]
  const colors = ["Noir", "Blanc", "Rouge", "Bleu"]; // Test colors from DB

  const formatPrice = (price) => {
    return price === max_price ? `${price} Da+` : `${price} Da`;
  };

  const handleSizeChange = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const handleColorChange = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
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
                  onValueChange={setPriceRange}
                  min={15000}
                  max={100000}
                  step={1000}
                  aria-label="Price range slider"
                  className="w-full"
                />
              </div>
            </li>
            <Separator />
            <li className="">
              <p className={` text-base font-semibold ${geist.className} mb-2`}>
                Filtrage par taille :
              </p>
              <div className="flex flex-row gap-3 pb-4 flex-wrap">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`flex h-10 w-10 items-center justify-center rounded-sm border text-sm font-semibold transition-colors ${
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
            <li>
              <p className={` text-base font-semibold ${geist.className} mb-2`}>
                Filtrage par couleurs :
              </p>
              <div className="flex flex-row gap-3 pb-4 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
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
          </ul>
          <div className="mt-auto flex flex-row justify-center gap-2 border-t border-caftan-border bg-caftan-cream px-6 py-4">
            <button className="cursor-pointer rounded-2xl border border-caftan-border px-7 py-2 text-base font-medium text-caftan-text transition-colors hover:bg-caftan-surface">
              Resete
            </button>
            <button className="cursor-pointer rounded-2xl bg-caftan-brand px-7 py-2 text-base text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
              Filtrer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
