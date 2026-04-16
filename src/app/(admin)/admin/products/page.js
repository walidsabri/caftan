"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { products } from "./data";
import { ProductsDataTable } from "./products-data-table";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStock, setSelectedStock] = React.useState("all");
  const [selectedTaille, setSelectedTaille] = React.useState("all");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const filterTriggerClass =
    "h-9 w-[190px] cursor-pointer rounded-2xl border border-dashed border-[#61666942] bg-white px-2 text-sm font-medium text-[#616669] shadow-none hover:bg-white focus-visible:ring-0 focus-visible:border-[#61666942] data-[state=open]:bg-white [&_svg:last-child]:text-[#616669]";
  const activeFilterTriggerClass =
    "border-[#081c16] focus-visible:border-[#081c16]";
  const simpleDropdownClass =
    "rounded-2xl border border-slate-200 bg-white p-1.5 text-[#081c16] shadow-sm";
  const selectItemClass =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-[#081c16] focus:bg-black! focus:text-white! focus:[&_svg]:text-white! focus:[&_span]:text-white! hover:bg-black! hover:text-white! hover:[&_svg]:text-white! hover:[&_span]:text-white!";
  const selectedStockLabel =
    selectedStock === "all" ? null : selectedStock;
  const selectedTailleLabel =
    selectedTaille === "all" ? null : selectedTaille;
  const selectedCategoryLabel =
    selectedCategory === "all" ? null : selectedCategory;
  const tailleOptions = [...new Set(products.map((product) => product.taille))];
  const categoryOptions = [
    ...new Set(products.map((product) => product.category)),
  ];

  function handleFilterIconPointerDown(event, clearFilter) {
    event.preventDefault();
    event.stopPropagation();
    clearFilter();
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-5 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <h3 className="text-3xl font-bold">Produits</h3>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <Link
            href="/admin/products/create-product"
            className="flex cursor-pointer flex-row items-center gap-1 whitespace-nowrap rounded-sm bg-black px-3 py-2 text-sm text-white">
            <Plus size={16} strokeWidth={3} />
            Cree un produit
          </Link>
        </div>
      </div>
      <Separator />
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Rechercher un produit..."
          className="h-10 cursor-pointer rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-700 shadow-none"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={selectedStock} onValueChange={setSelectedStock}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedStockLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {selectedStockLabel ? (
                <span
                  onPointerDown={(event) =>
                    handleFilterIconPointerDown(event, () =>
                      setSelectedStock("all"),
                    )
                  }
                  className="inline-flex size-4 cursor-pointer items-center justify-center">
                  <X size={15} color="#616669" strokeWidth={2.5} />
                </span>
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Stock</span>
              {selectedStockLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedStockLabel}</span>
                </>
              ) : null}
            </div>
          </SelectTrigger>
          <SelectContent
            align="start"
            position="popper"
            side="bottom"
            sideOffset={6}
            className={simpleDropdownClass}>
            <SelectItem className={selectItemClass} value="all">
              All stock
            </SelectItem>
            <SelectItem className={selectItemClass} value="In stock">
              In stock
            </SelectItem>
            <SelectItem className={selectItemClass} value="Low stock">
              Low stock
            </SelectItem>
            <SelectItem className={selectItemClass} value="Out of stock">
              Out of stock
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTaille} onValueChange={setSelectedTaille}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedTailleLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {selectedTailleLabel ? (
                <span
                  onPointerDown={(event) =>
                    handleFilterIconPointerDown(event, () =>
                      setSelectedTaille("all"),
                    )
                  }
                  className="inline-flex size-4 cursor-pointer items-center justify-center">
                  <X size={15} color="#616669" strokeWidth={2.5} />
                </span>
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Taille</span>
              {selectedTailleLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedTailleLabel}</span>
                </>
              ) : null}
            </div>
          </SelectTrigger>
          <SelectContent
            align="start"
            position="popper"
            side="bottom"
            sideOffset={6}
            className={simpleDropdownClass}>
            <SelectItem className={selectItemClass} value="all">
              Toutes les tailles
            </SelectItem>
            {tailleOptions.map((taille) => (
              <SelectItem
                key={taille}
                className={selectItemClass}
                value={taille}>
                {taille}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedCategoryLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {selectedCategoryLabel ? (
                <span
                  onPointerDown={(event) =>
                    handleFilterIconPointerDown(event, () =>
                      setSelectedCategory("all"),
                    )
                  }
                  className="inline-flex size-4 cursor-pointer items-center justify-center">
                  <X size={15} color="#616669" strokeWidth={2.5} />
                </span>
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Categorie</span>
              {selectedCategoryLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">
                    {selectedCategoryLabel}
                  </span>
                </>
              ) : null}
            </div>
          </SelectTrigger>
          <SelectContent
            align="start"
            position="popper"
            side="bottom"
            sideOffset={6}
            className={simpleDropdownClass}>
            <SelectItem className={selectItemClass} value="all">
              Toutes les categories
            </SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem
                key={category}
                className={selectItemClass}
                value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ProductsDataTable
        data={products}
        searchQuery={deferredSearchQuery}
        selectedStock={selectedStock}
        selectedTaille={selectedTaille}
        selectedCategory={selectedCategory}
      />
    </section>
  );
}
