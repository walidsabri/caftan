"use client";

import * as React from "react";
import { endOfDay, isWithinInterval, startOfDay } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getOrderColumns } from "@/components/orders/order-columns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function normalizeText(value) {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePhone(value) {
  return value.toString().replace(/\D/g, "");
}

function getPhoneVariants(phone) {
  const digits = normalizePhone(phone);

  if (!digits) {
    return [];
  }

  const variants = [digits];

  if (digits.startsWith("213") && digits.length > 3) {
    variants.push(`0${digits.slice(3)}`);
  }

  return variants;
}

function getDeliveryType(row) {
  return row.deliveryMethod === "Store Pickup" ? "desk" : "home";
}

function matchesSearch(row, query) {
  const normalizedQuery = normalizeText(query);
  const normalizedPhoneQuery = normalizePhone(query);

  if (!normalizedQuery) {
    return true;
  }

  const textFields = [
    row.orderNumber,
    row.client,
    row.deliveryAddress,
    row.deliveryMethod,
    row.status,
    row.owner,
    ...row.products,
  ].filter(Boolean);

  const matchesText = textFields.some((value) =>
    normalizeText(value).includes(normalizedQuery)
  );

  if (matchesText) {
    return true;
  }

  if (!normalizedPhoneQuery) {
    return false;
  }

  return getPhoneVariants(row.clientPhone).some((phone) =>
    phone.includes(normalizedPhoneQuery)
  );
}

function matchesStatus(row, selectedStatus) {
  return selectedStatus === "all" || row.status === selectedStatus;
}

function matchesAssignee(row, selectedAssignee) {
  return selectedAssignee === "all" || row.owner === selectedAssignee;
}

function matchesDeliveryType(row, selectedDeliveryType) {
  return selectedDeliveryType === "all" || getDeliveryType(row) === selectedDeliveryType;
}

function matchesDateRange(row, dateRange) {
  if (!dateRange?.from) {
    return true;
  }

  return isWithinInterval(new Date(row.date), {
    start: startOfDay(dateRange.from),
    end: endOfDay(dateRange.to ?? dateRange.from),
  });
}

function isDispatchReadyOrder(row) {
  return row.status === "Confirme" && Boolean(row.owner?.trim());
}

function getDispatchAccountOwners(dispatchAccount) {
  switch (dispatchAccount) {
    case "Warda":
      return ["Warad", "Warda"];
    case "Hanane":
      return ["Hanane", "Amina"];
    default:
      return [];
  }
}

function matchesDispatchAccount(row, dispatchAccount) {
  if (dispatchAccount === "all") {
    return true;
  }

  return getDispatchAccountOwners(dispatchAccount).includes(row.owner);
}

export function OrdersDataTable({
  data,
  searchQuery = "",
  selectedStatus = "all",
  selectedAssignee = "all",
  selectedDeliveryType = "all",
  dateRange,
  isDispatchMode = false,
  dispatchAccount = "all",
  dispatchSubmissionId = 0,
  onDispatchSelectionChange,
}) {
  const [tableData, setTableData] = React.useState(() => data ?? []);
  const [sorting, setSorting] = React.useState([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const lastDispatchSubmissionRef = React.useRef(dispatchSubmissionId);
  const columns = React.useMemo(
    () => {
      const baseColumns = getOrderColumns({
        onStatusChange: (orderId, nextStatus) => {
          setTableData((currentRows) =>
            currentRows.map((row) =>
              row.id === orderId ? { ...row, status: nextStatus } : row
            )
          );
        },
        onOwnerChange: (orderId, nextOwner) => {
          setTableData((currentRows) =>
            currentRows.map((row) =>
              row.id === orderId ? { ...row, owner: nextOwner } : row
            )
          );
        },
        isDispatchMode,
      });

      if (!isDispatchMode) {
        return baseColumns;
      }

      return [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(Boolean(value))
              }
              aria-label="Selectionner toutes les commandes"
              className="cursor-pointer rounded-[6px] border-slate-300 data-checked:border-[#081c16] data-checked:bg-[#081c16]"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              aria-label={`Selectionner la commande ${row.original.orderNumber}`}
              className="cursor-pointer rounded-[6px] border-slate-300 data-checked:border-[#081c16] data-checked:bg-[#081c16]"
            />
          ),
          enableSorting: false,
          enableHiding: false,
          meta: {
            headerClassName: "w-12 px-3",
            cellClassName: "w-12",
          },
        },
        ...baseColumns,
      ];
    },
    [isDispatchMode]
  );

  React.useEffect(() => {
    setTableData(data ?? []);
  }, [data]);

  React.useEffect(() => {
    if (!isDispatchMode) {
      setRowSelection({});
    }
  }, [isDispatchMode]);

  React.useEffect(() => {
    const selectedRowIds = isDispatchMode
      ? Object.entries(rowSelection)
          .filter(([, isSelected]) => Boolean(isSelected))
          .map(([rowId]) => rowId)
      : [];

    onDispatchSelectionChange?.(selectedRowIds);
  }, [isDispatchMode, onDispatchSelectionChange, rowSelection]);

  const filteredData = React.useMemo(
    () =>
      tableData.filter(
        (row) =>
          (!isDispatchMode || isDispatchReadyOrder(row)) &&
          (!isDispatchMode || matchesDispatchAccount(row, dispatchAccount)) &&
          matchesSearch(row, searchQuery) &&
          matchesStatus(row, selectedStatus) &&
          matchesAssignee(row, selectedAssignee) &&
          matchesDeliveryType(row, selectedDeliveryType) &&
          matchesDateRange(row, dateRange)
      ),
    [
      dispatchAccount,
      dateRange,
      isDispatchMode,
      searchQuery,
      selectedAssignee,
      selectedDeliveryType,
      selectedStatus,
      tableData,
    ]
  );

  React.useEffect(() => {
    if (!isDispatchMode || dispatchAccount === "all") {
      setRowSelection({});
      return;
    }

    setRowSelection(
      Object.fromEntries(filteredData.map((row) => [row.id, true]))
    );
  }, [dispatchAccount, filteredData, isDispatchMode]);

  React.useEffect(() => {
    if (dispatchSubmissionId === lastDispatchSubmissionRef.current) {
      return;
    }

    lastDispatchSubmissionRef.current = dispatchSubmissionId;

    if (!isDispatchMode || dispatchAccount === "all") {
      return;
    }

    const selectedRowIds = Object.entries(rowSelection)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([rowId]) => rowId);

    if (!selectedRowIds.length) {
      return;
    }

    const selectedRowIdsSet = new Set(selectedRowIds);

    setTableData((currentRows) =>
      currentRows.map((row) =>
        selectedRowIdsSet.has(row.id)
          ? {
              ...row,
              status: "Programme",
              dispatchAccount,
            }
          : row
      )
    );
    setRowSelection({});
  }, [dispatchAccount, dispatchSubmissionId, isDispatchMode, rowSelection]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: isDispatchMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const pagination = table.getState().pagination;
  const hasRows = filteredData.length > 0;
  const startRow = hasRows ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const endRow = hasRows ? Math.min(startRow + pagination.pageSize - 1, filteredData.length) : 0;

  React.useEffect(() => {
    table.setPageIndex(0);
  }, [
    dateRange,
    isDispatchMode,
    searchQuery,
    selectedAssignee,
    selectedDeliveryType,
    selectedStatus,
    table,
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Table className="min-w-[980px]">
        <TableHeader className="bg-white ">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-slate-200 bg-transparent hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-10 px-3 text-sm font-base text-black font-sans",
                    header.column.columnDef.meta?.headerClassName
                  )}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-slate-200 hover:bg-stone-50/70 cursor-pointer">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-2 text-sm text-slate-700",
                      cell.column.columnDef.meta?.cellClassName
                    )}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Aucune commande trouvee.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Affichage de {startRow} a {endRow} sur {filteredData.length} commandes
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}>
            <ChevronLeft />
            Precedent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}>
            Suivant
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
