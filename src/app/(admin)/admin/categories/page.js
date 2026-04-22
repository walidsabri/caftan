"use client";

import * as React from "react";
import { EllipsisVerticalIcon, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const adminInputClass =
  "h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const adminTextareaClass =
  "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#081c16] shadow-none outline-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-3 focus-visible:ring-[#081c16]/10";
const adminLabelClass = "text-sm font-medium text-[#081c16]";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function createEmptyDraft() {
  return {
    name: "",
    description: "",
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createUniqueSlug(
  baseSlug,
  existingCategories,
  currentCategoryId = null,
) {
  const resolvedBaseSlug = baseSlug || "category";

  const existingSlugs = new Set(
    existingCategories
      .filter((category) => category.id !== currentCategoryId)
      .map((category) => category.slug),
  );

  if (!existingSlugs.has(resolvedBaseSlug)) {
    return resolvedBaseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${resolvedBaseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${resolvedBaseSlug}-${suffix}`;
}

function formatCreatedAt(value) {
  return dateFormatter.format(new Date(value));
}

function getStatusClassName(isActive) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-500";
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    active: row.is_active,
    createdAt: row.created_at,
  };
}

export default function CategoriesPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [categories, setCategories] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState("");
  const [pageSuccess, setPageSuccess] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);
  const [draftCategory, setDraftCategory] = React.useState(createEmptyDraft);

  const slugPreview = createUniqueSlug(
    slugify(draftCategory.name),
    categories,
    editingCategoryId,
  );

  React.useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      setPageError("");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setPageError(error.message);
        setIsLoading(false);
        return;
      }

      setCategories((data || []).map(mapCategoryRow));
      setIsLoading(false);
    }

    loadCategories();
  }, [supabase]);

  function resetDialogState() {
    setEditingCategoryId(null);
    setDraftCategory(createEmptyDraft());
  }

  function handleDialogOpenChange(nextOpen) {
    setIsDialogOpen(nextOpen);

    if (!nextOpen) {
      resetDialogState();
    }
  }

  function handleOpenCreateDialog() {
    resetDialogState();
    setIsDialogOpen(true);
  }

  function handleOpenEditDialog(category) {
    setEditingCategoryId(category.id);
    setDraftCategory({
      name: category.name,
      description: category.description ?? "",
    });
    setIsDialogOpen(true);
  }

  function handleDraftFieldChange(field, value) {
    setDraftCategory((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  async function handleDeleteCategory(categoryId) {
    setPageError("");
    setPageSuccess("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      setPageError(
        error.message.includes("violates foreign key constraint")
          ? "Impossible de supprimer cette categorie car elle est deja utilisee par des produits."
          : error.message,
      );
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== categoryId),
    );
    setPageSuccess("Categorie supprimee avec succes.");
  }

  async function handleToggleActive(categoryId) {
    setPageError("");
    setPageSuccess("");

    const target = categories.find((category) => category.id === categoryId);
    if (!target) return;

    const nextValue = !target.active;

    const { data, error } = await supabase
      .from("categories")
      .update({ is_active: nextValue })
      .eq("id", categoryId)
      .select("id, name, slug, description, is_active, created_at")
      .single();

    if (error) {
      setPageError(error.message);
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? mapCategoryRow(data) : category,
      ),
    );

    setPageSuccess("Statut de la categorie mis a jour.");
  }

  async function handleSubmitCategory(event) {
    event.preventDefault();

    const trimmedName = draftCategory.name.trim();
    if (!trimmedName) {
      setPageError("Le nom de la categorie est obligatoire.");
      return;
    }

    const nextDescription = draftCategory.description.trim();
    const nextSlug = createUniqueSlug(
      slugify(trimmedName),
      categories,
      editingCategoryId,
    );

    setIsSaving(true);
    setPageError("");
    setPageSuccess("");

    if (editingCategoryId) {
      const { data, error } = await supabase
        .from("categories")
        .update({
          name: trimmedName,
          slug: nextSlug,
          description: nextDescription,
        })
        .eq("id", editingCategoryId)
        .select("id, name, slug, description, is_active, created_at")
        .single();

      if (error) {
        setPageError(error.message);
        setIsSaving(false);
        return;
      }

      setCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === editingCategoryId ? mapCategoryRow(data) : category,
        ),
      );

      setPageSuccess("Categorie mise a jour avec succes.");
    } else {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: trimmedName,
          slug: nextSlug,
          description: nextDescription,
          is_active: true,
        })
        .select("id, name, slug, description, is_active, created_at")
        .single();

      if (error) {
        setPageError(error.message);
        setIsSaving(false);
        return;
      }

      setCategories((currentCategories) => [
        mapCategoryRow(data),
        ...currentCategories,
      ]);
      setPageSuccess("Categorie creee avec succes.");
    }

    setIsSaving(false);
    setIsDialogOpen(false);
    resetDialogState();
  }

  return (
    <>
      <section className="flex flex-col gap-6 px-6 py-5 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <h3 className="text-3xl font-bold">Categories</h3>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <button
              type="button"
              onClick={handleOpenCreateDialog}
              className="flex cursor-pointer flex-row items-center gap-1 whitespace-nowrap rounded-sm bg-black px-3 py-2 text-sm text-white">
              <Plus size={16} strokeWidth={3} />
              Cree une categorie
            </button>
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-white">
              <TableRow className="border-slate-200 bg-transparent hover:bg-transparent">
                <TableHead className="h-10 px-4 text-sm font-normal text-black">
                  Name
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-normal text-black">
                  Slug
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-normal text-black">
                  Active
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-normal text-black">
                  Created at
                </TableHead>
                <TableHead className="h-10 px-3 text-right text-sm font-normal text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                      <Spinner size="md" className="text-[#081c16]" />
                      <span>Loading categories...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories.length ? (
                categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="border-slate-200 hover:bg-stone-50/70">
                    <TableCell className="px-4 py-3 align-top whitespace-normal">
                      <div className="flex min-w-[240px] flex-col gap-1">
                        <span className="font-medium text-[#081c16]">
                          {category.name}
                        </span>
                        <span className="max-w-[320px] text-xs leading-5 text-slate-500">
                          {category.description ||
                            "Aucune description pour le moment."}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-3 text-sm text-slate-700">
                      {category.slug}
                    </TableCell>

                    <TableCell className="px-3 py-3">
                      <span
                        className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${getStatusClassName(
                          category.active,
                        )}`}>
                        {category.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-3 text-sm text-slate-700">
                      {formatCreatedAt(category.createdAt)}
                    </TableCell>

                    <TableCell className="px-3 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-[#081c16]">
                            <EllipsisVerticalIcon />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          sideOffset={10}
                          className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                          <DropdownMenuItem
                            onSelect={() => handleOpenEditDialog(category)}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50">
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => handleToggleActive(category.id)}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50">
                            {category.active ? "Desactiver" : "Activer"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="mx-0 my-1 bg-slate-200" />

                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleDeleteCategory(category.id)}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center">
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Total: {categories.length} categor
              {categories.length === 1 ? "y" : "ies"}
            </p>
            <p className="text-sm text-slate-500">
              Categories are now connected to Supabase.
            </p>
          </div>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="rounded-[24px] border border-slate-200 bg-white p-0 shadow-xl sm:max-w-lg">
          <form onSubmit={handleSubmitCategory} className="flex flex-col">
            <DialogHeader className="px-6 py-5">
              <DialogTitle className="text-lg font-semibold text-[#081c16]">
                {editingCategoryId
                  ? "Modifier la categorie"
                  : "Creer une categorie"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[#616669]">
                Ajoutez le nom et la description. Le slug est genere
                automatiquement a partir du nom.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-6 pb-6">
              <div className="grid gap-3">
                <Label htmlFor="category-name" className={adminLabelClass}>
                  Category name
                </Label>
                <Input
                  id="category-name"
                  value={draftCategory.name}
                  onChange={(event) =>
                    handleDraftFieldChange("name", event.target.value)
                  }
                  placeholder="Ex: Takchita"
                  className={adminInputClass}
                />
              </div>

              <div className="grid gap-3">
                <Label
                  htmlFor="category-description"
                  className={adminLabelClass}>
                  Description
                </Label>
                <textarea
                  id="category-description"
                  value={draftCategory.description}
                  onChange={(event) =>
                    handleDraftFieldChange("description", event.target.value)
                  }
                  placeholder="Ajoutez une courte description pour cette categorie"
                  className={adminTextareaClass}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Slug preview
                </p>
                <p className="mt-2 text-sm font-semibold text-[#081c16]">
                  {slugPreview}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200 text-[#081c16] hover:bg-white">
                  Annuler
                </Button>
              </DialogClose>

              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#081c16] text-white hover:bg-[#081c16]/90 disabled:opacity-60">
                {isSaving
                  ? "Saving..."
                  : editingCategoryId
                    ? "Enregistrer"
                    : "Create category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
