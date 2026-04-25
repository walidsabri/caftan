"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVerticalIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function formatPrice(value) {
  if (value == null) return "--";
  return `${new Intl.NumberFormat("en-US").format(value)} DZD`;
}

function formatDate(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getStatusClassName(status) {
  switch (status) {
    case "Active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Inactive":
      return "border-slate-200 bg-slate-100 text-slate-500";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getStockClassName(stockState) {
  switch (stockState) {
    case "In stock":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Out of stock":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

const PAGE_SIZE = 10;

function ProductActionsCell({
  product,
  activeAction,
  onOpenTransferDialog,
  onToggleProductStatus,
  onDeleteProduct,
}) {
  const isAnyActionPending = activeAction !== null;
  const isMutatingThisProduct = activeAction?.productId === product.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isAnyActionPending}
          className="cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-[#081c16]">
          {isMutatingThisProduct ? (
            <Spinner size="sm" className="text-current" />
          ) : (
            <EllipsisVerticalIcon />
          )}
          <span className="sr-only">Open actions</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50 focus:text-[#081c16] data-[highlighted]:bg-slate-50 data-[highlighted]:text-[#081c16]">
          <Link href={`/admin/products/${product.id}/edit`}>Modifier</Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50 focus:text-[#081c16] data-[highlighted]:bg-slate-50 data-[highlighted]:text-[#081c16]">
          <Link href={`/admin/products/${product.id}/add-stock`}>
            Ajouter du stock
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isAnyActionPending}
          onSelect={() => onOpenTransferDialog(product)}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50">
          Transferer le stock
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={isAnyActionPending}
          onSelect={() => onToggleProductStatus(product)}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#081c16] focus:bg-slate-50">
          {product.status === "Active" ? "Desactiver" : "Activer"}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="mx-0 my-1 bg-slate-200" />

        <DropdownMenuItem
          variant="destructive"
          disabled={isAnyActionPending}
          onSelect={() => onDeleteProduct(product)}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProductsDataTable({
  data = [],
  isLoading = false,
  activeAction = null,
  onOpenTransferDialog,
  onToggleProductStatus,
  onDeleteProduct,
}) {
  const [pageIndex, setPageIndex] = React.useState(0);

  const columns = [
    {
      id: "name",
      header: "Product",
      renderCell: (product) => (
        <div className="flex min-w-[260px] items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-[#081c16]">
              {product.name}
            </span>
            <span className="truncate text-xs text-slate-500">
              {product.slug || "No slug"}
            </span>
          </div>
        </div>
      ),
      headerClassName: "px-4",
      cellClassName: "px-4",
    },
    {
      id: "category",
      header: "Category",
      renderCell: (product) => product.category || "--",
    },
    {
      id: "colors",
      header: "Colors",
      renderCell: (product) =>
        product.colorNames?.length ? (
          <div className="flex min-w-[220px] flex-wrap gap-1.5">
            {product.colorNames.map((color) => (
              <Badge
                key={`${product.id}-${color}`}
                variant="outline"
                className="h-6 rounded-full border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700">
                {color}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">--</span>
        ),
    },
    {
      id: "assignedOwners",
      header: "Assigned to",
      renderCell: (product) =>
        product.assignedOwners?.length ? (
          <div className="flex min-w-[220px] flex-wrap gap-1.5">
            {product.assignedOwners.map((owner) => (
              <Badge
                key={`${product.id}-${owner}`}
                variant="outline"
                className="h-6 rounded-full border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700">
                {owner}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">--</span>
        ),
    },
    {
      id: "stock",
      header: () => <div className="text-center">Stock</div>,
      renderCell: (product) => (
        <div className="flex min-w-[150px] items-center justify-center gap-2">
          <span className="text-base font-semibold text-[#081c16]">
            {product.availableQuantity ?? 0}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-full px-2.5 text-xs font-medium",
              getStockClassName(product.stockState),
            )}>
            {product.stockState}
          </Badge>
        </div>
      ),
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
    {
      id: "price",
      header: () => <div className="text-right">Price</div>,
      renderCell: (product) => (
        <div className="text-right font-medium text-[#081c16]">
          {formatPrice(product.price)}
          {product.oldPrice ? (
            <div className="text-xs font-normal text-slate-400 line-through">
              {formatPrice(product.oldPrice)}
            </div>
          ) : null}
        </div>
      ),
      headerClassName: "text-right",
      cellClassName: "text-right",
    },
    {
      id: "status",
      header: "Status",
      renderCell: (product) => (
        <Badge
          variant="outline"
          className={cn(
            "h-6 rounded-full px-2.5 text-xs font-medium",
            getStatusClassName(product.status),
          )}>
          {product.status}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Created at",
      renderCell: (product) => formatDate(product.createdAt),
    },
    {
      id: "lastRestockAt",
      header: "Last restock",
      renderCell: (product) => formatDateTime(product.lastRestockAt),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      renderCell: (product) => (
        <div className="flex justify-end">
          <ProductActionsCell
            product={product}
            activeAction={activeAction}
            onOpenTransferDialog={onOpenTransferDialog}
            onToggleProductStatus={onToggleProductStatus}
            onDeleteProduct={onDeleteProduct}
          />
        </div>
      ),
      headerClassName: "text-right",
      cellClassName: "text-right",
    },
  ];

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  React.useEffect(() => {
    setPageIndex((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

  React.useEffect(() => {
    setPageIndex(0);
  }, [data]);

  const startIndex = pageIndex * PAGE_SIZE;
  const visibleRows = data.slice(startIndex, startIndex + PAGE_SIZE);
  const hasRows = data.length > 0;
  const startRow = hasRows ? startIndex + 1 : 0;
  const endRow = hasRows ? Math.min(startIndex + PAGE_SIZE, data.length) : 0;

  return (
    <div
      aria-busy={isLoading || activeAction !== null}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Table className="min-w-[1520px]">
        <TableHeader className="bg-white">
          <TableRow className="border-slate-200 bg-transparent hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  "h-10 px-3 text-sm font-normal text-black",
                  column.headerClassName
                )}
              >
                {typeof column.header === "function"
                  ? column.header()
                  : column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 px-4 text-center">
                <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                  <Spinner size="md" className="text-[#081c16]" />
                  <span>Loading products...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : visibleRows.length ? (
            visibleRows.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer border-slate-200 hover:bg-stone-50/70"
              >
                {columns.map((column) => (
                  <TableCell
                    key={`${product.id}-${column.id}`}
                    className={cn(
                      "px-3 py-3 text-sm text-slate-700",
                      column.cellClassName
                    )}
                  >
                    {column.renderCell(product)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-[#616669]" />
              <span>Loading product count...</span>
            </span>
          ) : (
            `Showing ${startRow} to ${endRow} of ${data.length} products`
          )}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => setPageIndex((currentPage) => currentPage - 1)}
            disabled={pageIndex === 0 || isLoading}
          >
            <ChevronLeft />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => setPageIndex((currentPage) => currentPage + 1)}
            disabled={pageIndex >= pageCount - 1 || isLoading}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
