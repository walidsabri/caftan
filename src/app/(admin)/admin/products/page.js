"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { ProductsDataTable } from "./products-data-table";

export default function ProductsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [products, setProducts] = React.useState([]);
  const [assigneeOptions, setAssigneeOptions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeAction, setActiveAction] = React.useState(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = React.useState(null);
  const [pageError, setPageError] = React.useState("");
  const [pageSuccess, setPageSuccess] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedAssignee, setSelectedAssignee] = React.useState("all");
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

  const selectedStatusLabel = selectedStatus === "all" ? null : selectedStatus;
  const selectedAssigneeLabel =
    selectedAssignee === "all" ? null : selectedAssignee;
  const selectedCategoryLabel =
    selectedCategory === "all" ? null : selectedCategory;

  const categoryOptions = [
    ...new Set(products.map((product) => product.category)),
  ];

  React.useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      setPageError("");
      setPageSuccess("");

      const [productsResponse, stockOwnersResponse] = await Promise.all([
        supabase
          .from("products")
          .select(
            `
            id,
            name,
            slug,
            price,
            old_price,
            cover_image_url,
            is_active,
            created_at,
            categories (
              name
            ),
            product_variants (
              variant_inventory (
                quantity,
                stock_owners (
                  name
                )
              )
            )
          `,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("stock_owners")
          .select("name")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (productsResponse.error || stockOwnersResponse.error) {
        setPageError(
          productsResponse.error?.message ||
            stockOwnersResponse.error?.message ||
            "Failed to load products.",
        );
        setIsLoading(false);
        return;
      }

      const mappedProducts = (productsResponse.data || []).map((product) => {
        const assignedOwners = Array.from(
          new Set(
            (product.product_variants ?? []).flatMap((variant) =>
              (variant.variant_inventory ?? [])
                .filter((inventoryRow) => Number(inventoryRow.quantity) > 0)
                .map((inventoryRow) => inventoryRow.stock_owners?.name)
                .filter(Boolean),
            ),
          ),
        ).sort((firstOwner, secondOwner) =>
          firstOwner.localeCompare(secondOwner),
        );

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          oldPrice: product.old_price,
          image: product.cover_image_url,
          category: product.categories?.name ?? "Sans categorie",
          status: product.is_active ? "Active" : "Inactive",
          createdAt: product.created_at,
          assignedOwners,
        };
      });

      const nextAssigneeOptions = Array.from(
        new Set([
          ...(stockOwnersResponse.data || [])
            .map((owner) => owner.name?.trim())
            .filter(Boolean),
          ...mappedProducts.flatMap((product) => product.assignedOwners),
        ]),
      ).sort((firstOwner, secondOwner) => firstOwner.localeCompare(secondOwner));

      setProducts(mappedProducts);
      setAssigneeOptions(nextAssigneeOptions);
      setIsLoading(false);
    }

    fetchProducts();
  }, [supabase]);

  React.useEffect(() => {
    if (
      selectedAssignee !== "all" &&
      !assigneeOptions.includes(selectedAssignee)
    ) {
      setSelectedAssignee("all");
    }
  }, [assigneeOptions, selectedAssignee]);

  function handleFilterIconPointerDown(event, clearFilter) {
    event.preventDefault();
    event.stopPropagation();
    clearFilter();
  }

  async function handleToggleProductStatus(product) {
    const nextIsActive = product.status !== "Active";

    setActiveAction({
      productId: product.id,
      type: "toggle-status",
    });
    setPageError("");
    setPageSuccess("");

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextIsActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update product status.");
      }

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? {
                ...currentProduct,
                status: result.product?.is_active ? "Active" : "Inactive",
              }
            : currentProduct,
        ),
      );
      setPageSuccess("Statut du produit mis a jour.");
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update product status.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  function handleDeleteDialogOpenChange(nextOpen) {
    if (activeAction?.type === "delete") {
      return;
    }

    if (!nextOpen) {
      setPendingDeleteProduct(null);
    }
  }

  function handleDeleteProduct(product) {
    setPendingDeleteProduct(product);
  }

  async function handleConfirmDeleteProduct() {
    if (!pendingDeleteProduct) {
      return;
    }

    setActiveAction({
      productId: pendingDeleteProduct.id,
      type: "delete",
    });
    setPageError("");
    setPageSuccess("");

    try {
      const response = await fetch(
        `/api/admin/products/${pendingDeleteProduct.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete product.");
      }

      setProducts((currentProducts) =>
        currentProducts.filter(
          (currentProduct) => currentProduct.id !== pendingDeleteProduct.id,
        ),
      );
      setPendingDeleteProduct(null);
      setPageSuccess("Produit supprime avec succes.");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to delete product.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !deferredSearchQuery ||
      product.name.toLowerCase().includes(deferredSearchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || product.status === selectedStatus;

    const matchesAssignee =
      selectedAssignee === "all" ||
      product.assignedOwners.includes(selectedAssignee);

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesAssignee && matchesCategory;
  });

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

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      {pageSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {pageSuccess}
        </div>
      ) : null}

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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedStatusLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {selectedStatusLabel ? (
                <span
                  onPointerDown={(event) =>
                    handleFilterIconPointerDown(event, () =>
                      setSelectedStatus("all"),
                    )
                  }
                  className="inline-flex size-4 cursor-pointer items-center justify-center">
                  <X size={15} color="#616669" strokeWidth={2.5} />
                </span>
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Status</span>
              {selectedStatusLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedStatusLabel}</span>
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
              Tous les statuts
            </SelectItem>
            <SelectItem className={selectItemClass} value="Active">
              Active
            </SelectItem>
            <SelectItem className={selectItemClass} value="Inactive">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedAssigneeLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {selectedAssigneeLabel ? (
                <span
                  onPointerDown={(event) =>
                    handleFilterIconPointerDown(event, () =>
                      setSelectedAssignee("all"),
                    )
                  }
                  className="inline-flex size-4 cursor-pointer items-center justify-center">
                  <X size={15} color="#616669" strokeWidth={2.5} />
                </span>
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Assignee</span>
              {selectedAssigneeLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedAssigneeLabel}</span>
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
              Tous les assignees
            </SelectItem>
            {assigneeOptions.map((assignee) => (
              <SelectItem
                key={assignee}
                className={selectItemClass}
                value={assignee}>
                {assignee}
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
        data={filteredProducts}
        isLoading={isLoading}
        activeAction={activeAction}
        onToggleProductStatus={handleToggleProductStatus}
        onDeleteProduct={handleDeleteProduct}
      />

      <AlertDialog
        open={Boolean(pendingDeleteProduct)}
        onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader className="gap-3">
            <AlertDialogTitle>
              Supprimer le produit
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteProduct
                ? `Voulez-vous vraiment supprimer "${pendingDeleteProduct.name}" ? Cette action supprimera aussi ses images et son stock lies.`
                : "Cette action est irreversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={activeAction?.type === "delete"}>
              Annuler
            </AlertDialogCancel>

            <Button
              type="button"
              variant="destructive"
              disabled={activeAction?.type === "delete"}
              onClick={handleConfirmDeleteProduct}
              className="rounded-xl">
              {activeAction?.type === "delete"
                ? "Suppression..."
                : "Supprimer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
