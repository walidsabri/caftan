"use client";

import * as React from "react";
import { CalendarDays, Plus, Search, X } from "lucide-react";

import {
  getOrderStatusLabel,
  ORDER_STATUS_OPTIONS,
} from "@/components/orders/order-columns";
import {
  DATE_SHORTCUTS,
  formatDateRangeLabel,
  mapOrderRow,
} from "@/components/orders/order-page-helpers";
import { OrdersDataTable } from "@/components/orders/orders-data-table";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TRACKING_ORDER_STATUSES = [
  "confirmed",
  "assigned",
  "preparing",
  "shipped",
  "delivered",
  "returned",
];

const TRACKING_DISPATCH_FILTER =
  "shipping_external_id.not.is.null,tracking_number.not.is.null,shipping_status.not.is.null";

const TRACKING_STATUS_OPTIONS = ORDER_STATUS_OPTIONS.filter((status) =>
  TRACKING_ORDER_STATUSES.includes(status.value),
);

export default function TrackingPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [orders, setOrders] = React.useState([]);
  const [assigneeOptions, setAssigneeOptions] = React.useState(SHOP_OWNERS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState();
  const [draftDateRange, setDraftDateRange] = React.useState();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedDeliveryType, setSelectedDeliveryType] = React.useState("all");
  const [selectedAssignee, setSelectedAssignee] = React.useState("all");

  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const filterTriggerClass =
    "h-9 w-[190px] cursor-pointer rounded-2xl border border-dashed border-[#61666942] bg-white px-2 text-sm font-medium text-[#616669] shadow-none hover:bg-white focus-visible:ring-0 focus-visible:border-[#61666942] data-[state=open]:bg-white [&_svg:last-child]:text-[#616669]";
  const activeFilterTriggerClass =
    "border-[#081c16] focus-visible:border-[#081c16]";
  const simpleDropdownClass =
    "rounded-2xl border border-slate-200 bg-white p-1.5 text-[#081c16] shadow-sm";
  const selectItemClass =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-[#081c16] focus:bg-black! focus:text-white! focus:[&_svg]:text-white! focus:[&_span]:text-white! hover:bg-black! hover:text-white! hover:[&_svg]:text-white! hover:[&_span]:text-white!";
  const selectedStatusLabel =
    selectedStatus === "all" ? null : getOrderStatusLabel(selectedStatus);
  const selectedDeliveryLabel =
    selectedDeliveryType === "all"
      ? null
      : selectedDeliveryType === "home"
        ? "Home"
        : "Desk";
  const selectedAssigneeLabel =
    selectedAssignee === "all" ? null : selectedAssignee;
  const selectedDateLabel = formatDateRangeLabel(dateRange);

  React.useEffect(() => {
    async function fetchTrackingOrders() {
      setIsLoading(true);
      setPageError("");

      const [ordersResponse, stockOwnersResponse] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            customer_name,
            customer_phone,
            wilaya,
            commune,
            address,
            status,
            shipping_method,
            total_amount,
            shipping_company,
            shipping_status,
            tracking_number,
            shipping_external_id,
            created_at,
            order_items (
              id,
              variant_id,
              product_name,
              color_name,
              size_name,
              quantity,
              assigned_stock_owner_id
            )
          `,
          )
          .or(TRACKING_DISPATCH_FILTER)
          .order("created_at", { ascending: false }),
        supabase
          .from("stock_owners")
          .select("id, name")
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (ordersResponse.error || stockOwnersResponse.error) {
        setPageError(
          ordersResponse.error?.message ||
            stockOwnersResponse.error?.message ||
            "Failed to load tracking orders.",
        );
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const stockOwners = stockOwnersResponse.data ?? [];
      const stockOwnersById = new Map(
        stockOwners.map((owner) => [owner.id, owner.name]),
      );
      const mappedOrders = (ordersResponse.data ?? []).map((order) =>
        mapOrderRow(order, [], stockOwnersById, new Map(), new Map(), new Set()),
      );
      const nextAssigneeOptions = Array.from(
        new Set([
          ...SHOP_OWNERS,
          ...stockOwners
            .map((owner) => owner.name?.trim())
            .filter(Boolean),
          ...mappedOrders.flatMap((order) => order.ownerNames),
        ]),
      ).sort((firstOwner, secondOwner) => firstOwner.localeCompare(secondOwner));

      setOrders(mappedOrders);
      setAssigneeOptions(nextAssigneeOptions);
      setIsLoading(false);
    }

    fetchTrackingOrders();
  }, [supabase]);

  React.useEffect(() => {
    if (
      selectedAssignee !== "all" &&
      !assigneeOptions.includes(selectedAssignee)
    ) {
      setSelectedAssignee("all");
    }
  }, [assigneeOptions, selectedAssignee]);

  function handleDatePopoverOpenChange(nextOpen) {
    setIsDatePopoverOpen(nextOpen);

    if (nextOpen) {
      setDraftDateRange(dateRange);
    }
  }

  function handleApplyDate() {
    setDateRange(draftDateRange);
    setIsDatePopoverOpen(false);
  }

  function handleClearDate() {
    setDraftDateRange(undefined);
    setDateRange(undefined);
    setIsDatePopoverOpen(false);
  }

  function handleFilterIconPointerDown(event, clearFilter) {
    event.preventDefault();
    event.stopPropagation();
    clearFilter();
  }

  function renderFilterIndicator(selectedLabel, clearFilter) {
    if (isLoading) {
      return <Spinner size="sm" className="text-[#616669]" />;
    }

    if (selectedLabel) {
      return (
        <span
          onPointerDown={(event) => handleFilterIconPointerDown(event, clearFilter)}
          className="inline-flex size-4 cursor-pointer items-center justify-center">
          <X size={15} color="#616669" strokeWidth={2.5} />
        </span>
      );
    }

    return <Plus size={15} color="#616669" strokeWidth={2.5} />;
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-5 lg:px-10">
      <div className="flex flex-col gap-2">
        <h3 className="text-3xl font-bold">Suivi des commandes</h3>
        <p className="text-sm text-slate-500">
          Seules les commandes deja dispatches vers le transporteur apparaitront
          ici.
        </p>
      </div>

      <Separator />

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        {isLoading ? (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" className="text-[#616669]" />
          </div>
        ) : null}
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          disabled={isLoading}
          placeholder="Rechercher client ou telephone..."
          className="h-10 cursor-pointer rounded-xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 shadow-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1 justify-start",
                filterTriggerClass,
              )}>
              {isLoading ? (
                <Spinner size="sm" className="text-[#616669]" />
              ) : (
                <Plus size={15} color="#616669" strokeWidth={2.5} />
              )}
              <span>Product</span>
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm sm:max-w-md">
            <DialogHeader className="px-6 py-5">
              <DialogTitle className="text-lg font-semibold text-[#081c16]">
                Product Filter
              </DialogTitle>
              <DialogDescription className="text-sm text-[#616669]">
                Tell me what you want inside this dialog and I will build it next.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Select
          value={selectedStatus}
          onValueChange={setSelectedStatus}
          disabled={isLoading}>
          <SelectTrigger
            className={cn(
              "cursor-pointer",
              filterTriggerClass,
              selectedStatusLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {renderFilterIndicator(selectedStatusLabel, () =>
                setSelectedStatus("all"),
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
            {TRACKING_STATUS_OPTIONS.map((status) => (
              <SelectItem
                key={status.value}
                className={selectItemClass}
                value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAssignee}
          onValueChange={setSelectedAssignee}
          disabled={isLoading}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedAssigneeLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {renderFilterIndicator(selectedAssigneeLabel, () =>
                setSelectedAssignee("all"),
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
            {assigneeOptions.map((owner) => (
              <SelectItem key={owner} className={selectItemClass} value={owner}>
                {owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedDeliveryType}
          onValueChange={setSelectedDeliveryType}
          disabled={isLoading}>
          <SelectTrigger
            className={cn(
              filterTriggerClass,
              selectedDeliveryLabel && activeFilterTriggerClass,
            )}>
            <div className="flex items-center gap-1">
              {renderFilterIndicator(selectedDeliveryLabel, () =>
                setSelectedDeliveryType("all"),
              )}
              <span>Livraison</span>
              {selectedDeliveryLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedDeliveryLabel}</span>
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
              Toutes livraisons
            </SelectItem>
            <SelectItem className={selectItemClass} value="home">
              Home
            </SelectItem>
            <SelectItem className={selectItemClass} value="desk">
              Desk
            </SelectItem>
          </SelectContent>
        </Select>

        <Popover open={isDatePopoverOpen} onOpenChange={handleDatePopoverOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1 justify-start",
                filterTriggerClass,
                selectedDateLabel && activeFilterTriggerClass,
                !dateRange && "text-[#616669]",
              )}>
              {renderFilterIndicator(selectedDateLabel, handleClearDate)}
              <CalendarDays className="size-4 text-[#616669]" />
              <span>Date</span>
              {selectedDateLabel ? (
                <>
                  <span className="text-[#61666966]">|</span>
                  <span className="text-[#081c16]">{selectedDateLabel}</span>
                </>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                {DATE_SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => setDraftDateRange(shortcut.getRange())}
                    className="cursor-pointer text-sm font-medium text-[#081c16] transition-colors hover:text-[#081c16]/70 ">
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="bg-white px-4 py-3"
              style={{
                "--primary": "#081c16",
                "--primary-foreground": "#ffffff",
                "--muted": "#f3f4f6",
                "--muted-foreground": "#6b7280",
                "--ring": "#081c16",
              }}>
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={draftDateRange}
                onSelect={setDraftDateRange}
                initialFocus
                classNames={{
                  months: "relative flex flex-col gap-8 md:flex-row",
                  month: "flex w-full flex-col gap-5",
                  caption_label: "text-[26px] font-semibold text-[#081c16]",
                  weekday: "flex-1 text-xs font-medium text-[#6b7280]",
                  button_previous:
                    "size-8 rounded-full border-0 bg-white text-[#081c16] shadow-none hover:bg-slate-100",
                  button_next:
                    "size-8 rounded-full border-0 bg-white text-[#081c16] shadow-none hover:bg-slate-100",
                  outside: "text-slate-300",
                  disabled: "text-slate-300 opacity-100",
                  today: "rounded-[10px] bg-slate-200 text-[#081c16]",
                  range_middle: "rounded-none bg-slate-100",
                }}
              />
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={handleClearDate}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-[#081c16] transition-colors hover:bg-slate-50">
                <X className="size-4" />
                Clear Date
              </button>
              <button
                type="button"
                onClick={handleApplyDate}
                className="h-11 flex-1 cursor-pointer rounded-2xl bg-[#081c16] text-sm font-semibold text-white transition-colors hover:bg-[#081c16]/90">
                Apply
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <OrdersDataTable
        data={orders}
        isLoading={isLoading}
        isReadOnly
        searchQuery={deferredSearchQuery}
        selectedStatus={selectedStatus}
        selectedAssignee={selectedAssignee}
        selectedDeliveryType={selectedDeliveryType}
        dateRange={dateRange}
        assigneeOptions={assigneeOptions}
      />
    </section>
  );
}
