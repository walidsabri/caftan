"use client";

import * as React from "react";
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
  return `${new Intl.NumberFormat("en-US").format(value)} DZD`;
}

function getStatusClassName(status) {
  switch (status) {
    case "In stock":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Low stock":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Out of stock":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

const PAGE_SIZE = 10;

function normalizeText(value) {
  return value.toString().toLowerCase().trim();
}

const columns = [
  {
    id: "name",
    header: "Product",
    renderCell: (product) => (
      <div className="flex min-w-[250px] flex-col gap-0.5">
        <span className="font-medium text-[#081c16]">{product.name}</span>
        <span className="text-xs text-slate-500">{product.details}</span>
      </div>
    ),
    headerClassName: "px-4",
    cellClassName: "px-4",
  },
  {
    id: "sku",
    header: "Reference",
    renderCell: (product) => product.sku,
  },
  {
    id: "category",
    header: "Category",
    renderCell: (product) => product.category,
  },
  {
    id: "price",
    header: () => <div className="text-right">Price</div>,
    renderCell: (product) => (
      <div className="text-right font-medium text-[#081c16]">
        {formatPrice(product.price)}
      </div>
    ),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
  {
    id: "stock",
    header: () => <div className="text-right">Stock</div>,
    renderCell: (product) => (
      <div className="text-right font-medium text-slate-700">
        {product.stock}
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
];

export function ProductsDataTable({
  data = [],
  searchQuery = "",
  selectedStock = "all",
  selectedTaille = "all",
  selectedCategory = "all",
}) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const filteredData = React.useMemo(
    () =>
      data.filter(
        (product) =>
          (!normalizeText(searchQuery) ||
            normalizeText(product.name).includes(normalizeText(searchQuery))) &&
          (selectedStock === "all" || product.status === selectedStock) &&
          (selectedTaille === "all" || product.taille === selectedTaille) &&
          (selectedCategory === "all" ||
            product.category === selectedCategory),
      ),
    [data, searchQuery, selectedCategory, selectedStock, selectedTaille],
  );
  const pageCount = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  React.useEffect(() => {
    setPageIndex((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

  React.useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, selectedCategory, selectedStock, selectedTaille]);

  const startIndex = pageIndex * PAGE_SIZE;
  const visibleRows = filteredData.slice(startIndex, startIndex + PAGE_SIZE);
  const hasRows = filteredData.length > 0;
  const startRow = hasRows ? startIndex + 1 : 0;
  const endRow = hasRows
    ? Math.min(startIndex + PAGE_SIZE, filteredData.length)
    : 0;

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
                  column.headerClassName,
                )}>
                {typeof column.header === "function"
                  ? column.header()
                  : column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {visibleRows.length ? (
            visibleRows.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer border-slate-200 hover:bg-stone-50/70">
                {columns.map((column) => (
                  <TableCell
                    key={`${product.id}-${column.id}`}
                    className={cn(
                      "px-3 py-3 text-sm text-slate-700",
                      column.cellClassName,
                    )}>
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
          Showing {startRow} to {endRow} of {filteredData.length} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => setPageIndex((currentPage) => currentPage - 1)}
            disabled={pageIndex === 0}>
            <ChevronLeft />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => setPageIndex((currentPage) => currentPage + 1)}
            disabled={pageIndex >= pageCount - 1}>
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
