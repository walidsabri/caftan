"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronRight,
  ChevronDown,
  House,
  Package,
  Search,
  Store,
  User,
  CreditCard,
} from "lucide-react";

import algeriaCities from "@/lib/algeria_cities.json";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  wilaya: "",
  commune: "",
  address: "",
  delivery: "",
};

const adminDialogInputClass =
  "h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";

const adminDialogLabelClass = "text-sm font-medium text-[#081c16]";
const adminDialogSelectTriggerClass =
  "h-10 w-full rounded-lg border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none data-placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const adminDialogSelectContentClass =
  "rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm";
const adminDialogSelectItemClass =
  "cursor-pointer rounded-md px-3 py-2.5 text-sm text-[#081c16] focus:bg-slate-50 focus:text-[#081c16]";
const searchableSelectTriggerClass =
  "flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#081c16] shadow-none outline-none transition-colors hover:bg-slate-50 focus-visible:border-[#081c16] focus-visible:ring-2 focus-visible:ring-[#081c16]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[#616669]/70";
const searchableSelectContentClass =
  "gap-0 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm";
const searchableSelectSearchClass =
  "h-9 rounded-md border-slate-200 bg-white pl-9 pr-3 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10";
const searchableSelectItemClass =
  "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm text-[#081c16] transition-colors hover:bg-slate-50";

const DELIVERY_OPTIONS = [
  {
    value: "At Desk",
    label: "At Desk",
    icon: Store,
  },
  {
    value: "At Home",
    label: "At Home",
    icon: House,
  },
];

const wilayaIndex = algeriaCities.reduce((accumulator, city) => {
  const wilayaName = city.wilaya_name_ascii;
  const communeName = city.commune_name_ascii;

  if (!accumulator[wilayaName]) {
    accumulator[wilayaName] = {
      code: city.wilaya_code,
      name: wilayaName,
      nameArabic: city.wilaya_name,
      communes: {},
    };
  }

  if (!accumulator[wilayaName].communes[communeName]) {
    accumulator[wilayaName].communes[communeName] = {
      value: communeName,
      label: `${communeName} - ${city.commune_name}`,
    };
  }

  return accumulator;
}, {});

const wilayaOptions = Object.values(wilayaIndex)
  .sort(
    (firstWilaya, secondWilaya) =>
      Number(firstWilaya.code) - Number(secondWilaya.code),
  )
  .map((wilaya) => ({
    value: wilaya.name,
    label: `${wilaya.code} - ${wilaya.name} - ${wilaya.nameArabic}`,
  }));

const wilayaLabelByValue = Object.fromEntries(
  wilayaOptions.map((wilaya) => [wilaya.value, wilaya.label]),
);

const communesByWilaya = Object.fromEntries(
  Object.values(wilayaIndex).map((wilaya) => [
    wilaya.name,
    Object.values(wilaya.communes).sort((firstCommune, secondCommune) =>
      firstCommune.value.localeCompare(secondCommune.value),
    ),
  ]),
);

const communeLabelByWilaya = Object.fromEntries(
  Object.entries(communesByWilaya).map(([wilayaName, communes]) => [
    wilayaName,
    Object.fromEntries(
      communes.map((commune) => [commune.value, commune.label]),
    ),
  ]),
);

function SearchableSelect({
  disabled = false,
  emptyText,
  onOpenChange,
  onSearchChange,
  onSelect,
  open,
  options,
  placeholder,
  searchPlaceholder,
  searchValue,
  selectedLabel,
  selectedValue,
  triggerId,
}) {
  const contentId = `${triggerId}-content`;
  const listRef = useRef(null);

  function handleListWheel(event) {
    if (!listRef.current) {
      return;
    }

    const listElement = listRef.current;
    const canScroll = listElement.scrollHeight > listElement.clientHeight;

    if (!canScroll) {
      return;
    }

    event.preventDefault();
    listElement.scrollTop += event.deltaY;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={triggerId}
          type="button"
          role="combobox"
          aria-controls={contentId}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={searchableSelectTriggerClass}>
          <span
            className={
              selectedLabel ? "truncate" : "truncate text-[#616669]/70"
            }>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown size={16} className="shrink-0 text-[#616669]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        id={contentId}
        align="start"
        side="bottom"
        sideOffset={4}
        className={searchableSelectContentClass}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        onWheel={handleListWheel}>
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className={searchableSelectSearchClass}
          />
        </div>

        <div
          ref={listRef}
          role="listbox"
          className="max-h-64 overflow-y-auto overscroll-contain">
          {options.length ? (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={searchableSelectItemClass}
                onClick={() => onSelect(option.value)}>
                <span className="truncate">{option.label}</span>
                {selectedValue === option.value ? (
                  <Check size={16} className="shrink-0 text-[#081c16]" />
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-2.5 py-3 text-sm text-[#616669]">
              {emptyText}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function NewOrder() {
  const [customer, setCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [isWilayaOpen, setIsWilayaOpen] = useState(false);
  const [isCommuneOpen, setIsCommuneOpen] = useState(false);
  const [wilayaSearchQuery, setWilayaSearchQuery] = useState("");
  const [communeSearchQuery, setCommuneSearchQuery] = useState("");

  const communeOptions = communesByWilaya[customerForm.wilaya] ?? [];
  const selectedWilayaLabel = wilayaLabelByValue[customerForm.wilaya] ?? "";
  const selectedCommuneLabel =
    communeLabelByWilaya[customerForm.wilaya]?.[customerForm.commune] ?? "";
  const filteredWilayaOptions = wilayaOptions.filter((wilaya) =>
    wilaya.label.toLowerCase().includes(wilayaSearchQuery.trim().toLowerCase()),
  );
  const filteredCommuneOptions = communeOptions.filter((commune) =>
    commune.label
      .toLowerCase()
      .includes(communeSearchQuery.trim().toLowerCase()),
  );
  const customerDeliveryOption = DELIVERY_OPTIONS.find(
    (option) => option.value === customer?.delivery,
  );
  const isCustomerFormValid =
    customerForm.name.trim() &&
    customerForm.phone.trim() &&
    customerForm.wilaya &&
    customerForm.commune &&
    customerForm.address.trim() &&
    customerForm.delivery.trim();

  function openCustomerDialog() {
    setCustomerForm(customer ? { ...customer } : { ...EMPTY_CUSTOMER });
    setIsCustomerDialogOpen(true);
    setIsWilayaOpen(false);
    setIsCommuneOpen(false);
    setWilayaSearchQuery("");
    setCommuneSearchQuery("");
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;

    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      [name]: value,
    }));
  }

  function handleWilayaChange(value) {
    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      wilaya: value,
      commune: "",
    }));
    setIsWilayaOpen(false);
    setIsCommuneOpen(false);
    setWilayaSearchQuery("");
    setCommuneSearchQuery("");
  }

  function handleCommuneChange(value) {
    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      commune: value,
    }));
    setIsCommuneOpen(false);
    setCommuneSearchQuery("");
  }

  function handleDeliveryChange(value) {
    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      delivery: value,
    }));
  }

  function handleCustomerSubmit(event) {
    event.preventDefault();
    if (!isCustomerFormValid) {
      return;
    }

    setCustomer({
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      wilaya: customerForm.wilaya,
      commune: customerForm.commune,
      address: customerForm.address.trim(),
      delivery: customerForm.delivery.trim(),
    });
    setIsCustomerDialogOpen(false);
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5 lg:px-10">
      <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-3">
        <Link
          className="text-2xl font-bold text-[#616669] sm:text-3xl"
          href="/admin/orders">
          Commandes
        </Link>
        <ChevronRight
          size={24}
          color="#616669"
          strokeWidth={3}
          className="sm:size-[30px]"
        />
        <h3 className="text-2xl font-bold sm:text-3xl">Nouvelle commande</h3>
      </div>

      <Separator />

      <div className="flex flex-col gap-4 sm:gap-6 xl:flex-row xl:items-start">
        <div className="contents xl:flex xl:flex-1 xl:flex-col xl:gap-6">
          <div className="order-1 flex min-h-40 flex-col items-stretch gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:p-5 xl:order-none">
            <div className="flex flex-row items-center gap-1 text-lg font-semibold text-[#081c16]">
              <Package size={16} color="#081c16" strokeWidth={3} />
              Produit
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="w-full rounded-sm bg-black px-2 py-2 text-sm font-medium text-white sm:w-auto sm:py-1">
                  Browse products
                </button>
              </DialogTrigger>
              <DialogContent className="min-h-72 rounded-2xl border border-slate-200 bg-white" />
            </Dialog>
          </div>

          <div className="order-4 flex min-h-32 flex-col gap-5 rounded-[22px] border border-slate-200 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:p-5 xl:order-none">
            <div className="flex flex-row items-center justify-start gap-2 text-lg font-semibold text-[#081c16]">
              <CreditCard size={18} color="#081c16" strokeWidth={2.4} />
              Paiement
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200  p-4">
              <p className="flex items-center justify-between gap-3 text-sm text-[#616669]">
                Produit :{" "}
                <span className="text-base font-semibold text-[#081c16]">
                  DZD 10000da
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 text-sm text-[#616669]">
                Livraison :{" "}
                <span className="text-base font-semibold text-[#081c16]">
                  DZD 500da
                </span>
              </p>
              <Separator className="bg-slate-200" />
              <p className="flex items-center justify-between gap-3 text-sm font-semibold text-[#081c16]">
                TOTAL :
                <span className="text-lg font-bold sm:text-xl">
                  DZD 10500da
                </span>
              </p>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row ">
                <button
                  type="button"
                  className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-none text-[#081c16] transition-colors hover:bg-slate-50 sm:min-h-11 sm:py-2.5">
                  Annuler
                </button>
                <button
                  type="button"
                  className="min-h-14 flex-1 rounded-2xl bg-[#081c16] px-4 py-3 text-sm font-semibold leading-none text-white transition-colors hover:bg-[#081c16]/90 sm:min-h-11 sm:py-2.5">
                  Creer la commande
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="order-2 flex w-full flex-col gap-4 sm:max-w-sm xl:order-none xl:self-start">
          <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:gap-6 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
                <User size={17} color="#081c16" strokeWidth={2.2} />
                Client
              </div>

              <Button
                type="button"
                className="w-full rounded-full bg-[#08251f] px-4 text-sm font-semibold text-white hover:bg-[#0b3129] sm:w-auto"
                onClick={openCustomerDialog}>
                {customer ? "Modifier le client" : "Ajouter un Client"}
              </Button>
            </div>

            {customer ? (
              <>
                <div className="grid grid-cols-1 gap-y-2 text-[#081c16] sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-4">
                  <span className="text-sm font-semibold sm:text-lg">
                    Full name:
                  </span>
                  <span className="min-w-0 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {customer.name}
                  </span>

                  <span className="text-sm font-semibold sm:text-lg">
                    Phone:
                  </span>
                  <span className="min-w-0 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {customer.phone}
                  </span>

                  <span className="text-sm font-semibold sm:text-lg">
                    Wilaya:
                  </span>
                  <span className="min-w-0 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {wilayaLabelByValue[customer.wilaya] ?? customer.wilaya}
                  </span>

                  <span className="text-sm font-semibold sm:text-lg">
                    Commune:
                  </span>
                  <span className="min-w-0 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {communeLabelByWilaya[customer.wilaya]?.[
                      customer.commune
                    ] ?? customer.commune}
                  </span>

                  <span className="text-sm font-semibold sm:text-lg">
                    Address:
                  </span>
                  <span className="min-w-0 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {customer.address}
                  </span>

                  <span className="text-sm font-semibold sm:text-lg">
                    Delivery:
                  </span>
                  <span className="flex min-w-0 items-center gap-2 break-words text-sm sm:justify-self-end sm:text-right sm:text-base">
                    {customerDeliveryOption ? (
                      <customerDeliveryOption.icon
                        size={16}
                        color="#081c16"
                        strokeWidth={2.2}
                      />
                    ) : (
                      <Building2 size={16} color="#081c16" strokeWidth={2.2} />
                    )}
                    {customer.delivery}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-slate-200 text-sm font-semibold text-[#081c16] hover:bg-slate-50 sm:h-11"
                  onClick={openCustomerDialog}>
                  Modifier client
                </Button>
              </>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500 sm:min-h-52 sm:px-6">
                Add the customer from the dialog and their information will show
                here automatically.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="text-lg font-semibold text-[#081c16]">Assignee</div>
            <Select
              value={selectedAssignee || undefined}
              onValueChange={setSelectedAssignee}>
              <SelectTrigger className={adminDialogSelectTriggerClass}>
                <SelectValue placeholder="Select assigned" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={6}
                className={adminDialogSelectContentClass}>
                {SHOP_OWNERS.map((assignee) => (
                  <SelectItem
                    key={assignee}
                    value={assignee}
                    className={adminDialogSelectItemClass}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Dialog
        open={isCustomerDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsCustomerDialogOpen(nextOpen);

          if (!nextOpen) {
            setIsWilayaOpen(false);
            setIsCommuneOpen(false);
            setWilayaSearchQuery("");
            setCommuneSearchQuery("");
          }
        }}>
        <DialogContent className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm sm:max-w-md">
          <DialogHeader className="gap-1 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle className="text-lg font-semibold text-[#081c16]">
              {customer ? "Modifier le client" : "Ajouter un client"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#616669]">
              Enregistrez les informations du client, elles apparaitront dans sa
              fiche.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5"
            onSubmit={handleCustomerSubmit}>
            <div className="grid gap-3">
              <Label htmlFor="customer-name" className={adminDialogLabelClass}>
                Full name :
              </Label>
              <Input
                id="customer-name"
                name="name"
                placeholder="Full name"
                value={customerForm.name}
                onChange={handleCustomerChange}
                autoComplete="name"
                required
                className={adminDialogInputClass}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="customer-phone" className={adminDialogLabelClass}>
                Phone :
              </Label>
              <Input
                id="customer-phone"
                name="phone"
                placeholder="+2135XXXXXXXX"
                value={customerForm.phone}
                onChange={handleCustomerChange}
                autoComplete="tel"
                required
                className={adminDialogInputClass}
              />
            </div>

            <div className="grid gap-3">
              <Label
                htmlFor="customer-wilaya"
                className={adminDialogLabelClass}>
                Wilaya :
              </Label>
              <SearchableSelect
                triggerId="customer-wilaya"
                open={isWilayaOpen}
                onOpenChange={setIsWilayaOpen}
                options={filteredWilayaOptions}
                selectedLabel={selectedWilayaLabel}
                selectedValue={customerForm.wilaya}
                placeholder="Select a wilaya"
                searchPlaceholder="Search wilaya..."
                searchValue={wilayaSearchQuery}
                onSearchChange={setWilayaSearchQuery}
                onSelect={handleWilayaChange}
                emptyText="No wilaya found."
              />
            </div>

            <div className="grid gap-3">
              <Label
                htmlFor="customer-commune"
                className={adminDialogLabelClass}>
                Commune :
              </Label>
              <SearchableSelect
                triggerId="customer-commune"
                open={isCommuneOpen}
                onOpenChange={setIsCommuneOpen}
                options={filteredCommuneOptions}
                selectedLabel={selectedCommuneLabel}
                selectedValue={customerForm.commune}
                placeholder={
                  customerForm.wilaya
                    ? "Select a commune"
                    : "Select a wilaya first"
                }
                searchPlaceholder="Search commune..."
                searchValue={communeSearchQuery}
                onSearchChange={setCommuneSearchQuery}
                onSelect={handleCommuneChange}
                emptyText="No commune found."
                disabled={!customerForm.wilaya}
              />
            </div>

            <div className="grid gap-3">
              <Label
                htmlFor="customer-address"
                className={adminDialogLabelClass}>
                Addresse :
              </Label>
              <Input
                id="customer-address"
                name="address"
                placeholder="city aadl pepeniere"
                value={customerForm.address}
                onChange={handleCustomerChange}
                autoComplete="street-address"
                required
                className={adminDialogInputClass}
              />
            </div>

            <div className="grid gap-3">
              <Label
                htmlFor="customer-delivery"
                className={adminDialogLabelClass}>
                Livraison :
              </Label>
              <Select
                value={customerForm.delivery || undefined}
                onValueChange={handleDeliveryChange}>
                <SelectTrigger
                  id="customer-delivery"
                  className={adminDialogSelectTriggerClass}>
                  <SelectValue placeholder="Select delivery type" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={6}
                  className={adminDialogSelectContentClass}>
                  {DELIVERY_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={adminDialogSelectItemClass}>
                      <span className="flex items-center gap-2">
                        <option.icon
                          size={16}
                          color="#616669"
                          strokeWidth={2.2}
                        />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-14 flex-1 rounded-2xl border-slate-200 px-4 py-3 text-sm font-semibold leading-none text-[#081c16] hover:bg-slate-50 sm:min-h-11 sm:py-2.5"
                onClick={() => setIsCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isCustomerFormValid}
                className="min-h-14 flex-1 rounded-2xl bg-[#08251f] px-4 py-3 text-sm font-semibold leading-none text-white hover:bg-[#0b3129] sm:min-h-11 sm:py-2.5">
                Save Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
