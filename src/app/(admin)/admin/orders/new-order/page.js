"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  House,
  Package,
  Search,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";

import algeriaCities from "@/lib/algeria_cities.json";
import { formatPrice } from "@/lib/format-price";
import { useShippingRates } from "@/hooks/use-shipping-rates";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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
    value: "desk",
    label: "Livraison au bureau",
    icon: Store,
  },
  {
    value: "home",
    label: "Livraison a domicile",
    icon: House,
  },
];

function normalizeLocationName(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function buildVariantLabel(item) {
  return [item.colorName, item.sizeName].filter(Boolean).join(" / ");
}

function formatPieceLabel(value) {
  return `${value} piece${value > 1 ? "s" : ""}`;
}

function getOwnerStockState(ownerAvailability, quantity) {
  if (ownerAvailability.availableQuantity >= quantity) {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      text: `${ownerAvailability.availableQuantity} en stock`,
    };
  }

  return {
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    text:
      ownerAvailability.availableQuantity > 0
        ? `${ownerAvailability.availableQuantity} dispo`
        : "Out of stock",
  };
}

function getAutoSelectedOwner(ownerAvailability, quantity) {
  const eligibleOwners = ownerAvailability.filter(
    (owner) => owner.availableQuantity >= quantity,
  );

  return eligibleOwners.length === 1 ? eligibleOwners[0].ownerName : "";
}

function getCustomerValidationErrors(customer) {
  const errors = [];
  const phone = normalizePhone(customer?.phone);

  if (!customer?.name?.trim()) {
    errors.push("Veuillez entrer le nom complet du client.");
  }

  if (!phone) {
    errors.push("Veuillez entrer le numero de telephone du client.");
  } else if (phone.length !== 10) {
    errors.push("Le numero doit contenir exactement 10 chiffres.");
  } else if (!/^(05|06|07)/.test(phone)) {
    errors.push("Le numero doit commencer par 05, 06 ou 07.");
  }

  if (!customer?.wilaya) {
    errors.push("Veuillez selectionner une wilaya.");
  }

  if (!customer?.commune) {
    errors.push("Veuillez selectionner une commune.");
  }

  if (!customer?.address?.trim()) {
    errors.push("Veuillez entrer une adresse.");
  }

  if (!customer?.delivery) {
    errors.push("Veuillez choisir un mode de livraison.");
  }

  return errors;
}

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
  const listRef = React.useRef(null);

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

const wilayaNameCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

const wilayaOptions = Array.from(
  algeriaCities
    .reduce((wilayas, location) => {
      const wilayaName = normalizeLocationName(location.wilaya_name_ascii);
      const communeName = normalizeLocationName(location.commune_name_ascii);
      const currentWilaya = wilayas.get(wilayaName) ?? {
        code: location.wilaya_code,
        name: wilayaName,
        nameArabic: location.wilaya_name,
        communes: new Set(),
      };

      currentWilaya.communes.add(
        JSON.stringify({
          nameAscii: communeName,
          nameArabic: location.commune_name,
        }),
      );
      wilayas.set(wilayaName, currentWilaya);

      return wilayas;
    }, new Map())
    .values(),
)
  .sort((left, right) => Number(left.code) - Number(right.code))
  .map((wilaya) => ({
    code: wilaya.code,
    value: wilaya.name,
    label: `${wilaya.code} - ${wilaya.name} - ${wilaya.nameArabic}`,
    communes: Array.from(wilaya.communes)
      .map((commune) => JSON.parse(commune))
      .sort((left, right) =>
        wilayaNameCollator.compare(left.nameAscii, right.nameAscii),
      )
      .map((commune) => ({
        value: commune.nameAscii,
        label: `${commune.nameAscii} - ${commune.nameArabic}`,
      })),
  }));

const wilayaLabelByValue = Object.fromEntries(
  wilayaOptions.map((wilaya) => [wilaya.value, wilaya.label]),
);

const communesByWilaya = Object.fromEntries(
  wilayaOptions.map((wilaya) => [wilaya.value, wilaya.communes]),
);

const communeLabelByWilaya = Object.fromEntries(
  wilayaOptions.map((wilaya) => [
    wilaya.value,
    Object.fromEntries(
      wilaya.communes.map((commune) => [commune.value, commune.label]),
    ),
  ]),
);

export default function NewOrderPage() {
  const router = useRouter();
  const [customer, setCustomer] = React.useState(null);
  const [customerForm, setCustomerForm] = React.useState(EMPTY_CUSTOMER);
  const [selectedItems, setSelectedItems] = React.useState([]);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = React.useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = React.useState(false);
  const [customerDialogError, setCustomerDialogError] = React.useState("");
  const [productsError, setProductsError] = React.useState("");
  const [submissionError, setSubmissionError] = React.useState("");
  const [validationMessages, setValidationMessages] = React.useState([]);
  const [availableProducts, setAvailableProducts] = React.useState([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [selectedDialogProductId, setSelectedDialogProductId] = React.useState("");
  const [selectedDialogColorName, setSelectedDialogColorName] = React.useState("");
  const [selectedDialogSizeName, setSelectedDialogSizeName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isWilayaOpen, setIsWilayaOpen] = React.useState(false);
  const [isCommuneOpen, setIsCommuneOpen] = React.useState(false);
  const [wilayaSearchQuery, setWilayaSearchQuery] = React.useState("");
  const [communeSearchQuery, setCommuneSearchQuery] = React.useState("");

  const deferredProductSearchQuery = React.useDeferredValue(productSearchQuery);

  const selectedCustomerWilaya = React.useMemo(
    () => wilayaOptions.find((wilaya) => wilaya.value === customer?.wilaya),
    [customer?.wilaya],
  );
  const previewCustomerWilaya = React.useMemo(
    () => wilayaOptions.find((wilaya) => wilaya.value === customerForm.wilaya),
    [customerForm.wilaya],
  );

  const communeOptions = communesByWilaya[customerForm.wilaya] ?? [];
  const selectedWilayaLabel = wilayaLabelByValue[customerForm.wilaya] ?? "";
  const selectedCommuneLabel =
    communeLabelByWilaya[customerForm.wilaya]?.[customerForm.commune] ?? "";
  const filteredWilayaOptions = wilayaOptions.filter((wilaya) =>
    wilaya.label
      .toLowerCase()
      .includes(wilayaSearchQuery.trim().toLowerCase()),
  );
  const filteredCommuneOptions = communeOptions.filter((commune) =>
    commune.label
      .toLowerCase()
      .includes(communeSearchQuery.trim().toLowerCase()),
  );

  const customerDeliveryOption = DELIVERY_OPTIONS.find(
    (option) => option.value === customer?.delivery,
  );

  const filteredProducts = React.useMemo(() => {
    const normalizedQuery = deferredProductSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableProducts;
    }

    return availableProducts.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [availableProducts, deferredProductSearchQuery]);

  const selectedDialogProduct = React.useMemo(
    () =>
      availableProducts.find((product) => product.id === selectedDialogProductId) ??
      null,
    [availableProducts, selectedDialogProductId],
  );

  const selectedDialogColorOptions = React.useMemo(() => {
    if (!selectedDialogProduct) {
      return [];
    }

    const colorsMap = new Map();

    selectedDialogProduct.variants.forEach((variant) => {
      const currentQuantity = colorsMap.get(variant.colorName) ?? 0;
      colorsMap.set(
        variant.colorName,
        currentQuantity + Number(variant.availableQuantity || 0),
      );
    });

    return Array.from(colorsMap.entries())
      .map(([colorName, availableQuantity]) => ({
        colorName,
        availableQuantity,
      }))
      .sort((firstColor, secondColor) =>
        firstColor.colorName.localeCompare(secondColor.colorName),
      );
  }, [selectedDialogProduct]);

  const selectedDialogSizeOptions = React.useMemo(() => {
    if (!selectedDialogProduct || !selectedDialogColorName) {
      return [];
    }

    return selectedDialogProduct.variants
      .filter((variant) => variant.colorName === selectedDialogColorName)
      .map((variant) => ({
        sizeName: variant.sizeName,
        availableQuantity: variant.availableQuantity,
      }))
      .sort((firstSize, secondSize) =>
        firstSize.sizeName.localeCompare(secondSize.sizeName),
      );
  }, [selectedDialogColorName, selectedDialogProduct]);

  const selectedDialogVariant = React.useMemo(() => {
    if (
      !selectedDialogProduct ||
      !selectedDialogColorName ||
      !selectedDialogSizeName
    ) {
      return null;
    }

    return (
      selectedDialogProduct.variants.find(
        (variant) =>
          variant.colorName === selectedDialogColorName &&
          variant.sizeName === selectedDialogSizeName,
      ) ?? null
    );
  }, [
    selectedDialogColorName,
    selectedDialogProduct,
    selectedDialogSizeName,
  ]);

  const subtotal = React.useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
        0,
      ),
    [selectedItems],
  );

  const {
    shippingFee,
    shippingLoading,
    shippingError,
  } = useShippingRates({
    wilaya: customer?.wilaya,
    wilayaCode: selectedCustomerWilaya?.code,
    commune: customer?.commune,
    shippingMethod: customer?.delivery,
    enabled: Boolean(
      customer?.wilaya && selectedCustomerWilaya?.code && customer?.delivery,
    ),
  });

  const {
    shippingFee: previewShippingFee,
    shippingLoading: previewShippingLoading,
    shippingError: previewShippingError,
  } = useShippingRates({
    wilaya: customerForm.wilaya,
    wilayaCode: previewCustomerWilaya?.code,
    commune: customerForm.commune,
    shippingMethod: customerForm.delivery,
    enabled: Boolean(
      isCustomerDialogOpen &&
        customerForm.wilaya &&
        previewCustomerWilaya?.code &&
        customerForm.delivery,
    ),
  });

  const total = subtotal + (shippingFee ?? 0);
  const isCustomerFormValid =
    customerForm.name.trim() &&
    customerForm.phone.trim() &&
    customerForm.wilaya &&
    customerForm.commune &&
    customerForm.address.trim() &&
    customerForm.delivery.trim();

  React.useEffect(() => {
    if (!isProductDialogOpen) {
      setProductSearchQuery("");
      setSelectedDialogProductId("");
      setSelectedDialogColorName("");
      setSelectedDialogSizeName("");
      return;
    }

    let isCancelled = false;

    async function loadProducts() {
      setProductsLoading(true);
      setProductsError("");

      try {
        const response = await fetch("/api/admin/orders", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load products.");
        }

        if (!isCancelled) {
          setAvailableProducts(result.products || []);
        }
      } catch (error) {
        if (!isCancelled) {
          setProductsError(
            error instanceof Error ? error.message : "Failed to load products.",
          );
        }
      } finally {
        if (!isCancelled) {
          setProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [isProductDialogOpen]);

  React.useEffect(() => {
    setSubmissionError("");
    setValidationMessages([]);
  }, [customer, selectedItems]);

  function openCustomerDialog() {
    setCustomerDialogError("");
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
    setCustomerDialogError("");
  }

  function handleWilayaChange(value) {
    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      wilaya: value,
      commune: "",
    }));
    setCustomerDialogError("");
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
    setCustomerDialogError("");
    setIsCommuneOpen(false);
    setCommuneSearchQuery("");
  }

  function handleDeliveryChange(value) {
    setCustomerForm((currentCustomerForm) => ({
      ...currentCustomerForm,
      delivery: value,
    }));
    setCustomerDialogError("");
  }

  function handleCustomerSubmit(event) {
    event.preventDefault();

    const errors = getCustomerValidationErrors(customerForm);

    if (errors.length) {
      setCustomerDialogError(errors[0]);
      return;
    }

    setCustomer({
      name: customerForm.name.trim(),
      phone: normalizePhone(customerForm.phone),
      wilaya: customerForm.wilaya,
      commune: customerForm.commune,
      address: customerForm.address.trim(),
      delivery: customerForm.delivery,
    });
    setCustomerDialogError("");
    setIsCustomerDialogOpen(false);
  }

  function handleSelectDialogProduct(productId) {
    setSelectedDialogProductId(productId);
    setSelectedDialogColorName("");
    setSelectedDialogSizeName("");
  }

  function handleSelectDialogColor(colorName) {
    setSelectedDialogColorName(colorName);
    setSelectedDialogSizeName("");
  }

  function handleSelectDialogSize(sizeName) {
    setSelectedDialogSizeName(sizeName);
  }

  function handleSelectVariant(product, variant) {
    setSelectedItems((currentItems) => {
      const existingItem = currentItems.find(
        (currentItem) => currentItem.variantId === variant.id,
      );

      if (existingItem) {
        const nextQuantity = Math.min(
          existingItem.quantity + 1,
          existingItem.availableQuantity,
        );

        return currentItems.map((currentItem) =>
          currentItem.variantId === variant.id
            ? {
                ...currentItem,
                quantity: nextQuantity,
              }
            : currentItem,
        );
      }

      return [
        ...currentItems,
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          category: product.category,
          image: product.image,
          unitPrice: product.price,
          colorName: variant.colorName,
          sizeName: variant.sizeName,
          quantity: 1,
          availableQuantity: variant.availableQuantity,
          ownerAvailability: variant.ownerAvailability,
          selectedOwner: getAutoSelectedOwner(variant.ownerAvailability, 1),
        },
      ];
    });

    setIsProductDialogOpen(false);
  }

  function handleAddSelectedVariant() {
    if (!selectedDialogProduct || !selectedDialogVariant) {
      return;
    }

    handleSelectVariant(selectedDialogProduct, selectedDialogVariant);
  }

  function handleRemoveItem(variantId) {
    setSelectedItems((currentItems) =>
      currentItems.filter((item) => item.variantId !== variantId),
    );
  }

  function handleQuantityChange(variantId, rawValue) {
    const parsedValue = Number.parseInt(String(rawValue || ""), 10);

    setSelectedItems((currentItems) =>
      currentItems.map((item) => {
        if (item.variantId !== variantId) {
          return item;
        }

        const nextQuantity = Number.isInteger(parsedValue)
          ? Math.min(Math.max(parsedValue, 1), item.availableQuantity)
          : 1;

        return {
          ...item,
          quantity: nextQuantity,
        };
      }),
    );
  }

  function handleToggleOwner(variantId, ownerName) {
    setSelectedItems((currentItems) =>
      currentItems.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              selectedOwner: item.selectedOwner === ownerName ? "" : ownerName,
            }
          : item,
      ),
    );
  }

  function validateOrderDraft() {
    const errors = [];

    if (!customer) {
      errors.push("Ajoutez d'abord les informations du client.");
    } else {
      errors.push(...getCustomerValidationErrors(customer));
    }

    if (!selectedItems.length) {
      errors.push("Ajoutez au moins un produit a la commande.");
    }

    if (shippingLoading) {
      errors.push(
        "Le tarif de livraison est en cours de chargement. Veuillez patienter.",
      );
    } else if (customer && shippingFee === null) {
      errors.push(
        shippingError ||
          "Aucun tarif ZR Express n'est disponible pour cette commande.",
      );
    }

    selectedItems.forEach((item) => {
      if (item.quantity > item.availableQuantity) {
        errors.push(
          `${item.productName} (${buildVariantLabel(item)}): la quantite depasse le stock disponible.`,
        );
      }

      if (item.selectedOwner) {
        const selectedOwnerAvailability =
          item.ownerAvailability.find(
            (owner) => owner.ownerName === item.selectedOwner,
          )?.availableQuantity ?? 0;

        if (selectedOwnerAvailability < item.quantity) {
          errors.push(
            `${item.selectedOwner} n'a pas assez de stock pour ${item.productName} (${buildVariantLabel(item)}).`,
          );
        }
      }
    });

    return errors;
  }

  async function handleCreateOrder() {
    setSubmissionError("");
    const errors = validateOrderDraft();

    if (errors.length) {
      setValidationMessages(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: customer.name,
          phone: customer.phone,
          wilaya: customer.wilaya,
          wilayaCode: selectedCustomerWilaya?.code ?? null,
          commune: customer.commune,
          address: customer.address,
          shippingMethod: customer.delivery,
          items: selectedItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            ownerName: item.selectedOwner,
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible d'enregistrer la commande.",
        );
      }

      if (Array.isArray(result.assignmentWarnings) && result.assignmentWarnings.length) {
        window.alert(
          `Commande creee avec avertissement:\n${result.assignmentWarnings.join("\n")}`,
        );
      }

      router.replace("/admin/orders");
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la commande.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="order-1 flex min-h-40 flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5 xl:order-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-[#081c16]">
                <Package size={18} color="#081c16" strokeWidth={2.4} />
                Produit
              </div>

              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full bg-[#08251f] px-4 text-sm font-semibold text-white hover:bg-[#0b3129]">
                    Browse products
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm sm:max-w-5xl">
                  <DialogHeader className="gap-1 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                    <DialogTitle className="text-lg font-semibold text-[#081c16]">
                      Produits disponibles
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#616669]">
                      Recherchez un produit puis choisissez la variante a ajouter
                      a la commande.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={productSearchQuery}
                        onChange={(event) =>
                          setProductSearchQuery(event.target.value)
                        }
                        placeholder="Search by product name..."
                        className="h-10 rounded-xl border-slate-200 bg-white pl-10 pr-4 text-sm text-[#081c16] shadow-none placeholder:text-[#616669]/70 focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10"
                      />
                    </div>

                    {productsError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {productsError}
                      </div>
                    ) : null}

                    <div className="max-h-[56vh] overflow-y-auto pr-1">
                      {productsLoading ? (
                        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                          <Spinner size="lg" className="text-[#081c16]" />
                          <span>Chargement des produits disponibles...</span>
                        </div>
                      ) : filteredProducts.length ? (
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                          <div className="grid gap-4">
                            {filteredProducts.map((product) => {
                              const isSelected =
                                selectedDialogProductId === product.id;

                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => handleSelectDialogProduct(product.id)}
                                  className={cn(
                                    "rounded-2xl border p-4 text-left transition-colors",
                                    isSelected
                                      ? "border-[#081c16] bg-slate-50"
                                      : "border-slate-200 hover:border-[#081c16]/30 hover:bg-slate-50/70",
                                  )}>
                                  <div className="flex gap-4">
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                      {product.image ? (
                                        <Image
                                          src={product.image}
                                          alt={product.name}
                                          fill
                                          unoptimized
                                          sizes="80px"
                                          className="object-cover"
                                        />
                                      ) : null}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-base font-semibold text-[#081c16]">
                                            {product.name}
                                          </p>
                                          <p className="text-sm text-slate-500">
                                            {product.category}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-[#081c16]">
                                            {formatPrice(product.price)}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {formatPieceLabel(product.availableQuantity)}
                                          </p>
                                        </div>
                                      </div>

                                      <p className="pt-2 text-xs text-slate-500">
                                        Choisissez d&apos;abord ce produit pour voir
                                        ses couleurs puis ses tailles
                                        disponibles.
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="rounded-2xl border border-slate-200 p-4">
                            {selectedDialogProduct ? (
                              <div className="flex h-full flex-col gap-5">
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-[#081c16]">
                                    {selectedDialogProduct.name}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {selectedDialogProduct.category}
                                  </p>
                                  <p className="text-sm font-semibold text-[#081c16]">
                                    {formatPrice(selectedDialogProduct.price)}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <div className="text-sm font-semibold text-[#081c16]">
                                    1. Choisir une couleur
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedDialogColorOptions.map((color) => (
                                      <button
                                        key={`${selectedDialogProduct.id}-${color.colorName}`}
                                        type="button"
                                        onClick={() =>
                                          handleSelectDialogColor(color.colorName)
                                        }
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                                          selectedDialogColorName === color.colorName
                                            ? "border-[#081c16] bg-[#081c16] text-white"
                                            : "border-slate-200 bg-white text-[#081c16] hover:bg-slate-50",
                                        )}>
                                        <span>{color.colorName}</span>
                                        <span
                                          className={cn(
                                            "rounded-full border px-2 py-0.5 text-xs font-semibold",
                                            selectedDialogColorName === color.colorName
                                              ? "border-white/20 bg-white/10 text-white"
                                              : "border-slate-200 bg-slate-50 text-slate-500",
                                          )}>
                                          {color.availableQuantity}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="text-sm font-semibold text-[#081c16]">
                                    2. Choisir une taille
                                  </div>
                                  {selectedDialogColorName ? (
                                    <div className="flex flex-wrap gap-2">
                                      {selectedDialogSizeOptions.map((size) => (
                                        <button
                                          key={`${selectedDialogProduct.id}-${selectedDialogColorName}-${size.sizeName}`}
                                          type="button"
                                          onClick={() =>
                                            handleSelectDialogSize(size.sizeName)
                                          }
                                          className={cn(
                                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                                            selectedDialogSizeName === size.sizeName
                                              ? "border-[#081c16] bg-[#081c16] text-white"
                                              : "border-slate-200 bg-white text-[#081c16] hover:bg-slate-50",
                                          )}>
                                          <span>{size.sizeName}</span>
                                          <span
                                            className={cn(
                                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                                              selectedDialogSizeName === size.sizeName
                                                ? "border-white/20 bg-white/10 text-white"
                                                : "border-slate-200 bg-slate-50 text-slate-500",
                                            )}>
                                            {size.availableQuantity}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                                      Choisissez d&apos;abord une couleur pour
                                      afficher les tailles disponibles.
                                    </div>
                                  )}
                                </div>

                                <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                                  {selectedDialogVariant ? (
                                    <div className="space-y-3">
                                      <div className="text-sm text-slate-500">
                                        Variante selectionnee
                                      </div>
                                      <div className="text-sm font-semibold text-[#081c16]">
                                        {selectedDialogVariant.colorName} /{" "}
                                        {selectedDialogVariant.sizeName}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        {formatPieceLabel(
                                          selectedDialogVariant.availableQuantity,
                                        )}{" "}
                                        disponibles
                                      </div>
                                      <Button
                                        type="button"
                                        onClick={handleAddSelectedVariant}
                                        className="w-full rounded-xl bg-[#081c16] px-4 text-sm font-semibold text-white hover:bg-[#081c16]/90">
                                        Ajouter cette variante
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500">
                                      Selectionnez un produit, une couleur puis
                                      une taille pour ajouter la variante a la
                                      commande.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                                Choisissez un produit dans la liste pour
                                afficher ses couleurs puis ses tailles
                                disponibles.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                          Aucun produit disponible ne correspond a cette
                          recherche.
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {selectedItems.length ? (
              <div className="grid gap-4">
                {selectedItems.map((item) => (
                  <div
                    key={item.variantId}
                    className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[#081c16]">
                              {item.productName}
                            </p>
                            <p className="text-sm text-slate-500">
                              {buildVariantLabel(item)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatPieceLabel(item.availableQuantity)} disponibles
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#081c16]">
                                {formatPrice(item.unitPrice)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.variantId)}
                              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#081c16]">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div className="grid gap-2">
                            <Label
                              htmlFor={`quantity-${item.variantId}`}
                              className="text-xs font-medium text-slate-500">
                              Quantite
                            </Label>
                            <Input
                              id={`quantity-${item.variantId}`}
                              type="number"
                              min="1"
                              max={item.availableQuantity}
                              value={item.quantity}
                              onChange={(event) =>
                                handleQuantityChange(
                                  item.variantId,
                                  event.target.value,
                                )
                              }
                              className="h-10 w-28 rounded-xl border-slate-200 bg-white px-4 text-sm text-[#081c16] shadow-none focus-visible:border-[#081c16] focus-visible:ring-[#081c16]/10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                Ouvrez le navigateur de produits et choisissez une variante
                disponible pour commencer la commande.
              </div>
            )}
          </div>

          <div className="order-4 flex min-h-32 flex-col gap-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5 xl:order-none">
            <div className="flex flex-row items-center justify-start gap-2 text-lg font-semibold text-[#081c16]">
              <CreditCard size={18} color="#081c16" strokeWidth={2.4} />
              Paiement
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4">
              <p className="flex items-center justify-between gap-3 text-sm text-[#616669]">
                Produit :
                <span className="text-base font-semibold text-[#081c16]">
                  {formatPrice(subtotal)}
                </span>
              </p>

              <p className="flex items-center justify-between gap-3 text-sm text-[#616669]">
                Livraison :
                <span className="flex items-center gap-2 text-base font-semibold text-[#081c16]">
                  {customer ? (
                    shippingLoading ? (
                      <>
                        <Spinner size="sm" className="text-[#081c16]" />
                        <span>Calcul...</span>
                      </>
                    ) : shippingFee !== null ? (
                      formatPrice(shippingFee)
                    ) : (
                      "--"
                    )
                  ) : (
                    "--"
                  )}
                </span>
              </p>

              <Separator className="bg-slate-200" />

              <p className="flex items-center justify-between gap-3 text-sm font-semibold text-[#081c16]">
                TOTAL :
                <span className="text-lg font-bold sm:text-xl">
                  {formatPrice(total)}
                </span>
              </p>

              {submissionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submissionError}
                </div>
              ) : null}

              {validationMessages.length ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="text-sm font-semibold text-rose-700">
                    La commande ne peut pas etre creee.
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {validationMessages.map((message) => (
                      <p key={message} className="text-sm leading-6 text-rose-700">
                        {message}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {customer && shippingError && !shippingLoading && shippingFee === null ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {shippingError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/admin/orders")}
                  className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-none text-[#081c16] transition-colors hover:bg-slate-50 sm:min-h-11 sm:py-2.5">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="min-h-14 flex-1 rounded-2xl bg-[#081c16] px-4 py-3 text-sm font-semibold leading-none text-white transition-colors hover:bg-[#081c16]/90 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11 sm:py-2.5">
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" className="text-white" />
                      <span>Creation...</span>
                    </span>
                  ) : (
                    "Creer la commande"
                  )}
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
                {customer ? "Modifier le client" : "Ajouter un client"}
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
                    {customerDeliveryOption?.label ?? customer.delivery}
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
                Ajoutez le client puis choisissez ses informations de livraison
                pour calculer le tarif ZR Express reel.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="text-lg font-semibold text-[#081c16]">
              Assignee
            </div>

            {selectedItems.length ? (
              <div className="flex flex-col gap-4">
                {selectedItems.map((item) => (
                  <div
                    key={`assignee-${item.variantId}`}
                    className="rounded-2xl border border-slate-200 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#081c16]">
                        {item.productName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {buildVariantLabel(item)} - {item.quantity} selectionne
                        {item.quantity > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.ownerAvailability.map((ownerAvailability) => {
                        const ownerState = getOwnerStockState(
                          ownerAvailability,
                          item.quantity,
                        );
                        const isSelected =
                          item.selectedOwner === ownerAvailability.ownerName;

                        return (
                          <button
                            key={`${item.variantId}-${ownerAvailability.ownerName}`}
                            type="button"
                            onClick={() =>
                              handleToggleOwner(
                                item.variantId,
                                ownerAvailability.ownerName,
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                              isSelected
                                ? "border-[#081c16] bg-[#081c16] text-white"
                                : "border-slate-200 bg-white text-[#081c16] hover:bg-slate-50",
                            )}>
                            <span className="font-semibold">
                              {ownerAvailability.ownerName}
                            </span>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                isSelected
                                  ? "border-white/25 bg-white/10 text-white"
                                  : ownerState.tone,
                              )}>
                              {ownerState.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {item.selectedOwner ? (
                      <p
                        className={cn(
                          "mt-3 text-xs font-medium",
                          (item.ownerAvailability.find(
                            (owner) => owner.ownerName === item.selectedOwner,
                          )?.availableQuantity ?? 0) >= item.quantity
                            ? "text-emerald-700"
                            : "text-rose-700",
                        )}>
                        {(item.ownerAvailability.find(
                          (owner) => owner.ownerName === item.selectedOwner,
                        )?.availableQuantity ?? 0) >= item.quantity
                          ? `${item.selectedOwner} peut couvrir cette ligne.`
                          : `${item.selectedOwner} n\u2019a pas assez de stock pour cette ligne.`}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        Laissez vide si vous voulez creer la commande sans
                        assignation immediate.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
                Selectionnez d&apos;abord une variante produit. Les proprietaires
                disponibles apparaitront ici avec leur stock reel.
              </div>
            )}
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
            setCustomerDialogError("");
          }
        }}>
        <DialogContent className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm sm:max-w-md">
          <DialogHeader className="gap-1 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle className="text-lg font-semibold text-[#081c16]">
              {customer ? "Modifier le client" : "Ajouter un client"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#616669]">
              Enregistrez les informations du client pour calculer la livraison
              et creer la commande.
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
                placeholder="05XXXXXXXX"
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
                placeholder="Cite, immeuble, repere..."
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
              <div className="grid gap-2 sm:grid-cols-2">
                {DELIVERY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDeliveryChange(option.value)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                      customerForm.delivery === option.value
                        ? "border-[#081c16] bg-[#081c16] text-white"
                        : "border-slate-200 bg-white text-[#081c16] hover:bg-slate-50",
                    )}>
                    <option.icon size={18} strokeWidth={2.2} />
                    <span className="text-sm font-semibold">{option.label}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                {customerForm.delivery && customerForm.wilaya ? (
                  previewShippingLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" className="text-[#081c16]" />
                      <span>Calcul du tarif ZR Express...</span>
                    </span>
                  ) : previewShippingFee !== null ? (
                    <>
                      Tarif ZR Express :{" "}
                      <span className="font-semibold text-[#081c16]">
                        {formatPrice(previewShippingFee)}
                      </span>
                    </>
                  ) : (
                    previewShippingError ||
                    "Aucun tarif ZR Express n'est disponible pour cette combinaison."
                  )
                ) : (
                  "Choisissez la wilaya, la commune et le mode de livraison pour charger le vrai tarif."
                )}
              </div>
            </div>

            {customerDialogError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {customerDialogError}
              </div>
            ) : null}

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
                className="min-h-14 flex-1 rounded-2xl bg-[#08251f] px-4 py-3 text-sm font-semibold leading-none text-white hover:bg-[#0b3129] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11 sm:py-2.5">
                Save Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
