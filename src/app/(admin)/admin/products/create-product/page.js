"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Hash,
  ChevronLeft,
  ImageUp,
  Package,
  Palette,
  Plus,
  SwatchBook,
  X,
} from "lucide-react";

import { products } from "@/app/(admin)/admin/products/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const adminInputClass =
  "h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const adminLabelClass = "text-sm font-medium text-[#081c16]";
const adminSelectTriggerClass =
  "h-10 w-full rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none data-placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const adminSelectContentClass =
  "rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm";
const adminSelectItemClass =
  "cursor-pointer rounded-lg px-3 py-2.5 text-sm text-[#081c16] focus:bg-slate-50 focus:text-[#081c16]";

const categoryOptions = [...new Set(products.map((product) => product.category))];

function revokeMediaItems(mediaItems = []) {
  mediaItems.forEach((mediaItem) => {
    URL.revokeObjectURL(mediaItem.previewUrl);
  });
}

export default function CreateProductPage() {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [colorInput, setColorInput] = React.useState("");
  const [colors, setColors] = React.useState(["Noir", "Blanc casse"]);
  const [mediaByColor, setMediaByColor] = React.useState({
    Noir: [],
    "Blanc casse": [],
  });
  const mediaByColorRef = React.useRef(mediaByColor);

  React.useEffect(() => {
    mediaByColorRef.current = mediaByColor;
  }, [mediaByColor]);

  React.useEffect(() => {
    return () => {
      Object.values(mediaByColorRef.current).forEach(revokeMediaItems);
    };
  }, []);

  function handleAddColor() {
    const normalizedColor = colorInput.trim();

    if (!normalizedColor || colors.includes(normalizedColor)) {
      return;
    }

    setColors((currentColors) => [...currentColors, normalizedColor]);
    setMediaByColor((currentMediaByColor) => ({
      ...currentMediaByColor,
      [normalizedColor]: [],
    }));
    setColorInput("");
  }

  function handleRemoveColor(colorToRemove) {
    setColors((currentColors) =>
      currentColors.filter((color) => color !== colorToRemove),
    );
    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[colorToRemove]);
      const nextMediaByColor = { ...currentMediaByColor };
      delete nextMediaByColor[colorToRemove];
      return nextMediaByColor;
    });
  }

  function handleColorInputKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleAddColor();
  }

  function handleMediaChange(color, event) {
    const selectedFiles = Array.from(event.target.files ?? []).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[color]);
      return {
        ...currentMediaByColor,
        [color]: selectedFiles,
      };
    });

    event.target.value = "";
  }

  function handleCancelUpload(color) {
    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[color]);
      return {
        ...currentMediaByColor,
        [color]: [],
      };
    });
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-5 lg:px-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/products"
          className="flex w-fit items-center gap-1 text-sm text-slate-500 transition-colors hover:text-[#081c16]">
          <ChevronLeft size={16} />
          Back to products
        </Link>
        <h3 className="text-3xl font-bold">Create product</h3>
      </div>

      <Separator />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
            <Package size={18} color="#081c16" strokeWidth={2.4} />
            Information de produit
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-3">
              <Label htmlFor="product-title" className={adminLabelClass}>
                Titre
              </Label>
              <Input
                id="product-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titre du produit"
                className={adminInputClass}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="product-category" className={adminLabelClass}>
                Categorie
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  id="product-category"
                  className={adminSelectTriggerClass}>
                  <SelectValue placeholder="Selectionner une categorie" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={6}
                  className={adminSelectContentClass}>
                  {categoryOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className={adminSelectItemClass}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
            <Hash size={18} color="#081c16" strokeWidth={2.4} />
            Quantite
          </div>

          <div className="grid gap-3">
            <Label htmlFor="product-quantity" className={adminLabelClass}>
              Quantite totale
            </Label>
            <Input
              id="product-quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Ex: 20"
              className={adminInputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
            <Palette size={18} color="#081c16" strokeWidth={2.4} />
            Couleurs exist
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="product-color" className={adminLabelClass}>
                Ajouter une couleur
              </Label>
              <Input
                id="product-color"
                value={colorInput}
                onChange={(event) => setColorInput(event.target.value)}
                onKeyDown={handleColorInputKeyDown}
                placeholder="Ex: Rouge bordeaux"
                className={`${adminInputClass} mt-3`}
              />
            </div>

            <Button
              type="button"
              onClick={handleAddColor}
              className="h-10 rounded-xl bg-[#081c16] px-4 text-sm font-semibold text-white hover:bg-[#081c16]/90">
              <Plus size={16} />
              Ajouter
            </Button>
          </div>

          {colors.length ? (
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <div
                  key={color}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#081c16]">
                  <span>{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="inline-flex size-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-[#081c16]">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
              Add product colors first. They will appear here and in the media
              section.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
            <SwatchBook size={18} color="#081c16" strokeWidth={2.4} />
            Media
          </div>

          {colors.length ? (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}>
              {colors.map((color) => {
                const inputId = `media-${color}`;
                const files = mediaByColor[color] ?? [];

                return (
                  <div
                    key={color}
                    className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-[#081c16]" />
                        <span className="text-sm font-semibold text-[#081c16]">
                          {color}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {files.length
                          ? `${files.length} image${files.length > 1 ? "s" : ""}`
                          : "Aucune image"}
                      </span>
                    </div>

                    {!files.length ? (
                      <label
                        htmlFor={inputId}
                        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center transition-colors hover:border-slate-300 hover:bg-slate-50">
                        <ImageUp
                          size={18}
                          color="#081c16"
                          strokeWidth={2.2}
                        />
                        <span className="text-sm font-medium text-[#081c16]">
                          Upload pictures
                        </span>
                        <span className="text-xs text-slate-500">
                          JPG, PNG or WEBP
                        </span>
                      </label>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCancelUpload(color)}
                        className="h-10 w-fit rounded-xl border-slate-200 px-4 text-sm font-semibold text-[#081c16] hover:bg-slate-50">
                        Cancel upload
                      </Button>
                    )}
                    <Input
                      id={inputId}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(event) => handleMediaChange(color, event)}
                      className="hidden"
                    />

                    {files.length ? (
                      <div
                        className="grid w-full gap-3"
                        style={{
                          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        }}>
                        {files.map((file) => (
                          <div
                            key={file.id}
                            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="relative aspect-square bg-slate-100">
                              <Image
                                src={file.previewUrl}
                                alt={file.name}
                                fill
                                unoptimized
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover"
                              />
                            </div>
                            <div className="truncate border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                              {file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
              Add at least one color to unlock the media upload blocks.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
