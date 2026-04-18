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
  Users,
  X,
} from "lucide-react";

import { products } from "@/app/(admin)/admin/products/data";
import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { CompactStockColorCard } from "@/app/(admin)/admin/products/create-product/compact-stock-color-card";
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
const ownerBadgeClassByName = {
  Hanane: "border-rose-200 bg-rose-50 text-rose-700",
  Warda: "border-amber-200 bg-amber-50 text-amber-700",
  Amina: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const commonSizeOptions = [
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
  "52",
  "54",
  "S",
  "M",
  "L",
  "XL",
  "Unique",
];

const categoryOptions = [...new Set(products.map((product) => product.category))];

function revokeMediaItems(mediaItems = []) {
  mediaItems.forEach((mediaItem) => {
    URL.revokeObjectURL(mediaItem.previewUrl);
  });
}

function sanitizeCountInput(value) {
  return value.replace(/[^\d]/g, "");
}

function parseCount(value) {
  return Number.parseInt(value || "0", 10) || 0;
}

function formatPieceLabel(value) {
  return `${value} piece${value > 1 ? "s" : ""}`;
}

function sizeRowHasContent(sizeRow) {
  return (
    sizeRow.size.trim() ||
    sizeRow.quantity !== "" ||
    SHOP_OWNERS.some((owner) => sizeRow.owners[owner] !== "")
  );
}

function createOwnerSplit() {
  return Object.fromEntries(SHOP_OWNERS.map((owner) => [owner, ""]));
}

let sizeRowIdCounter = 0;

function createSizeRow(defaultSize = "") {
  sizeRowIdCounter += 1;

  return {
    id: `size-row-${sizeRowIdCounter}`,
    size: defaultSize,
    quantity: "",
    owners: createOwnerSplit(),
  };
}

export default function CreateProductPage() {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [oldPrice, setOldPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [colorInput, setColorInput] = React.useState("");
  const [colors, setColors] = React.useState([]);
  const [stockByColor, setStockByColor] = React.useState({});
  const [mediaByColor, setMediaByColor] = React.useState({});
  const [validationFeedback, setValidationFeedback] = React.useState(null);
  const mediaByColorRef = React.useRef(mediaByColor);
  const priceValue = parseCount(price);
  const oldPriceValue = parseCount(oldPrice);
  const totalQuantityValue = parseCount(quantity);
  const stockEntries = colors.flatMap((color) =>
    (stockByColor[color] ?? []).map((sizeRow) => ({
      color,
      ...sizeRow,
    })),
  );
  const totalDetailedQuantity = stockEntries.reduce(
    (sum, entry) => sum + parseCount(entry.quantity),
    0,
  );
  const totalAllocatedQuantity = stockEntries.reduce(
    (sum, entry) =>
      sum +
      SHOP_OWNERS.reduce(
        (ownerSum, owner) => ownerSum + parseCount(entry.owners[owner]),
        0,
      ),
    0,
  );
  const quantityDifference = totalQuantityValue - totalDetailedQuantity;
  const allocationDifference = totalDetailedQuantity - totalAllocatedQuantity;
  const hasDefinedTotalQuantity = quantity !== "";
  const ownerSummaries = SHOP_OWNERS.map((owner) => {
    const items = stockEntries
      .map((entry) => ({
        id: entry.id,
        color: entry.color,
        size: entry.size.trim(),
        quantity: parseCount(entry.owners[owner]),
      }))
      .filter((item) => item.quantity > 0);

    return {
      owner,
      items,
      total: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  });

  let quantityStatusClass =
    "border-slate-200 bg-slate-50 text-slate-500";
  let quantityStatusText =
    "Le controle du total se fera quand vous validerez le produit.";

  let allocationStatusClass =
    "border-slate-200 bg-slate-50 text-slate-500";
  let allocationStatusText =
    "Le controle de repartition par proprietaire se fera a la validation.";

  React.useEffect(() => {
    mediaByColorRef.current = mediaByColor;
  }, [mediaByColor]);

  React.useEffect(() => {
    setValidationFeedback(null);
  }, [title, category, price, oldPrice, quantity, colors, stockByColor]);

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
    setStockByColor((currentStockByColor) => ({
      ...currentStockByColor,
      [normalizedColor]: [createSizeRow()],
    }));
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
    setStockByColor((currentStockByColor) => {
      const nextStockByColor = { ...currentStockByColor };
      delete nextStockByColor[colorToRemove];
      return nextStockByColor;
    });
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

  function handleAddSizeRow(color, defaultSize = "") {
    setStockByColor((currentStockByColor) => ({
      ...currentStockByColor,
      [color]: [
        ...(currentStockByColor[color] ?? []),
        createSizeRow(defaultSize),
      ],
    }));
  }

  function handleRemoveSizeRow(color, sizeRowId) {
    setStockByColor((currentStockByColor) => ({
      ...currentStockByColor,
      [color]: (currentStockByColor[color] ?? []).filter(
        (sizeRow) => sizeRow.id !== sizeRowId,
      ),
    }));
  }

  function handleSizeRowFieldChange(color, sizeRowId, field, value) {
    setStockByColor((currentStockByColor) => ({
      ...currentStockByColor,
      [color]: (currentStockByColor[color] ?? []).map((sizeRow) =>
        sizeRow.id === sizeRowId
          ? {
              ...sizeRow,
              [field]:
                field === "quantity" ? sanitizeCountInput(value) : value,
            }
          : sizeRow,
      ),
    }));
  }

  function handleSizeRowOwnerChange(color, sizeRowId, owner, value) {
    setStockByColor((currentStockByColor) => ({
      ...currentStockByColor,
      [color]: (currentStockByColor[color] ?? []).map((sizeRow) =>
        sizeRow.id === sizeRowId
          ? {
              ...sizeRow,
              owners: {
                ...sizeRow.owners,
                [owner]: sanitizeCountInput(value),
              },
            }
          : sizeRow,
      ),
    }));
  }

  function validateProductDraft() {
    const errors = [];

    if (!title.trim()) {
      errors.push("Ajoutez le titre du produit.");
    }

    if (!category) {
      errors.push("Selectionnez une categorie.");
    }

    if (priceValue <= 0) {
      errors.push("Entrez un prix superieur a 0.");
    }

    if (oldPrice && oldPriceValue <= 0) {
      errors.push("L'ancien prix doit etre superieur a 0.");
    }

    if (oldPriceValue > 0 && oldPriceValue <= priceValue) {
      errors.push("L'ancien prix doit etre superieur au prix actuel pour afficher une promotion.");
    }

    if (!hasDefinedTotalQuantity || totalQuantityValue <= 0) {
      errors.push("Entrez une quantite totale superieure a 0.");
    }

    if (!colors.length) {
      errors.push("Ajoutez au moins une couleur.");
    }

    colors.forEach((color) => {
      const activeSizeRows = (stockByColor[color] ?? []).filter(sizeRowHasContent);

      if (!activeSizeRows.length) {
        errors.push(`${color}: ajoutez au moins une taille.`);
        return;
      }

      activeSizeRows.forEach((sizeRow, index) => {
        const rowQuantity = parseCount(sizeRow.quantity);
        const rowOwnerTotal = SHOP_OWNERS.reduce(
          (sum, owner) => sum + parseCount(sizeRow.owners[owner]),
          0,
        );
        const rowLabel = sizeRow.size.trim()
          ? `${color} / ${sizeRow.size.trim()}`
          : `${color} / ligne ${index + 1}`;

        if (!sizeRow.size.trim()) {
          errors.push(`${color}: une ligne de stock n'a pas de taille.`);
        }

        if (rowQuantity <= 0) {
          errors.push(`${rowLabel}: entrez une quantite superieure a 0.`);
          return;
        }

        if (rowOwnerTotal > rowQuantity) {
          errors.push(
            `${rowLabel}: la repartition proprietaire depasse la quantite de ${rowOwnerTotal - rowQuantity}.`,
          );
        } else if (rowOwnerTotal < rowQuantity) {
          errors.push(
            `${rowLabel}: il manque ${rowQuantity - rowOwnerTotal} piece(s) dans la repartition proprietaire.`,
          );
        }
      });
    });

    if (hasDefinedTotalQuantity && totalDetailedQuantity > totalQuantityValue) {
      errors.push(
        `Le total des tailles (${totalDetailedQuantity}) depasse la quantite totale (${totalQuantityValue}).`,
      );
    } else if (
      hasDefinedTotalQuantity &&
      totalDetailedQuantity < totalQuantityValue
    ) {
      errors.push(
        `Il manque ${totalQuantityValue - totalDetailedQuantity} piece(s) pour atteindre la quantite totale (${totalQuantityValue}).`,
      );
    }

    return errors;
  }

  function handleValidateProduct() {
    const errors = validateProductDraft();

    if (errors.length) {
      setValidationFeedback({
        type: "error",
        title: "Le produit ne peut pas etre valide pour le stock.",
        messages: errors,
      });
      return;
    }

    setValidationFeedback({
      type: "success",
      title: "Stock valide.",
      messages: [
        "Le total, les tailles et la repartition des proprietaires sont coherents. Le produit est pret a etre enregistre.",
      ],
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
            <Package size={18} color="#081c16" strokeWidth={2.4} />
            Prix et promotion
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-3 self-start">
              <Label htmlFor="product-price" className={adminLabelClass}>
                Prix
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="product-price"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={price}
                  onChange={(event) =>
                    setPrice(sanitizeCountInput(event.target.value))
                  }
                  placeholder="Ex: 18500"
                  className={adminInputClass}
                />
                <span className="shrink-0 text-sm font-medium text-slate-500">
                  DA
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 self-start">
              <Label htmlFor="product-old-price" className={adminLabelClass}>
                Ancien prix
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="product-old-price"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={oldPrice}
                  onChange={(event) =>
                    setOldPrice(sanitizeCountInput(event.target.value))
                  }
                  placeholder="Ex: 22000"
                  className={adminInputClass}
                />
                <span className="shrink-0 text-sm font-medium text-slate-500">
                  DA
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Laissez ce champ vide si le produit n&apos;est pas en promotion.
              </p>
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
              inputMode="numeric"
              onChange={(event) =>
                setQuantity(sanitizeCountInput(event.target.value))
              }
              placeholder="Ex: 20"
              className={adminInputClass}
            />
            <p className="text-xs leading-5 text-slate-500">
              Commencez par le total, puis detaillez les couleurs et les tailles
              juste en dessous.
            </p>
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
                  className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-[#081c16]">
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
              Ajoutez d&apos;abord les couleurs du produit. Chaque couleur ouvrira sa
              propre carte de stock.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
              <Users size={18} color="#081c16" strokeWidth={2.4} />
              Stock rapide par couleur
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Chaque couleur contient maintenant des lignes compactes: taille,
              total, Warda, Hanane et Amina sur la meme ligne. Les boutons de
              tailles rapides servent a ajouter les lignes les plus courantes.
            </p>
          </div>

          {colors.length ? (
            <div className="grid gap-4">
              {colors.map((color) => (
                <CompactStockColorCard
                  key={color}
                  adminInputClass={adminInputClass}
                  color={color}
                  commonSizeOptions={commonSizeOptions}
                  onAddSizeRow={handleAddSizeRow}
                  onRemoveSizeRow={handleRemoveSizeRow}
                  onSizeRowFieldChange={handleSizeRowFieldChange}
                  onSizeRowOwnerChange={handleSizeRowOwnerChange}
                  ownerBadgeClassByName={ownerBadgeClassByName}
                  sizeRows={stockByColor[color] ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#081c16]">
                  Aucune couleur pour le moment
                </p>
                <p className="max-w-xl text-sm leading-6 text-slate-500">
                  Ajoutez d&apos;abord les couleurs du produit. Ensuite chaque
                  couleur aura sa ligne de tailles et de proprietaires.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Quantite totale
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#081c16]">
                    {hasDefinedTotalQuantity ? totalQuantityValue : "--"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Detail stock
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#081c16]">
                    {totalDetailedQuantity}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Stock attribue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#081c16]">
                    {totalAllocatedQuantity}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${quantityStatusClass}`}>
                  {quantityStatusText}
                </div>
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${allocationStatusClass}`}>
                  {allocationStatusText}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#081c16]">
                  Resume par proprietaire
                </div>
                <div className="text-xs text-slate-500">
                  Par couleur et par taille
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {ownerSummaries.map((summary) => (
                  <div
                    key={summary.owner}
                    className="rounded-2xl border border-white bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ownerBadgeClassByName[summary.owner]}`}>
                        {summary.owner}
                      </span>
                      <span className="text-sm font-semibold text-[#081c16]">
                        {formatPieceLabel(summary.total)}
                      </span>
                    </div>

                    {summary.items.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.items.map((item) => (
                          <span
                            key={`${summary.owner}-${item.id}`}
                            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-[#081c16]">
                            {item.quantity} x {item.color || "Sans couleur"} /{" "}
                            {item.size || "Sans taille"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        Aucune piece attribuee pour le moment.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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

        <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-[#081c16]">
                Validation du produit
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Les erreurs de stock s&apos;affichent seulement ici, au moment de
                valider le produit.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleValidateProduct}
              className="h-11 rounded-xl bg-[#081c16] px-5 text-sm font-semibold text-white hover:bg-[#081c16]/90">
              Valider le produit
            </Button>
          </div>

          {validationFeedback ? (
            <div
              className={`rounded-2xl border px-4 py-4 ${
                validationFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}>
              <div
                className={`text-sm font-semibold ${
                  validationFeedback.type === "success"
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}>
                {validationFeedback.title}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {validationFeedback.messages.map((message) => (
                  <p
                    key={message}
                    className={`text-sm leading-6 ${
                      validationFeedback.type === "success"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}>
                    {message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
