"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Hash,
  ImageUp,
  Package,
  Palette,
  Plus,
  Users,
  X,
} from "lucide-react";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { CompactStockColorCard } from "@/app/(admin)/admin/products/create-product/compact-stock-color-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const adminInputClass =
  "h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const adminLabelClass = "text-sm font-medium text-[#081c16]";

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

function revokeMediaItems(mediaItems = []) {
  mediaItems.forEach((mediaItem) => {
    if (mediaItem?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(mediaItem.previewUrl);
    }
  });
}

function sanitizeCountInput(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function parseCount(value) {
  return Number.parseInt(String(value || "0"), 10) || 0;
}

function formatPieceLabel(value) {
  return `${value} piece${value > 1 ? "s" : ""}`;
}

function sizeRowHasContent(sizeRow) {
  return (
    sizeRow.size.trim() ||
    sizeRow.quantity !== "" ||
    SHOP_OWNERS.some((owner) => String(sizeRow.owners?.[owner] ?? "") !== "")
  );
}

function createOwnerSplit() {
  return Object.fromEntries(SHOP_OWNERS.map((owner) => [owner, ""]));
}

let sizeRowIdCounter = 0;

function createSizeRow(defaultSize = "") {
  sizeRowIdCounter += 1;

  return {
    id: `restock-size-row-${sizeRowIdCounter}`,
    size: defaultSize,
    quantity: "",
    owners: createOwnerSplit(),
  };
}

export function ProductRestockForm({ productId }) {
  const router = useRouter();

  const [productTitle, setProductTitle] = React.useState("");
  const [currentAvailableQuantity, setCurrentAvailableQuantity] = React.useState(
    "0",
  );
  const [existingColors, setExistingColors] = React.useState([]);
  const [currentStockByColor, setCurrentStockByColor] = React.useState({});

  const [quantity, setQuantity] = React.useState("");
  const [note, setNote] = React.useState("");
  const [colorInput, setColorInput] = React.useState("");
  const [colors, setColors] = React.useState([]);
  const [stockByColor, setStockByColor] = React.useState({});
  const [mediaByColor, setMediaByColor] = React.useState({});
  const [uploadingColors, setUploadingColors] = React.useState({});
  const [mediaError, setMediaError] = React.useState("");

  const [isLoadingProduct, setIsLoadingProduct] = React.useState(true);
  const [productLoadError, setProductLoadError] = React.useState("");
  const [validationFeedback, setValidationFeedback] = React.useState(null);
  const [submitError, setSubmitError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const mediaByColorRef = React.useRef(mediaByColor);

  const totalQuantityValue = parseCount(quantity);
  const currentTotalQuantityValue = parseCount(currentAvailableQuantity);
  const newColors = colors.filter((color) => !existingColors.includes(color));
  const hasUploadingMedia = Object.values(uploadingColors).some(Boolean);

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
        (ownerSum, owner) => ownerSum + parseCount(entry.owners?.[owner]),
        0,
      ),
    0,
  );
  const projectedAvailableQuantity = currentTotalQuantityValue + totalDetailedQuantity;

  React.useEffect(() => {
    mediaByColorRef.current = mediaByColor;
  }, [mediaByColor]);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadProduct() {
      setIsLoadingProduct(true);
      setProductLoadError("");
      setSubmitError("");
      setValidationFeedback(null);

      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load product.");
        }

        if (isCancelled) {
          return;
        }

        const product = result.product;

        setProductTitle(product.title ?? "");
        setCurrentAvailableQuantity(product.quantity ?? "0");
        setExistingColors(product.colors ?? []);
        setCurrentStockByColor(product.stockByColor ?? {});
      } catch (error) {
        if (!isCancelled) {
          setProductLoadError(
            error instanceof Error ? error.message : "Failed to load product.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProduct(false);
        }
      }
    }

    loadProduct();

    return () => {
      isCancelled = true;
    };
  }, [productId]);

  React.useEffect(() => {
    setValidationFeedback(null);
    setSubmitError("");
  }, [quantity, note, colors, stockByColor, mediaByColor]);

  React.useEffect(() => {
    return () => {
      Object.values(mediaByColorRef.current).forEach(revokeMediaItems);
    };
  }, []);

  function addColorSection(nextColor) {
    const normalizedColor = String(nextColor || "").trim();

    if (!normalizedColor || colors.includes(normalizedColor)) {
      return;
    }

    setColors((currentColors) => [...currentColors, normalizedColor]);
    setStockByColor((currentStockByColorState) => ({
      ...currentStockByColorState,
      [normalizedColor]: [createSizeRow()],
    }));
    setMediaByColor((currentMediaByColor) => ({
      ...currentMediaByColor,
      [normalizedColor]: [],
    }));
  }

  function handleAddColor() {
    addColorSection(colorInput);
    setColorInput("");
  }

  function handleRemoveColor(colorToRemove) {
    setMediaError("");
    setColors((currentColors) =>
      currentColors.filter((color) => color !== colorToRemove),
    );

    setStockByColor((currentStockByColorState) => {
      const nextStockByColor = { ...currentStockByColorState };
      delete nextStockByColor[colorToRemove];
      return nextStockByColor;
    });

    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[colorToRemove]);
      const nextMediaByColor = { ...currentMediaByColor };
      delete nextMediaByColor[colorToRemove];
      return nextMediaByColor;
    });

    setUploadingColors((currentUploadingColors) => {
      const nextUploadingColors = { ...currentUploadingColors };
      delete nextUploadingColors[colorToRemove];
      return nextUploadingColors;
    });
  }

  function handleColorInputKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleAddColor();
  }

  function handleAddSizeRow(color, defaultSize = "") {
    setStockByColor((currentStockByColorState) => ({
      ...currentStockByColorState,
      [color]: [
        ...(currentStockByColorState[color] ?? []),
        createSizeRow(defaultSize),
      ],
    }));
  }

  function handleRemoveSizeRow(color, sizeRowId) {
    setStockByColor((currentStockByColorState) => ({
      ...currentStockByColorState,
      [color]: (currentStockByColorState[color] ?? []).filter(
        (sizeRow) => sizeRow.id !== sizeRowId,
      ),
    }));
  }

  function handleSizeRowFieldChange(color, sizeRowId, field, value) {
    setStockByColor((currentStockByColorState) => ({
      ...currentStockByColorState,
      [color]: (currentStockByColorState[color] ?? []).map((sizeRow) =>
        sizeRow.id === sizeRowId
          ? {
              ...sizeRow,
              [field]: field === "quantity" ? sanitizeCountInput(value) : value,
            }
          : sizeRow,
      ),
    }));
  }

  function handleSizeRowOwnerChange(color, sizeRowId, owner, value) {
    setStockByColor((currentStockByColorState) => ({
      ...currentStockByColorState,
      [color]: (currentStockByColorState[color] ?? []).map((sizeRow) =>
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

  async function handleMediaChange(color, event) {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    setMediaError("");
    setUploadingColors((currentUploadingColors) => ({
      ...currentUploadingColors,
      [color]: true,
    }));

    const previewItems = selectedFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      url: "",
      publicId: "",
      isUploading: true,
    }));

    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[color]);
      return {
        ...currentMediaByColor,
        [color]: previewItems,
      };
    });

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload/cloudinary", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Upload failed.");
      }

      const uploadedFiles = result.files || [];

      setMediaByColor((currentMediaByColor) => ({
        ...currentMediaByColor,
        [color]: uploadedFiles.map((file, index) => ({
          id: `${file.publicId}-${index}`,
          name: file.name,
          previewUrl: file.url,
          url: file.url,
          publicId: file.publicId,
          isUploading: false,
        })),
      }));
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Upload failed.");

      setMediaByColor((currentMediaByColor) => {
        revokeMediaItems(currentMediaByColor[color]);
        return {
          ...currentMediaByColor,
          [color]: [],
        };
      });
    } finally {
      setUploadingColors((currentUploadingColors) => ({
        ...currentUploadingColors,
        [color]: false,
      }));

      event.target.value = "";
    }
  }

  function handleCancelUpload(color) {
    setMediaError("");

    setMediaByColor((currentMediaByColor) => {
      revokeMediaItems(currentMediaByColor[color]);
      return {
        ...currentMediaByColor,
        [color]: [],
      };
    });
  }

  function validateRestockDraft() {
    const errors = [];

    if (hasUploadingMedia) {
      errors.push("Attendez la fin des uploads d'images avant de valider.");
    }

    if (quantity === "") {
      errors.push("Entrez la quantite a ajouter.");
    } else if (totalQuantityValue <= 0) {
      errors.push("Entrez une quantite a ajouter superieure a 0.");
    }

    if (!colors.length) {
      errors.push("Ajoutez au moins une couleur a reapprovisionner.");
    }

    colors.forEach((color) => {
      const activeSizeRows = (stockByColor[color] ?? []).filter(
        sizeRowHasContent,
      );

      if (!activeSizeRows.length) {
        errors.push(`${color}: ajoutez au moins une taille.`);
        return;
      }

      activeSizeRows.forEach((sizeRow, index) => {
        const rowQuantity = parseCount(sizeRow.quantity);
        const rowOwnerTotal = SHOP_OWNERS.reduce(
          (sum, owner) => sum + parseCount(sizeRow.owners?.[owner]),
          0,
        );
        const rowLabel = sizeRow.size.trim()
          ? `${color} / ${sizeRow.size.trim()}`
          : `${color} / ligne ${index + 1}`;

        if (!sizeRow.size.trim()) {
          errors.push(`${color}: une ligne de stock n'a pas de taille.`);
        }

        if (sizeRow.quantity === "") {
          errors.push(`${rowLabel}: entrez une quantite.`);
          return;
        }

        if (rowQuantity <= 0) {
          errors.push(`${rowLabel}: entrez une quantite superieure a 0.`);
          return;
        }

        if (rowOwnerTotal > rowQuantity) {
          errors.push(
            `${rowLabel}: la repartition proprietaire depasse la quantite de ${
              rowOwnerTotal - rowQuantity
            }.`,
          );
        } else if (rowOwnerTotal < rowQuantity) {
          errors.push(
            `${rowLabel}: il manque ${
              rowQuantity - rowOwnerTotal
            } piece(s) dans la repartition proprietaire.`,
          );
        }
      });
    });

    if (totalDetailedQuantity > totalQuantityValue) {
      errors.push(
        `Le detail a ajouter (${totalDetailedQuantity}) depasse la quantite totale (${totalQuantityValue}).`,
      );
    } else if (totalDetailedQuantity < totalQuantityValue) {
      errors.push(
        `Il manque ${
          totalQuantityValue - totalDetailedQuantity
        } piece(s) pour atteindre la quantite totale (${totalQuantityValue}).`,
      );
    }

    return errors;
  }

  function handleValidateRestock() {
    const errors = validateRestockDraft();

    if (errors.length) {
      setValidationFeedback({
        type: "error",
        title: "L'ajout de stock ne peut pas etre valide.",
        messages: errors,
      });
      return;
    }

    setValidationFeedback({
      type: "success",
      title: "Ajout de stock valide.",
      messages: [
        "Les quantites a ajouter, les tailles et la repartition des proprietaires sont coherentes.",
      ],
    });
  }

  async function handleSaveRestock() {
    setSubmitError("");

    const errors = validateRestockDraft();

    if (errors.length) {
      setValidationFeedback({
        type: "error",
        title: "L'ajout de stock ne peut pas etre valide.",
        messages: errors,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/products/${productId}/restock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity,
          note,
          colors,
          stockByColor,
          mediaByColor,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.details?.join(" | ") ||
            result?.error ||
            "Failed to add stock.",
        );
      }

      router.replace("/admin/products");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to add stock.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        <h3 className="text-3xl font-bold">Add stock</h3>
      </div>

      <Separator />

      {productLoadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {productLoadError}
        </div>
      ) : null}

      {isLoadingProduct ? (
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-base font-semibold text-[#081c16]">
            <Spinner size="md" className="text-[#081c16]" />
            <span>Chargement du produit...</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Les informations du produit et son stock actuel sont en cours de
            chargement.
          </p>
        </div>
      ) : null}

      {!isLoadingProduct && !productLoadError ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
              <Package size={18} color="#081c16" strokeWidth={2.4} />
              Produit
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm font-medium text-slate-500">Titre</div>
                <div className="mt-1 text-lg font-semibold text-[#081c16]">
                  {productTitle || "--"}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Cette page ajoute du stock au produit existant. Le stock deja
                  present n&apos;est jamais remplace.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm font-medium text-slate-500">
                  Stock disponible actuel
                </div>
                <div className="mt-2 text-3xl font-bold text-[#081c16]">
                  {currentTotalQuantityValue}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-sm font-medium text-slate-500">
                  Stock disponible projete
                </div>
                <div className="mt-2 text-3xl font-bold text-[#081c16]">
                  {projectedAvailableQuantity}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
              <Users size={18} color="#081c16" strokeWidth={2.4} />
              Stock actuel
            </div>

            {existingColors.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {existingColors.map((color) => {
                  const rows = currentStockByColor[color] ?? [];
                  const colorTotal = rows.reduce(
                    (sum, row) => sum + parseCount(row.quantity),
                    0,
                  );

                  return (
                    <div
                      key={`current-${color}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#081c16]">
                          {color}
                        </span>
                        <span className="text-sm font-semibold text-[#081c16]">
                          {formatPieceLabel(colorTotal)}
                        </span>
                      </div>

                      {rows.length ? (
                        <div className="mt-4 flex flex-col gap-3">
                          {rows.map((row) => {
                            const ownerBadges = SHOP_OWNERS.filter(
                              (owner) => parseCount(row.owners?.[owner]) > 0,
                            );

                            return (
                              <div
                                key={`current-${color}-${row.id}`}
                                className="rounded-2xl border border-white bg-white p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-[#081c16]">
                                    {row.size || "Sans taille"}
                                  </span>
                                  <span className="text-sm font-semibold text-[#081c16]">
                                    {formatPieceLabel(parseCount(row.quantity))}
                                  </span>
                                </div>

                                {ownerBadges.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {ownerBadges.map((owner) => (
                                      <span
                                        key={`current-${color}-${row.id}-${owner}`}
                                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ownerBadgeClassByName[owner]}`}>
                                        {owner}: {parseCount(row.owners?.[owner])}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-xs text-slate-500">
                                    Aucun stock disponible par proprietaire sur
                                    cette ligne.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">
                          Aucune ligne de stock disponible pour cette couleur.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                Aucune couleur ni aucun stock disponible pour ce produit pour le
                moment.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
              <Hash size={18} color="#081c16" strokeWidth={2.4} />
              Quantite a ajouter
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-3">
                <Label htmlFor="restock-quantity" className={adminLabelClass}>
                  Quantite totale a ajouter
                </Label>
                <Input
                  id="restock-quantity"
                  type="number"
                  min="0"
                  value={quantity}
                  inputMode="numeric"
                  onChange={(event) =>
                    setQuantity(sanitizeCountInput(event.target.value))
                  }
                  placeholder="Ex: 12"
                  className={adminInputClass}
                />
                <p className="text-xs leading-5 text-slate-500">
                  Saisissez uniquement la nouvelle quantite recue. Le systeme
                  l&apos;ajoutera au dernier stock en base.
                </p>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="restock-note" className={adminLabelClass}>
                  Note de reapprovisionnement
                </Label>
                <Input
                  id="restock-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex: Arrivage fournisseur avril"
                  className={adminInputClass}
                />
                <p className="text-xs leading-5 text-slate-500">
                  Cette note sera enregistree dans l&apos;historique des
                  mouvements de stock.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
              <Palette size={18} color="#081c16" strokeWidth={2.4} />
              Couleurs a reapprovisionner
            </div>

            {existingColors.length ? (
              <div className="grid gap-3">
                <Label className={adminLabelClass}>Couleurs existantes</Label>
                <div className="flex flex-wrap gap-2">
                  {existingColors.map((color) => (
                    <Button
                      key={`existing-color-${color}`}
                      type="button"
                      variant="outline"
                      onClick={() => addColorSection(color)}
                      disabled={colors.includes(color)}
                      className="h-9 rounded-full border-slate-200 px-4 text-sm text-[#081c16] hover:bg-slate-50">
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="restock-color" className={adminLabelClass}>
                  Ajouter une couleur
                </Label>
                <Input
                  id="restock-color"
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
                    key={`restock-chip-${color}`}
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
                Ajoutez d&apos;abord les couleurs a reapprovisionner. Vous
                pourrez reutiliser des couleurs existantes ou creer de nouvelles
                couleurs.
              </div>
            )}
          </div>

          {newColors.length ? (
            <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
                  <ImageUp size={18} color="#081c16" strokeWidth={2.2} />
                  Images des nouvelles couleurs
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-500">
                  Televersez des images seulement pour les nouvelles couleurs
                  ajoutees ici. Les couleurs deja existantes gardent leurs
                  images actuelles.
                </p>
              </div>

              {mediaError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {mediaError}
                </div>
              ) : null}

              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                }}>
                {newColors.map((color) => {
                  const inputId = `restock-media-${color}`;
                  const files = mediaByColor[color] ?? [];
                  const isUploading = uploadingColors[color];

                  return (
                    <div
                      key={`restock-media-${color}`}
                      className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full bg-[#081c16]" />
                          <span className="text-sm font-semibold text-[#081c16]">
                            {color}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {isUploading ? (
                            <span className="flex items-center gap-2">
                              <Spinner size="sm" className="text-[#616669]" />
                              <span>Upload en cours...</span>
                            </span>
                          ) : files.length ? (
                            `${files.length} image${files.length > 1 ? "s" : ""}`
                          ) : (
                            "Aucune image"
                          )}
                        </span>
                      </div>

                      {!files.length ? (
                        <label
                          htmlFor={inputId}
                          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center transition-colors hover:border-slate-300 hover:bg-slate-50">
                          <ImageUp size={18} color="#081c16" strokeWidth={2.2} />
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
                          disabled={isUploading}
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
                        disabled={isUploading}
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
            </div>
          ) : null}

          <div className="flex flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
                <Users size={18} color="#081c16" strokeWidth={2.4} />
                Stock a ajouter par couleur
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                Entrez uniquement les nouvelles quantites. Si une couleur, une
                taille ou un proprietaire existe deja, le systeme ajoutera ce
                stock au dernier etat en base.
              </p>
            </div>

            {colors.length ? (
              <div className="grid gap-4">
                {colors.map((color) => (
                  <CompactStockColorCard
                    key={`restock-card-${color}`}
                    adminInputClass={adminInputClass}
                    color={color}
                    commonSizeOptions={commonSizeOptions}
                    onAddSizeRow={handleAddSizeRow}
                    onRemoveSizeRow={handleRemoveSizeRow}
                    onSizeRowFieldChange={handleSizeRowFieldChange}
                    onSizeRowOwnerChange={handleSizeRowOwnerChange}
                    ownerBadgeClassByName={ownerBadgeClassByName}
                    sizeRows={stockByColor[color] ?? []}
                    validationHintText="Le controle du stock se fera quand vous validerez l'ajout de stock."
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#081c16]">
                    Aucune couleur a reapprovisionner pour le moment
                  </p>
                  <p className="max-w-xl text-sm leading-6 text-slate-500">
                    Ajoutez une couleur existante ou une nouvelle couleur pour
                    commencer a saisir le stock entrant.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Quantite a ajouter
                </p>
                <p className="mt-2 text-2xl font-bold text-[#081c16]">
                  {quantity === "" ? "--" : totalQuantityValue}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Detail ajoute
                </p>
                <p className="mt-2 text-2xl font-bold text-[#081c16]">
                  {totalDetailedQuantity}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Ajout attribue
                </p>
                <p className="mt-2 text-2xl font-bold text-[#081c16]">
                  {totalAllocatedQuantity}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-[#081c16]">
                  Validation de l&apos;ajout
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  Le stock saisi ici sera ajoute au dernier stock en base sans
                  ecraser les quantites existantes.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleValidateRestock}
                  className="h-11 rounded-xl bg-[#081c16] px-5 text-sm font-semibold text-white hover:bg-[#081c16]/90">
                  Valider l&apos;ajout
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveRestock}
                  disabled={isSubmitting || hasUploadingMedia}
                  className="h-11 rounded-xl bg-[#081c16] px-5 text-sm font-semibold text-white hover:bg-[#081c16]/90 disabled:opacity-60">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" className="text-white" />
                      <span>Ajout...</span>
                    </span>
                  ) : (
                    "Ajouter le stock"
                  )}
                </Button>
              </div>
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

            {submitError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
