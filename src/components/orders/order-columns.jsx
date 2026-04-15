"use client";

import { ArrowUpDown, ChevronDown, MapPin, Plus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const STATUS_OPTIONS = [
  { value: "En attente", label: "En attente" },
  { value: "Confirme", label: "Confirme" },
  { value: "Programme", label: "Programme" },
  { value: "Annuler", label: "Annuler" },
];

const UNASSIGNED_OWNER_VALUE = "__unassigned__";
const ASSIGNEE_OPTIONS = [
  { value: UNASSIGNED_OWNER_VALUE, label: "Non assigne" },
  { value: "Warda", label: "Warda" },
  { value: "Hanane", label: "Hanane" },
  { value: "Amina", label: "Amina" },
];

function formatOrderDate(value) {
  return dateFormatter.format(new Date(value)).replace(",", "");
}

function formatPrice(value) {
  return `DZD ${priceFormatter.format(value)}`;
}

function getInitials(value) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    case "Confirme":
      return "border-emerald-500 bg-emerald-50 text-emerald-700";
    case "Annuler":
      return "border-rose-500 bg-rose-50 text-red-600";
    case "Programme":
      return "border-sky-300 bg-sky-50 text-sky-700";
    default:
      return "border-amber-400 bg-amber-50 text-amber-500";
  }
}

function getStatusLabel(status) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    STATUS_OPTIONS[0].label
  );
}

function StatusSelect({ value, onValueChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
              getStatusClasses(value)
            )}>
            {getStatusLabel(value)}
          </span>
          <ChevronDown className="size-4 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={10}
        className="w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {STATUS_OPTIONS.map((status) => {
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
        <DropdownMenuSeparator className="mx-0 my-1 bg-slate-200" />
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 focus:bg-blue-50 focus:text-blue-600">
          <Plus className="size-4" />
          Add Status
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getAssigneeLabel(value) {
  return value || "Non assigne";
}

function AssigneeSelect({ value, onValueChange, disabled = false }) {
  const dropdownValue = value || UNASSIGNED_OWNER_VALUE;
  const isUnassigned = dropdownValue === UNASSIGNED_OWNER_VALUE;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-default disabled:pointer-events-none">
          <span
            className={cn(
              "text-sm font-normal",
              isUnassigned ? "text-[#616669]" : "text-[#081c16]"
            )}>
            {getAssigneeLabel(value)}
          </span>
          {!disabled ? <ChevronDown className="size-4 text-slate-400" /> : null}
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
          {ASSIGNEE_OPTIONS.map((assignee) => (
            <DropdownMenuRadioItem
              key={assignee.value}
              value={assignee.value}
              className={cn(
                "min-h-10 rounded-lg px-3 py-2 text-sm text-slate-800 focus:bg-slate-50",
                assignee.value === dropdownValue && "bg-slate-50"
              )}>
              {assignee.label}
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-stone-200 text-[11px] font-semibold text-slate-700">
              {getInitials(row.original.products[0])}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="max-w-[128px] truncate text-sm font-semibold text-[#081c16]">
              {row.original.products[0]}
              {row.original.products.length > 1
                ? ` +${row.original.products.length - 1}`
                : ""}
            </p>
            <p className="text-xs text-[#616669]">
              {formatPrice(row.original.totalPrice)}
            </p>
          </div>
        </div>
      ),
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[150px]",
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
              {row.original.deliveryMethod}
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
      cell: ({ row }) => (
        <AssigneeSelect
          value={row.original.owner}
          disabled={isDispatchMode}
          onValueChange={(value) => onOwnerChange(row.original.id, value)}
        />
      ),
      enableSorting: false,
      meta: {
        headerClassName: "min-w-[118px]",
      },
    },
  ];
}
