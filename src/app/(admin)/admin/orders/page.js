"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { CalendarDays, Plus, Search, Truck, X } from "lucide-react";

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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";

import { orders } from "./data";

const DATE_SHORTCUTS = [
  {
    label: "Last 24h",
    getRange: () => ({
      from: subDays(new Date(), 1),
      to: new Date(),
    }),
  },
  {
    label: "7 Days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "30 Days",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "90 Days",
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: "1 Year",
    getRange: () => ({
      from: subDays(new Date(), 364),
      to: new Date(),
    }),
  },
];

function formatDateRangeLabel(range) {
  if (!range?.from) {
    return null;
  }

  if (!range.to) {
    return format(range.from, "LLL dd, y");
  }

  return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
}

export default function Orders() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState();
  const [draftDateRange, setDraftDateRange] = React.useState();
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [isDispatchMode, setIsDispatchMode] = React.useState(false);
  const [dispatchSubmissionId, setDispatchSubmissionId] = React.useState(0);
  const [selectedDispatchOrderIds, setSelectedDispatchOrderIds] =
    React.useState([]);
  const [selectedDispatchAccount, setSelectedDispatchAccount] =
    React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedDeliveryType, setSelectedDeliveryType] = React.useState("all");
  const [selectedAssignee, setSelectedAssignee] = React.useState("all");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const filterTriggerClass =
    "h-9 w-[190px] cursor-pointer rounded-2xl border border-dashed border-[#61666942] bg-white px-2 text-sm font-medium text-[#616669] shadow-none hover:bg-white focus-visible:ring-0 focus-visible:border-[#61666942] data-[state=open]:bg-white [&_svg:last-child]:text-[#616669]";
  const dispatchAccountTriggerClass = "w-[250px]";
  const activeFilterTriggerClass =
    "border-[#081c16] focus-visible:border-[#081c16]";
  const simpleDropdownClass =
    "rounded-2xl border border-slate-200 bg-white p-1.5 text-[#081c16] shadow-sm";
  const selectItemClass =
    "cursor-pointer rounded-xl px-3 py-2 text-sm text-[#081c16] focus:bg-black! focus:text-white! focus:[&_svg]:text-white! focus:[&_span]:text-white! hover:bg-black! hover:text-white! hover:[&_svg]:text-white! hover:[&_span]:text-white!";
  const selectedStatusLabel = selectedStatus === "all" ? null : selectedStatus;
  const selectedDeliveryLabel =
    selectedDeliveryType === "all"
      ? null
      : selectedDeliveryType === "home"
        ? "Home"
        : "Desk";
  const selectedAssigneeLabel =
    selectedAssignee === "all" ? null : selectedAssignee;
  const selectedDispatchAccountLabel =
    selectedDispatchAccount === "all" ? null : selectedDispatchAccount;
  const selectedDateLabel = formatDateRangeLabel(dateRange);
  const canDispatchSelectedOrders =
    selectedDispatchAccount !== "all" && selectedDispatchOrderIds.length > 0;

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

  function handleDispatchModeToggle() {
    setIsDispatchMode((currentValue) => !currentValue);
  }

  function handleDispatchOrders() {
    if (!canDispatchSelectedOrders) {
      return;
    }

    setDispatchSubmissionId((currentValue) => currentValue + 1);
  }

  return (
    <section className="flex flex-col gap-6 px-6 py-5 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <h3 className="text-3xl font-bold">Commandes</h3>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <Link
            href="/admin/orders/new-order"
            className="flex cursor-pointer flex-row items-center gap-1 whitespace-nowrap rounded-sm bg-black px-3 py-2 text-sm text-white">
            <Plus size={16} strokeWidth={3} />
            Cree une commande
          </Link>
          <button
            type="button"
            onClick={handleDispatchModeToggle}
            className={cn(
              "flex cursor-pointer flex-row items-center gap-1 whitespace-nowrap rounded-sm border px-3 py-2 text-sm text-black",
              isDispatchMode && "border-[#081c16] text-[#081c16]",
            )}>
            <Truck size={16} strokeWidth={1} />
            Dispatcher les commandes
          </button>
        </div>
      </div>
      <Separator />
      {isDispatchMode ? (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedDispatchAccount}
            onValueChange={setSelectedDispatchAccount}>
            <SelectTrigger
              className={cn(
                filterTriggerClass,
                dispatchAccountTriggerClass,
                selectedDispatchAccountLabel && activeFilterTriggerClass,
              )}>
              <div className="flex items-center gap-1">
                {selectedDispatchAccountLabel ? (
                  <span
                    onPointerDown={(event) =>
                      handleFilterIconPointerDown(event, () =>
                        setSelectedDispatchAccount("all"),
                      )
                    }
                    className="inline-flex size-4 cursor-pointer items-center justify-center">
                    <X size={15} color="#616669" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Plus size={15} color="#616669" strokeWidth={2.5} />
                )}
                <span>Compte livraison</span>
                {selectedDispatchAccountLabel ? (
                  <>
                    <span className="text-[#61666966]">|</span>
                    <span className="text-[#081c16]">
                      {selectedDispatchAccountLabel}
                    </span>
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
                Selectionner un compte
              </SelectItem>
              {SHOP_OWNERS.map((owner) => (
                <SelectItem key={owner} className={selectItemClass} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleDispatchOrders}
            disabled={!canDispatchSelectedOrders}
            className="h-9 cursor-pointer whitespace-nowrap rounded-sm bg-[#081c16] px-4 text-sm font-medium text-white transition-colors hover:bg-[#081c16]/90 disabled:cursor-not-allowed disabled:bg-[#081c16]/35">
            Dispatcher
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher client ou telephone..."
              className="h-10 cursor-pointer rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-700 shadow-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 justify-start",
                    filterTriggerClass,
                  )}>
                  <Plus size={15} color="#616669" strokeWidth={2.5} />
                  <span>Product</span>
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm sm:max-w-md">
                <DialogHeader className="px-6 py-5">
                  <DialogTitle className="text-lg font-semibold text-[#081c16]">
                    Product Filter
                  </DialogTitle>
                  <DialogDescription className="text-sm text-[#616669]">
                    Tell me what you want inside this dialog and I will build it
                    next.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger
                className={cn(
                  "cursor-pointer",
                  filterTriggerClass,
                  selectedStatusLabel && activeFilterTriggerClass,
                )}>
                <div className="flex items-center gap-1">
                  {selectedStatusLabel ? (
                    <span
                      onPointerDown={(event) =>
                        handleFilterIconPointerDown(event, () =>
                          setSelectedStatus("all"),
                        )
                      }
                      className="inline-flex size-4 cursor-pointer items-center justify-center">
                      <X size={15} color="#616669" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Plus size={15} color="#616669" strokeWidth={2.5} />
                  )}
                  <span>Status</span>
                  {selectedStatusLabel ? (
                    <>
                      <span className="text-[#61666966]">|</span>
                      <span className="text-[#081c16]">
                        {selectedStatusLabel}
                      </span>
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
                  Tous les status
                </SelectItem>
                <SelectItem className={selectItemClass} value="En attente">
                  En attente
                </SelectItem>
                <SelectItem className={selectItemClass} value="Confirme">
                  Confirme
                </SelectItem>
                <SelectItem className={selectItemClass} value="Annuler">
                  Annuler
                </SelectItem>
                <SelectItem className={selectItemClass} value="Programme">
                  Programme
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedAssignee}
              onValueChange={setSelectedAssignee}>
              <SelectTrigger
                className={cn(
                  filterTriggerClass,
                  selectedAssigneeLabel && activeFilterTriggerClass,
                )}>
                <div className="flex items-center gap-1">
                  {selectedAssigneeLabel ? (
                    <span
                      onPointerDown={(event) =>
                        handleFilterIconPointerDown(event, () =>
                          setSelectedAssignee("all"),
                        )
                      }
                      className="inline-flex size-4 cursor-pointer items-center justify-center">
                      <X size={15} color="#616669" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Plus size={15} color="#616669" strokeWidth={2.5} />
                  )}
                  <span>Assignee</span>
                  {selectedAssigneeLabel ? (
                    <>
                      <span className="text-[#61666966]">|</span>
                      <span className="text-[#081c16]">
                        {selectedAssigneeLabel}
                      </span>
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
                All assignees
              </SelectItem>
              {SHOP_OWNERS.map((owner) => (
                <SelectItem key={owner} className={selectItemClass} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

            <Select
              value={selectedDeliveryType}
              onValueChange={setSelectedDeliveryType}>
              <SelectTrigger
                className={cn(
                  filterTriggerClass,
                  selectedDeliveryLabel && activeFilterTriggerClass,
                )}>
                <div className="flex items-center gap-1">
                  {selectedDeliveryLabel ? (
                    <span
                      onPointerDown={(event) =>
                        handleFilterIconPointerDown(event, () =>
                          setSelectedDeliveryType("all"),
                        )
                      }
                      className="inline-flex size-4 cursor-pointer items-center justify-center">
                      <X size={15} color="#616669" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Plus size={15} color="#616669" strokeWidth={2.5} />
                  )}
                  <span>Livraison</span>
                  {selectedDeliveryLabel ? (
                    <>
                      <span className="text-[#61666966]">|</span>
                      <span className="text-[#081c16]">
                        {selectedDeliveryLabel}
                      </span>
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

            <Popover
              open={isDatePopoverOpen}
              onOpenChange={handleDatePopoverOpenChange}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 justify-start",
                    filterTriggerClass,
                    selectedDateLabel && activeFilterTriggerClass,
                    !dateRange && "text-[#616669]",
                  )}>
                  {selectedDateLabel ? (
                    <span
                      onPointerDown={(event) =>
                        handleFilterIconPointerDown(event, handleClearDate)
                      }
                      className="inline-flex size-4 cursor-pointer items-center justify-center">
                      <X size={15} color="#616669" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Plus size={15} color="#616669" strokeWidth={2.5} />
                  )}
                  <CalendarDays className="size-4 text-[#616669]" />
                  <span>Date</span>
                  {selectedDateLabel ? (
                    <>
                      <span className="text-[#61666966]">|</span>
                      <span className="text-[#081c16]">
                        {selectedDateLabel}
                      </span>
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
        </>
      )}
      <OrdersDataTable
        data={orders}
        searchQuery={isDispatchMode ? "" : deferredSearchQuery}
        selectedStatus={isDispatchMode ? "all" : selectedStatus}
        selectedAssignee={isDispatchMode ? "all" : selectedAssignee}
        selectedDeliveryType={isDispatchMode ? "all" : selectedDeliveryType}
        dateRange={isDispatchMode ? undefined : dateRange}
        isDispatchMode={isDispatchMode}
        dispatchAccount={selectedDispatchAccount}
        dispatchSubmissionId={dispatchSubmissionId}
        onDispatchSelectionChange={setSelectedDispatchOrderIds}
      />
    </section>
  );
}
