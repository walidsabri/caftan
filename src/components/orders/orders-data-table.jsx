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

import {
  getOrderColumns,
  getOrderStatusLabel,
} from "@/components/orders/order-columns";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
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
  return row.deliveryMethod === "desk" ? "desk" : "home";
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
    row.deliveryMethodLabel,
    row.status,
    getOrderStatusLabel(row.status),
    row.owner,
    ...(row.ownerNames ?? []),
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
  return (
    selectedAssignee === "all" ||
    (row.ownerNames ?? []).includes(selectedAssignee)
  );
}

function matchesDeliveryType(row, selectedDeliveryType) {
  return (
    selectedDeliveryType === "all" || getDeliveryType(row) === selectedDeliveryType
  );
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
  return row.status === "assigned" && Boolean(row.isFullyAssigned);
}

function getDispatchAccountOwners(dispatchAccount) {
  return dispatchAccount === "all" ? [] : [dispatchAccount];
}

function matchesDispatchAccount(row, dispatchAccount) {
  if (dispatchAccount === "all") {
    return true;
  }

  return (row.ownerNames ?? []).some((owner) =>
    getDispatchAccountOwners(dispatchAccount).includes(owner)
  );
}

export function OrdersDataTable({
  data,
  searchQuery = "",
  selectedStatus = "all",
  selectedAssignee = "all",
  selectedDeliveryType = "all",
  dateRange,
  isDispatchMode = false,
  isReadOnly = false,
  dispatchAccount = "all",
  dispatchSubmissionId = 0,
  assigneeOptions = [],
  isLoading = false,
  onDispatchSelectionChange,
  onRefreshOrders,
}) {
  const [tableData, setTableData] = React.useState(() => data ?? []);
  const [sorting, setSorting] = React.useState([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pendingMutationKeys, setPendingMutationKeys] = React.useState([]);
  const lastDispatchSubmissionRef = React.useRef(dispatchSubmissionId);

  const addPendingMutation = React.useCallback((key) => {
    setPendingMutationKeys((currentKeys) =>
      currentKeys.includes(key) ? currentKeys : [...currentKeys, key]
    );
  }, []);

  const removePendingMutation = React.useCallback((key) => {
    setPendingMutationKeys((currentKeys) =>
      currentKeys.filter((currentKey) => currentKey !== key)
    );
  }, []);

  const isMutationPending = React.useCallback(
    (key) => pendingMutationKeys.includes(key),
    [pendingMutationKeys],
  );

  const handleStatusChange = React.useCallback(
    async (orderId, nextStatus) => {
      const mutationKey = `status:${orderId}`;

      if (isMutationPending(mutationKey)) {
        return;
      }

      addPendingMutation(mutationKey);

      try {
        const response =
          nextStatus === "cancelled"
            ? await fetch(`/api/orders/${orderId}/cancel`, {
                method: "POST",
              })
            : await fetch(`/api/orders/${orderId}/status`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: nextStatus }),
              });

        const result = await response.json();

        if (!response.ok) {
          alert(result?.error || "Failed to update order status.");
          return;
        }

        await onRefreshOrders?.();
      } finally {
        removePendingMutation(mutationKey);
      }
    },
    [addPendingMutation, isMutationPending, onRefreshOrders, removePendingMutation],
  );

  const handleOwnerChange = React.useCallback(
    async (orderId, orderItemId, nextOwner) => {
      const mutationKey = `owner:${orderItemId}`;

      if (isMutationPending(mutationKey)) {
        return;
      }

      addPendingMutation(mutationKey);

      try {
        const response = await fetch(
          `/api/orders/${orderId}/items/${orderItemId}/assign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ownerName: nextOwner,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          await onRefreshOrders?.({
            skipAutoAssignOrderItemId: orderItemId,
          });
          alert(result?.error || "Failed to assign owner.");
          return;
        }

        await onRefreshOrders?.({
          skipAutoAssignOrderItemId: orderItemId,
        });
      } finally {
        removePendingMutation(mutationKey);
      }
    },
    [addPendingMutation, isMutationPending, onRefreshOrders, removePendingMutation],
  );

  const columns = React.useMemo(() => {
    const baseColumns = getOrderColumns({
      onStatusChange: handleStatusChange,
      onOwnerChange: handleOwnerChange,
      isDispatchMode,
      isReadOnly,
      getIsStatusPending: (orderId) => isMutationPending(`status:${orderId}`),
      getIsOwnerPending: (orderItemId) =>
        isMutationPending(`owner:${orderItemId}`),
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
  }, [
    handleOwnerChange,
    handleStatusChange,
    isDispatchMode,
    isMutationPending,
    isReadOnly,
  ]);

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
  }, [dispatchSubmissionId]);

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
  const endRow = hasRows
    ? Math.min(startRow + pagination.pageSize - 1, filteredData.length)
    : 0;

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
    <div
      aria-busy={isLoading || pendingMutationKeys.length > 0}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 px-4 text-center">
                <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                  <Spinner size="md" className="text-[#081c16]" />
                  <span>Chargement des commandes...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-200 hover:bg-stone-50/70 cursor-pointer">
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
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-[#616669]" />
              <span>Chargement du total des commandes...</span>
            </span>
          ) : (
            `Affichage de ${startRow} a ${endRow} sur ${filteredData.length} commandes`
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}>
            <ChevronLeft />
            Precedent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}>
            Suivant
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
