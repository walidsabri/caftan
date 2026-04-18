"use client";

import * as React from "react";
import { EllipsisVerticalIcon, Plus } from "lucide-react";

import { products } from "@/app/(admin)/admin/products/data";
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
const categoryDescriptions = {
  Caftan:
    "Caftans de ceremonie avec coupes structurees, sfifa soignee et finitions elegantes.",
  Takchita:
    "Silhouettes deux pieces pensees pour les grandes occasions et les looks plus habilles.",
  Jabador:
    "Ensembles traditionnels confortables avec une lecture plus sobre et masculine.",
  Accessory:
    "Ceintures, chaussures et pieces complementaires pour finaliser les tenues.",
};
const initialCreatedAt = [
  "2026-01-11T09:30:00.000Z",
  "2026-01-18T09:30:00.000Z",
  "2026-02-03T09:30:00.000Z",
  "2026-02-17T09:30:00.000Z",
];

function createEmptyDraft() {
  return {
    name: "",
    description: "",
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const productCategories = [...new Set(products.map((product) => product.category))];
const INITIAL_CATEGORIES = productCategories.map((categoryName, index) => ({
  id: slugify(categoryName),
  name: categoryName,
  slug: slugify(categoryName),
  description: categoryDescriptions[categoryName] ?? "",
  active: index !== productCategories.length - 1,
  createdAt:
    initialCreatedAt[index] ?? new Date("2026-03-01T09:30:00.000Z").toISOString(),
}));

function createUniqueSlug(baseSlug, existingCategories, currentCategoryId = null) {
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
  if (isActive) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-500";
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState(INITIAL_CATEGORIES);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);
  const [draftCategory, setDraftCategory] = React.useState(createEmptyDraft);
  const slugPreview = createUniqueSlug(
    slugify(draftCategory.name),
    categories,
    editingCategoryId,
  );

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

  function handleDeleteCategory(categoryId) {
    setCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== categoryId),
    );
  }

  function handleToggleActive(categoryId) {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              active: !category.active,
            }
          : category,
      ),
    );
  }

  function handleSubmitCategory(event) {
    event.preventDefault();

    const trimmedName = draftCategory.name.trim();

    if (!trimmedName) {
      return;
    }

    const nextDescription = draftCategory.description.trim();
    const nextSlug = createUniqueSlug(
      slugify(trimmedName),
      categories,
      editingCategoryId,
    );

    if (editingCategoryId) {
      setCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === editingCategoryId
            ? {
                ...category,
                name: trimmedName,
                slug: nextSlug,
                description: nextDescription,
              }
            : category,
        ),
      );
    } else {
      setCategories((currentCategories) => [
        {
          id: `${nextSlug}-${Date.now()}`,
          name: trimmedName,
          slug: nextSlug,
          description: nextDescription,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...currentCategories,
      ]);
    }

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
              {categories.length ? (
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
                          {category.description || "Aucune description pour le moment."}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">
                      {category.slug}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span
                        className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${getStatusClassName(category.active)}`}>
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
              Total: {categories.length} categor{categories.length === 1 ? "y" : "ies"}
            </p>
            <p className="text-sm text-slate-500">
              Le formulaire reste local pour le moment, sans insertion DB.
            </p>
          </div>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="rounded-[24px] border border-slate-200 bg-white p-0 shadow-xl sm:max-w-lg">
          <form onSubmit={handleSubmitCategory} className="flex flex-col">
            <DialogHeader className="px-6 py-5">
              <DialogTitle className="text-lg font-semibold text-[#081c16]">
                {editingCategoryId ? "Modifier la categorie" : "Creer une categorie"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-[#616669]">
                Ajoutez le nom et la description. Le slug est genere automatiquement
                a partir du nom.
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
                <Label htmlFor="category-description" className={adminLabelClass}>
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
                className="rounded-xl bg-[#081c16] text-white hover:bg-[#081c16]/90">
                {editingCategoryId ? "Enregistrer" : "Create category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
