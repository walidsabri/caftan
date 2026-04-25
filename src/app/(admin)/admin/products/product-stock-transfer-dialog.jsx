"use client";

import * as React from "react";
import { ArrowRightLeft, Package } from "lucide-react";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const transferCardClass =
  "rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5";
const transferSelectTriggerClass =
  "h-11 w-full rounded-2xl border-slate-200 bg-white px-4 text-left text-sm text-[#081c16] shadow-none focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const transferSelectContentClass =
  "rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm";
const transferSelectItemClass =
  "cursor-pointer rounded-lg px-3 py-2.5 text-sm text-[#081c16] focus:bg-slate-50 focus:text-[#081c16]";
const transferLabelClass = "text-sm font-medium text-[#081c16]";

function compareLabels(firstLabel = "", secondLabel = "") {
  return firstLabel.localeCompare(secondLabel);
}

function sortOwners(ownerOptions = []) {
  return [...ownerOptions].sort((firstOwner, secondOwner) => {
    const firstIndex = SHOP_OWNERS.indexOf(firstOwner.name);
    const secondIndex = SHOP_OWNERS.indexOf(secondOwner.name);

    if (firstIndex !== -1 || secondIndex !== -1) {
      if (firstIndex === -1) return 1;
      if (secondIndex === -1) return -1;
      return firstIndex - secondIndex;
    }

    return compareLabels(firstOwner.name, secondOwner.name);
  });
}

function sanitizeCount(value) {
  return Number.parseInt(String(value ?? "0").replace(/[^\d]/g, ""), 10) || 0;
}

export function ProductStockTransferDialog({
  open,
  product,
  onOpenChange,
  onTransferPendingChange,
  onTransferSuccess,
}) {
  const [transferProduct, setTransferProduct] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [fromOwner, setFromOwner] = React.useState("");
  const [toOwner, setToOwner] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState("");
  const [selectedVariantId, setSelectedVariantId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");

  const resetDialogState = React.useCallback(() => {
    setTransferProduct(null);
    setIsLoading(false);
    setLoadError("");
    setIsSubmitting(false);
    setSubmitError("");
    setFromOwner("");
    setToOwner("");
    setSelectedColor("");
    setSelectedVariantId("");
    setQuantity("");
  }, []);

  React.useEffect(() => {
    if (!open || !product?.id) {
      return;
    }

    let cancelled = false;

    async function loadTransferProduct() {
      setIsLoading(true);
      setLoadError("");
      setSubmitError("");
      setTransferProduct(null);
      setFromOwner("");
      setToOwner("");
      setSelectedColor("");
      setSelectedVariantId("");
      setQuantity("");

      try {
        const response = await fetch(
          `/api/admin/products/${product.id}/transfer-stock`,
          {
            cache: "no-store",
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error || "Impossible de charger le stock de ce produit.",
          );
        }

        if (!cancelled) {
          setTransferProduct(result.product ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger le stock de ce produit.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTransferProduct();

    return () => {
      cancelled = true;
    };
  }, [open, product?.id]);

  const ownerOptions = React.useMemo(
    () => sortOwners(transferProduct?.ownerOptions ?? []),
    [transferProduct],
  );

  const giverOptions = React.useMemo(
    () => ownerOptions.filter((ownerOption) => ownerOption.totalAvailable > 0),
    [ownerOptions],
  );

  const receiverOptions = React.useMemo(
    () => ownerOptions.filter((ownerOption) => ownerOption.name !== fromOwner),
    [fromOwner, ownerOptions],
  );

  const stockRowsForSelectedOwner = React.useMemo(() => {
    if (!fromOwner) {
      return [];
    }

    return (transferProduct?.stockRows ?? []).filter(
      (stockRow) => (stockRow.ownerQuantities?.[fromOwner] ?? 0) > 0,
    );
  }, [fromOwner, transferProduct]);

  const colorOptions = React.useMemo(
    () =>
      Array.from(
        new Set(stockRowsForSelectedOwner.map((stockRow) => stockRow.colorName)),
      ).sort(compareLabels),
    [stockRowsForSelectedOwner],
  );

  const sizeOptions = React.useMemo(() => {
    if (!selectedColor) {
      return [];
    }

    return stockRowsForSelectedOwner
      .filter((stockRow) => stockRow.colorName === selectedColor)
      .sort((firstRow, secondRow) => compareLabels(firstRow.sizeName, secondRow.sizeName));
  }, [selectedColor, stockRowsForSelectedOwner]);

  const selectedStockRow = React.useMemo(
    () =>
      sizeOptions.find((stockRow) => stockRow.variantId === selectedVariantId) ??
      null,
    [selectedVariantId, sizeOptions],
  );

  const availableQuantityForSelectedRow =
    selectedStockRow?.ownerQuantities?.[fromOwner] ?? 0;
  const transferQuantity = sanitizeCount(quantity);

  React.useEffect(() => {
    if (fromOwner && !giverOptions.some((ownerOption) => ownerOption.name === fromOwner)) {
      setFromOwner("");
    }
  }, [fromOwner, giverOptions]);

  React.useEffect(() => {
    if (!toOwner || toOwner === fromOwner) {
      return;
    }

    if (!receiverOptions.some((ownerOption) => ownerOption.name === toOwner)) {
      setToOwner("");
    }
  }, [fromOwner, receiverOptions, toOwner]);

  React.useEffect(() => {
    if (toOwner === fromOwner) {
      setToOwner("");
    }
  }, [fromOwner, toOwner]);

  React.useEffect(() => {
    if (selectedColor && !colorOptions.includes(selectedColor)) {
      setSelectedColor("");
    }
  }, [colorOptions, selectedColor]);

  React.useEffect(() => {
    if (
      selectedVariantId &&
      !sizeOptions.some((stockRow) => stockRow.variantId === selectedVariantId)
    ) {
      setSelectedVariantId("");
    }
  }, [selectedVariantId, sizeOptions]);

  React.useEffect(() => {
    if (
      transferQuantity > 0 &&
      availableQuantityForSelectedRow > 0 &&
      transferQuantity > availableQuantityForSelectedRow
    ) {
      setQuantity(`${availableQuantityForSelectedRow}`);
    }
  }, [availableQuantityForSelectedRow, transferQuantity]);

  function handleDialogOpenChange(nextOpen) {
    if (isSubmitting) {
      return;
    }

    if (!nextOpen) {
      resetDialogState();
    }

    onOpenChange(nextOpen);
  }

  function handleFromOwnerChange(nextOwner) {
    setFromOwner(nextOwner);
    setSelectedColor("");
    setSelectedVariantId("");
    setQuantity("");
    setSubmitError("");
  }

  function handleToOwnerChange(nextOwner) {
    setToOwner(nextOwner);
    setSubmitError("");
  }

  function handleColorChange(nextColor) {
    setSelectedColor(nextColor);
    setSelectedVariantId("");
    setQuantity("");
    setSubmitError("");
  }

  function handleVariantChange(nextVariantId) {
    setSelectedVariantId(nextVariantId);
    setQuantity("");
    setSubmitError("");
  }

  async function handleSubmit() {
    if (!product?.id) {
      return;
    }

    if (!fromOwner || !toOwner) {
      setSubmitError(
        "Choisissez le proprietaire qui donne le stock et celui qui le recoit.",
      );
      return;
    }

    if (!selectedVariantId || !selectedStockRow) {
      setSubmitError("Choisissez une couleur et une taille valides.");
      return;
    }

    if (transferQuantity <= 0) {
      setSubmitError("Entrez une quantite de transfert valide.");
      return;
    }

    if (transferQuantity > availableQuantityForSelectedRow) {
      setSubmitError(
        "La quantite de transfert depasse le stock disponible du proprietaire source.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    onTransferPendingChange?.(true, product.id);

    try {
      const response = await fetch(
        `/api/admin/products/${product.id}/transfer-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromOwnerName: fromOwner,
            toOwnerName: toOwner,
            variantId: selectedVariantId,
            quantity: transferQuantity,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Impossible de transferer le stock.");
      }

      await onTransferSuccess?.(
        result?.message ||
          "Le stock a ete transfere entre les deux proprietaires.",
      );

      resetDialogState();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Impossible de transferer le stock.",
      );
    } finally {
      onTransferPendingChange?.(false, product.id);
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[min(960px,calc(100vw-2rem))] rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:max-w-3xl">
        <DialogHeader className="px-6 py-6 sm:px-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
            <ArrowRightLeft size={18} strokeWidth={2.2} />
            Transferer du stock
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-6 text-[#616669]">
            {product?.name
              ? `Reaffectez le stock interne de "${product.name}" d'un proprietaire vers un autre sans creer un nouveau produit.`
              : "Reaffectez le stock interne d'un proprietaire vers un autre."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-slate-200" />

        <div className="flex flex-col gap-6 px-6 py-6 sm:px-7">
          {isLoading ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm text-slate-500">
              <Spinner size="lg" className="text-[#081c16]" />
              <span>Chargement du stock du produit...</span>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : transferProduct?.stockRows?.length ? (
            <>
              <div className={transferCardClass}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-[#081c16]">
                      {transferProduct.name}
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500">
                      Choisissez le proprietaire source, puis le destinataire.
                      Les couleurs et tailles se filtrent automatiquement selon
                      le stock reel disponible chez le proprietaire source.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ownerOptions.map((ownerOption) => (
                      <span
                        key={`owner-total-${ownerOption.name}`}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {ownerOption.name}: {ownerOption.totalAvailable}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${transferCardClass} grid gap-4 lg:grid-cols-2`}>
                <div className="grid gap-2">
                  <Label className={transferLabelClass}>
                    Proprietaire source
                  </Label>
                  <Select value={fromOwner} onValueChange={handleFromOwnerChange}>
                    <SelectTrigger className={transferSelectTriggerClass}>
                      <span className="truncate">
                        {fromOwner || "Choisir le proprietaire qui donne"}
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={8}
                      className={transferSelectContentClass}>
                      {giverOptions.map((ownerOption) => (
                        <SelectItem
                          key={ownerOption.name}
                          value={ownerOption.name}
                          className={transferSelectItemClass}>
                          {ownerOption.name} ({ownerOption.totalAvailable})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className={transferLabelClass}>
                    Proprietaire destinataire
                  </Label>
                  <Select value={toOwner} onValueChange={handleToOwnerChange}>
                    <SelectTrigger className={transferSelectTriggerClass}>
                      <span className="truncate">
                        {toOwner || "Choisir le proprietaire qui recoit"}
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={8}
                      className={transferSelectContentClass}>
                      {receiverOptions.map((ownerOption) => (
                        <SelectItem
                          key={ownerOption.name}
                          value={ownerOption.name}
                          className={transferSelectItemClass}>
                          {ownerOption.name} ({ownerOption.totalAvailable})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={`${transferCardClass} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]`}>
                <div className="grid gap-2">
                  <Label className={transferLabelClass}>
                    Couleur
                  </Label>
                  <Select value={selectedColor} onValueChange={handleColorChange}>
                    <SelectTrigger className={transferSelectTriggerClass}>
                      <span className="truncate">
                        {selectedColor || "Choisir une couleur"}
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={8}
                      className={transferSelectContentClass}>
                      {colorOptions.map((color) => (
                        <SelectItem
                          key={color}
                          value={color}
                          className={transferSelectItemClass}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className={transferLabelClass}>
                    Taille
                  </Label>
                  <Select value={selectedVariantId} onValueChange={handleVariantChange}>
                    <SelectTrigger className={transferSelectTriggerClass}>
                      <span className="truncate">
                        {selectedStockRow
                          ? `${selectedStockRow.sizeName} (${availableQuantityForSelectedRow})`
                          : "Choisir une taille"}
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={8}
                      className={transferSelectContentClass}>
                      {sizeOptions.map((stockRow) => (
                        <SelectItem
                          key={stockRow.variantId}
                          value={stockRow.variantId}
                          className={transferSelectItemClass}>
                          {stockRow.sizeName} (
                          {stockRow.ownerQuantities?.[fromOwner] ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="transfer-quantity"
                    className={transferLabelClass}>
                    Quantite
                  </Label>
                  <Input
                    id="transfer-quantity"
                    type="number"
                    min="1"
                    max={availableQuantityForSelectedRow || undefined}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => {
                      setQuantity(event.target.value);
                      setSubmitError("");
                    }}
                    placeholder="0"
                    className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10"
                  />
                </div>
              </div>

              {selectedStockRow ? (
                <div className={transferCardClass}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#081c16]">
                    <Package size={16} strokeWidth={2.2} />
                    Stock actuel pour {selectedStockRow.colorName} /{" "}
                    {selectedStockRow.sizeName}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ownerOptions.map((ownerOption) => (
                      <span
                        key={`${selectedStockRow.variantId}-${ownerOption.name}`}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {ownerOption.name}:{" "}
                        {selectedStockRow.ownerQuantities?.[ownerOption.name] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-500">
                  Choisissez d&apos;abord le proprietaire source, puis la couleur
                  et la taille qu&apos;il possede vraiment.
                </div>
              )}

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
              Aucun stock disponible n&apos;est actuellement transferable sur ce
              produit.
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-[28px] border-slate-200 bg-white px-6 py-5 sm:px-7">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleDialogOpenChange(false)}
            className="h-11 rounded-xl border-slate-200 px-5">
            Annuler
          </Button>
          <Button
            type="button"
            disabled={
              isLoading ||
              Boolean(loadError) ||
              !transferProduct?.stockRows?.length ||
              isSubmitting
            }
            onClick={handleSubmit}
            className="h-11 rounded-xl bg-[#081c16] px-5 text-white hover:bg-[#081c16]/90 disabled:opacity-60">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                <span>Transfert...</span>
              </span>
            ) : (
              "Transferer le stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
