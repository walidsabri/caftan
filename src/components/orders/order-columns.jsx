"use client";

import { ArrowUpDown, ChevronDown, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmee" },
  { value: "assigned", label: "Assignee" },
  { value: "preparing", label: "Preparation" },
  { value: "shipped", label: "Expediee" },
  { value: "delivered", label: "Livree" },
  { value: "cancelled", label: "Annulee" },
  { value: "returned", label: "Retournee" },
];

const UNASSIGNED_OWNER_VALUE = "__unassigned__";

function formatOrderDate(value) {
  return dateFormatter.format(new Date(value)).replace(",", "");
}

function formatPrice(value) {
  return `DZD ${priceFormatter.format(value)}`;
}

function SortableHeader({ column, title, className = "" }) {
  return (
    <Button
      variant="ghost"
      className={`h-auto gap-2 p-0 text-sm font-semibold text-slate-900 hover:bg-transparent hover:text-slate-900 ${className}`}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {title}
      <ArrowUpDown className="size-3.5 text-slate-500" />
    </Button>
  );
}

function getStatusClasses(status) {
  switch (status) {
    case "confirmed":
      return "border-emerald-500 bg-emerald-50 text-emerald-700";
    case "assigned":
      return "border-sky-300 bg-sky-50 text-sky-700";
    case "preparing":
      return "border-indigo-300 bg-indigo-50 text-indigo-700";
    case "shipped":
      return "border-blue-300 bg-blue-50 text-blue-700";
    case "delivered":
      return "border-teal-300 bg-teal-50 text-teal-700";
    case "cancelled":
      return "border-rose-500 bg-rose-50 text-red-600";
    case "returned":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-amber-400 bg-amber-50 text-amber-500";
  }
}

export function getOrderStatusLabel(status) {
  return (
    ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    ORDER_STATUS_OPTIONS[0].label
  );
}

function StatusSelect({ value, onValueChange, disabled = false, isPending = false }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isPending}
          className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
              getStatusClasses(value)
            )}>
            {getOrderStatusLabel(value)}
          </span>
          {isPending ? (
            <Spinner size="sm" className="text-[#616669]" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {ORDER_STATUS_OPTIONS.map((status) => {
            const isCurrent = status.value === value;

            return (
              <DropdownMenuRadioItem
                key={status.value}
                value={status.value}
                className={cn(
                  "min-h-10 rounded-lg px-3 py-2 text-sm text-slate-800 focus:bg-slate-50",
                  isCurrent && "bg-slate-50"
                )}>
                <div className="flex w-full items-center gap-2 pr-4">
                  <span>{status.label}</span>
                  {isCurrent ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Current
                    </span>
                  ) : null}
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getDeliveryMethodLabel(value) {
  return value === "desk" ? "Store Pickup" : "Home Delivery";
}

function getAssigneeLabel(value) {
  return value || "Non assigne";
}

function AssigneeSelect({
  value,
  displayValue,
  onValueChange,
  assigneeOptions = [],
  disabled = false,
  isPending = false,
}) {
  const dropdownValue = value || UNASSIGNED_OWNER_VALUE;
  const triggerValue = displayValue || value || "";
  const isUnassigned = !triggerValue;
  const resolvedAssigneeOptions = [
    { value: UNASSIGNED_OWNER_VALUE, label: "Non assigne" },
    ...assigneeOptions.map((assignee) =>
      typeof assignee === "string"
        ? {
            value: assignee,
            label: assignee,
            statusLabel: "",
          }
        : {
            value: assignee.value,
            label: assignee.label,
            statusLabel: assignee.statusLabel || "",
          },
    ),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled || isPending}
          className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-default disabled:pointer-events-none">
          <span
            className={cn(
              "text-sm font-normal",
              isUnassigned ? "text-[#616669]" : "text-[#081c16]"
            )}>
            {getAssigneeLabel(triggerValue)}
          </span>
          {!disabled && !isPending ? (
            <ChevronDown className="size-4 text-slate-400" />
          ) : null}
          {isPending ? <Spinner size="sm" className="text-[#616669]" /> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
        <DropdownMenuRadioGroup
          value={dropdownValue}
          onValueChange={(nextValue) =>
            onValueChange(
              nextValue === UNASSIGNED_OWNER_VALUE ? "" : nextValue
            )
          }>
          {resolvedAssigneeOptions.map((assignee) => (
            <DropdownMenuRadioItem
              key={assignee.value}
              value={assignee.value}
              className={cn(
                "min-h-10 rounded-lg px-3 py-2 text-sm text-slate-800 focus:bg-slate-50",
                assignee.value === dropdownValue && "bg-slate-50"
              )}>
              <div className="flex w-full items-center justify-between gap-3 pr-4">
                <span>{assignee.label}</span>
                {assignee.statusLabel ? (
                  <span className="text-xs font-medium text-slate-400">
                    {assignee.statusLabel}
                  </span>
                ) : null}
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getOrderColumns({
  onStatusChange,
  onOwnerChange,
  isDispatchMode = false,
  getIsStatusPending = () => false,
  getIsOwnerPending = () => false,
}) {
  return [
    {
      accessorKey: "orderNumber",
      header: "Numero de commande",
      cell: ({ row }) => (
        <span className="text-sm font-normal text-[#081c16]">
          {row.original.orderNumber}
        </span>
      ),
      meta: {
        headerClassName: "min-w-[118px]",
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-sm font-normal text-[#081c16]">
          {formatOrderDate(row.original.date)}
        </span>
      ),
      meta: {
        headerClassName: "min-w-[145px]",
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => (
        <div className="flex max-w-[140px] flex-col gap-0.5">
          <span className="text-sm font-semibold text-[#081c16]">
            {row.original.client}
          </span>
          <span className="text-sm font-light text-[#616669]">
            {row.original.clientPhone}
          </span>
        </div>
      ),
      meta: {
        headerClassName: "min-w-[140px]",
        cellClassName: "align-middle",
      },
    },
    {
      accessorKey: "products",
      header: "Produits",
      cell: ({ row }) => {
        const orderItems = row.original.orderItems?.length
          ? row.original.orderItems
          : [{ id: "unknown", label: "Produit inconnu" }];

        return (
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <div className="space-y-2">
              {orderItems.map((orderItem) => (
                <div key={orderItem.id} className="min-h-10">
                  <p className="max-w-[240px] text-sm font-medium leading-5 text-[#081c16]">
                    {orderItem.label}
                  </p>
                </div>
              ))}

              {row.original.products.length > orderItems.length ? (
                <p className="text-xs font-medium text-[#616669]">
                  +{row.original.products.length - orderItems.length} autre
                  {row.original.products.length - orderItems.length > 1
                    ? "s"
                    : ""}
                </p>
              ) : null}
            </div>

            {row.original.products.length > 3 ? (
              <div className="text-xs text-[#616669]">
                {row.original.products.length} lignes produit
              </div>
            ) : null}

            <p className="text-xs text-[#616669]">
              {formatPrice(row.original.totalPrice)}
            </p>
          </div>
        );
      },
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[220px]",
        cellClassName: "align-middle",
      },
    },
    {
      accessorKey: "deliveryAddress",
      header: "Livraison",
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#081c16]" />
          <div className="flex max-w-[150px] flex-col gap-0.5">
            <p className="truncate text-sm font-medium text-[#081c16]">
              {row.original.deliveryAddress}
            </p>
            <p className="truncate text-xs text-[#616669]">
              {getDeliveryMethodLabel(row.original.deliveryMethod)}
            </p>
          </div>
        </div>
      ),
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[160px]",
        cellClassName: "align-middle",
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusSelect
          value={row.original.status}
          isPending={getIsStatusPending(row.original.id)}
          onValueChange={(value) => onStatusChange(row.original.id, value)}
        />
      ),
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[128px]",
      },
    },
    {
      accessorKey: "totalPrice",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          title="Prix total"
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm font-base text-[#081c16]">
          {formatPrice(row.original.totalPrice)}
        </div>
      ),
      meta: {
        headerClassName: "min-w-[128px] text-right",
        cellClassName: "text-right",
      },
    },
    {
      accessorKey: "owner",
      header: "Assignee",
      cell: ({ row }) => {
        const orderItems = row.original.orderItems?.length
          ? row.original.orderItems
          : [
              {
                id: row.original.id,
                owner: row.original.owner,
                suggestedOwner: "",
                ownerOptions: [],
              },
            ];

        return (
          <div className="flex min-w-[180px] flex-col gap-2">
            {orderItems.map((orderItem) => (
              <div key={orderItem.id} className="min-h-10">
                <AssigneeSelect
                  value={orderItem.owner}
                  displayValue={orderItem.owner || orderItem.suggestedOwner}
                  assigneeOptions={orderItem.ownerOptions}
                  disabled={isDispatchMode}
                  isPending={getIsOwnerPending(orderItem.id)}
                  onValueChange={(value) =>
                    onOwnerChange(row.original.id, orderItem.id, value)
                  }
                />
              </div>
            ))}
          </div>
        );
      },
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[180px]",
      },
    },
  ];
}
