"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const PAGE_SIZE = 10;

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
          getStatusClassName(product.status)
        )}
      >
        {product.status}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    header: "Created at",
    renderCell: (product) => formatDate(product.createdAt),
  },
];

export function ProductsDataTable({ data = [], isLoading = false }) {
  const [pageIndex, setPageIndex] = React.useState(0);

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Table className="min-w-[880px]">
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading products...
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
          Showing {startRow} to {endRow} of {data.length} products
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