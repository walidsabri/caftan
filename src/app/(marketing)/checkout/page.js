"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import algeriaCities from "@/lib/algeria_cities.json";
import { formatPrice } from "@/lib/format-price";
import { useShippingRates } from "@/hooks/use-shipping-rates";

const wilayaNameCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

const SHIPPING_METHOD_OPTIONS = [
  {
    value: "home",
    label: "Livraison a domicile",
    description: "Le colis est livre directement a l'adresse du client.",
  },
  {
    value: "desk",
    label: "Livraison au bureau",
    description:
      "Retrait au bureau ZR Express le plus proche de la commune du client.",
  },
];

function normalizeLocationName(value) {
  return value.replace(/\s+/g, " ").trim();
}

const wilayaOptions = Array.from(
  algeriaCities
    .reduce((wilayas, location) => {
      const wilayaName = normalizeLocationName(location.wilaya_name_ascii);
      const communeName = normalizeLocationName(location.commune_name_ascii);
      const currentWilaya = wilayas.get(wilayaName) ?? {
        code: location.wilaya_code,
        name: wilayaName,
        nameAscii: location.wilaya_name_ascii,
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
    ...wilaya,
    communes: Array.from(wilaya.communes)
      .map((commune) => JSON.parse(commune))
      .sort((left, right) =>
        wilayaNameCollator.compare(left.nameAscii, right.nameAscii),
      ),
  }));

export default function CheckoutPage() {
  const router = useRouter();
  const { items, hasHydrated, subtotal, totalQuantity, clearCart } = useCart();

  const [selectedWilayaName, setSelectedWilayaName] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const [errors, setErrors] = useState({
    fullName: false,
    phoneEmpty: false,
    phoneLength: false,
    phonePrefix: false,
    wilaya: false,
    commune: false,
    shippingMethod: false,
    address: false,
  });

  const selectedWilaya = wilayaOptions.find(
    (wilaya) => wilaya.name === selectedWilayaName,
  );

  const communeOptions = selectedWilaya?.communes ?? [];

  const selectedShippingOption = SHIPPING_METHOD_OPTIONS.find(
    (option) => option.value === selectedShippingMethod,
  );

  const {
    shippingFee: shippingPrice,
    shippingRates,
    shippingLoading,
    shippingError,
  } = useShippingRates({
    wilaya: selectedWilayaName,
    wilayaCode: selectedWilaya?.code,
    commune: selectedCommune,
    shippingMethod: selectedShippingMethod,
    enabled: Boolean(
      selectedWilayaName && selectedWilaya?.code && selectedShippingMethod,
    ),
  });

  const orderTotal = subtotal + (shippingPrice ?? 0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const fullName = formData.get("fullName")?.trim();
    const phone = formData.get("phone")?.trim();
    const address = formData.get("address")?.trim();

    const phoneDigitsOnly = phone?.replace(/\D/g, "");
    const phoneEmpty = !phone;
    const phoneLength =
      phone && phoneDigitsOnly && phoneDigitsOnly.length !== 10;
    const phonePrefix =
      phone &&
      phoneDigitsOnly &&
      phoneDigitsOnly.length === 10 &&
      !/^(05|06|07)/.test(phoneDigitsOnly);

    const newErrors = {
      fullName: !fullName,
      phoneEmpty,
      phoneLength,
      phonePrefix,
      wilaya: !selectedWilayaName,
      commune: !selectedCommune,
      shippingMethod: !selectedShippingMethod,
      address: !address,
    };

    setErrors(newErrors);
    setSubmissionError("");

    if (Object.values(newErrors).some((error) => error)) {
      return;
    }

    if (shippingLoading) {
      setSubmissionError(
        "Le tarif de livraison est en cours de chargement. Veuillez patienter.",
      );
      return;
    }

    if (shippingPrice === null) {
      setSubmissionError(
        shippingError ||
          "Aucun tarif ZR Express n'est disponible pour cette commande.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          wilaya: selectedWilayaName,
          wilayaCode: selectedWilaya?.code ?? null,
          commune: selectedCommune,
          address,
          notes: formData.get("notes")?.trim() || "",
          shippingMethod: selectedShippingMethod,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible d'enregistrer la commande.",
        );
      }

      clearCart();
      router.push(
        `/checkout/merci?order=${encodeURIComponent(result.order.orderNumber)}`,
      );
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la commande.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWilayaChange = (value) => {
    setSelectedWilayaName(value);
    setSelectedCommune("");
    setSelectedShippingMethod("");
    setSubmissionError("");
  };

  if (!hasHydrated) {
    return (
      <section className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-6xl rounded-sm border border-caftan-border bg-caftan-cream px-6 py-14 text-center shadow-sm shadow-caftan-brand/10">
          <p className="text-sm uppercase tracking-[0.2em] text-caftan-brand">
            Chargement...
          </p>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-4xl rounded-sm border border-dashed border-caftan-border bg-caftan-cream px-6 py-14 text-center shadow-sm shadow-caftan-brand/10">
          <p className="text-sm uppercase tracking-[0.2em] text-caftan-brand">
            Checkout
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-caftan-text">
            Votre panier est vide
          </h1>
          <p className="mt-4 text-sm text-caftan-text">
            Ajoutez au moins un produit avant de passer a la commande.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-sm bg-caftan-brand px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-caftan-cream transition-colors hover:bg-caftan-brand-dark">
            Voir les produits
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-caftan-brand">
            Checkout
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-caftan-text md:text-4xl">
            Informations du client
          </h1>
          <p className="mt-4 text-sm leading-6 text-caftan-text md:text-base">
            Remplissez vos informations pour finaliser votre demande.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-sm border border-caftan-border bg-caftan-cream p-6 shadow-sm shadow-caftan-brand/10 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2" data-invalid={errors.fullName}>
                <Label
                  htmlFor="fullName"
                  className="uppercase tracking-[0.12em] text-caftan-text">
                  Nom complet
                </Label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  aria-invalid={errors.fullName}
                  onChange={() => {
                    setErrors((prev) => ({ ...prev, fullName: false }));
                    setSubmissionError("");
                  }}
                  className="h-12 w-full rounded-sm border border-caftan-border px-4 text-sm outline-none transition-colors focus:border-caftan-brand aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/50"
                  placeholder="Votre nom complet"
                />
                {errors.fullName && (
                  <p className="text-xs font-medium text-red-500">
                    Veuillez entrer votre nom complet
                  </p>
                )}
              </div>

              <div
                className="space-y-2"
                data-invalid={
                  errors.phoneEmpty || errors.phoneLength || errors.phonePrefix
                }>
                <Label
                  htmlFor="phone"
                  className="uppercase tracking-[0.12em] text-caftan-text">
                  Telephone
                </Label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  aria-invalid={
                    errors.phoneEmpty ||
                    errors.phoneLength ||
                    errors.phonePrefix
                  }
                  onChange={() =>
                    {
                      setErrors((prev) => ({
                        ...prev,
                        phoneEmpty: false,
                        phoneLength: false,
                        phonePrefix: false,
                      }));
                      setSubmissionError("");
                    }
                  }
                  className="h-12 w-full rounded-sm border border-caftan-border px-4 text-sm outline-none transition-colors focus:border-caftan-brand aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/50"
                  placeholder="05XXXXXXXX"
                />
                {errors.phoneEmpty && (
                  <p className="text-xs font-medium text-red-500">
                    Veuillez entrer votre numero de telephone
                  </p>
                )}
                {errors.phoneLength && (
                  <p className="text-xs font-medium text-red-500">
                    Le numero doit contenir exactement 10 chiffres
                  </p>
                )}
                {errors.phonePrefix && (
                  <p className="text-xs font-medium text-red-500">
                    Le numero doit commencer par 05, 06 ou 07
                  </p>
                )}
              </div>

              <div className="space-y-2" data-invalid={errors.wilaya}>
                <Label
                  htmlFor="wilaya"
                  className="uppercase tracking-[0.12em] text-caftan-text">
                  Wilaya
                </Label>
                <Select
                  value={selectedWilayaName}
                  onValueChange={(value) => {
                    handleWilayaChange(value);
                    setErrors((prev) => ({ ...prev, wilaya: false }));
                  }}>
                  <SelectTrigger
                    id="wilaya"
                    aria-invalid={errors.wilaya}
                    className="h-12 w-full rounded-sm border border-caftan-border px-4 text-sm outline-none transition-colors focus:border-caftan-brand aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/50">
                    <SelectValue placeholder="Choisir une wilaya" />
                  </SelectTrigger>
                  <SelectContent>
                    {wilayaOptions.map((wilaya) => (
                      <SelectItem key={wilaya.code} value={wilaya.name}>
                        {wilaya.code} - {wilaya.nameAscii} {wilaya.nameArabic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.wilaya && (
                  <p className="text-xs font-medium text-red-500">
                    Veuillez selectioner une wilaya
                  </p>
                )}
              </div>

              <div className="space-y-2" data-invalid={errors.commune}>
                <Label
                  htmlFor="commune"
                  className="uppercase tracking-[0.12em] text-caftan-text">
                  Commune
                </Label>
                <Select
                  value={selectedCommune}
                  onValueChange={(value) => {
                    setSelectedCommune(value);
                    setErrors((prev) => ({ ...prev, commune: false }));
                    setSubmissionError("");
                  }}
                  disabled={!selectedWilayaName}>
                  <SelectTrigger
                    id="commune"
                    aria-invalid={errors.commune}
                    className="h-12 w-full rounded-sm border border-caftan-border focus:border-caftan-brand focus-visible:ring-1 focus-visible:ring-caftan-brand/50 disabled:cursor-not-allowed disabled:bg-caftan-surface disabled:text-caftan-text aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/50">
                    <SelectValue
                      placeholder={
                        selectedWilayaName
                          ? "Choisir une commune"
                          : "Choisissez d'abord une wilaya"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {communeOptions.map((commune) => (
                      <SelectItem
                        key={commune.nameAscii}
                        value={commune.nameAscii}>
                        {commune.nameAscii} {commune.nameArabic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.commune && (
                  <p className="text-xs font-medium text-red-500">
                    Veuillez selectioner une commune
                  </p>
                )}
              </div>
            </div>

            <input type="hidden" name="wilaya" value={selectedWilayaName} />
            <input type="hidden" name="commune" value={selectedCommune} />

            <div
              className="mt-5 space-y-3"
              data-invalid={errors.shippingMethod}>
              <Label className="uppercase tracking-[0.12em] text-caftan-text">
                Mode de livraison
              </Label>

              <div className="grid gap-3 md:grid-cols-2">
                {SHIPPING_METHOD_OPTIONS.map((option) => {
                  const isSelected = selectedShippingMethod === option.value;
                  const isDisabled = !selectedWilayaName || !selectedCommune;

                  return (
                    <label
                      key={option.value}
                      className={`flex rounded-sm border p-4 transition-colors ${
                        isSelected
                          ? "border-caftan-brand bg-caftan-surface"
                          : "border-caftan-border bg-caftan-cream"
                      } ${
                        isDisabled
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:border-caftan-brand/60"
                      }`}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={option.value}
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={(event) => {
                          setSelectedShippingMethod(event.target.value);
                          setErrors((prev) => ({
                            ...prev,
                            shippingMethod: false,
                          }));
                          setSubmissionError("");
                        }}
                        className="sr-only"
                      />

                      <div className="flex w-full items-start justify-between gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium uppercase tracking-[0.12em] text-caftan-text">
                            {option.label}
                          </p>
                          <p className="text-sm leading-6 text-caftan-text">
                            {option.description}
                          </p>
                        </div>

                        <span
                          className={`mt-1 size-4 shrink-0 rounded-full border ${
                            isSelected
                              ? "border-caftan-brand bg-caftan-brand"
                              : "border-caftan-border bg-caftan-cream"
                          }`}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-caftan-text">
                {!selectedWilayaName
                  ? "Choisissez d'abord une wilaya."
                  : !selectedCommune
                    ? "Choisissez ensuite une commune."
                    : !selectedShippingMethod
                      ? "Choisissez un mode de livraison pour calculer le tarif."
                      : shippingLoading
                        ? "Chargement du tarif ZR Express..."
                        : shippingPrice !== null
                          ? `Tarif ZR Express: ${formatPrice(shippingPrice)}`
                          : "Aucun tarif disponible pour cette zone pour le moment."}
              </p>

              {shippingError ? (
                <p className="text-xs font-medium text-red-500">
                  {shippingError}
                </p>
              ) : null}

              {selectedShippingMethod === "desk" && selectedCommune ? (
                <p className="text-xs text-caftan-text">
                  Retrait prevu au bureau ZR Express le plus proche de{" "}
                  {selectedCommune}.
                </p>
              ) : null}

              {shippingRates ? (
                <p className="text-xs text-caftan-text">
                  Domicile:{" "}
                  {shippingRates.home !== null
                    ? formatPrice(shippingRates.home)
                    : "Non disponible"}{" "}
                  | Bureau:{" "}
                  {shippingRates.desk !== null
                    ? formatPrice(shippingRates.desk)
                    : "Non disponible"}
                </p>
              ) : null}

              {errors.shippingMethod && (
                <p className="text-xs font-medium text-red-500">
                  Veuillez choisir un mode de livraison
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2" data-invalid={errors.address}>
              <Label
                htmlFor="address"
                className="uppercase tracking-[0.12em] text-caftan-text">
                Adresse
              </Label>
              <input
                id="address"
                name="address"
                type="text"
                aria-invalid={errors.address}
                onChange={() => {
                  setErrors((prev) => ({ ...prev, address: false }));
                  setSubmissionError("");
                }}
                className="h-12 w-full rounded-sm border border-caftan-border px-4 text-sm outline-none transition-colors focus:border-caftan-brand aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/50"
                placeholder="Rue, numero, quartier..."
              />
              {errors.address && (
                <p className="text-xs font-medium text-red-500">
                  Veuillez entrer votre adresse
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <Label
                htmlFor="notes"
                className="uppercase tracking-[0.12em] text-caftan-text">
                Notes
              </Label>
              <textarea
                id="notes"
                name="notes"
                rows={5}
                onChange={() => setSubmissionError("")}
                className="w-full rounded-sm border border-caftan-border px-4 py-3 text-sm outline-none transition-colors focus:border-caftan-brand"
                placeholder="Informations supplementaires pour la livraison..."
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/cart"
                className="rounded-sm border border-caftan-border px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.16em] text-caftan-text transition-colors hover:bg-caftan-surface">
                Retour au panier
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-sm bg-caftan-brand px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-caftan-cream transition-colors hover:bg-caftan-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting
                  ? "Enregistrement..."
                  : "Passer la commande"}
              </button>
            </div>

            {submissionError ? (
              <p className="mt-4 text-sm text-red-500" role="alert">
                {submissionError}
              </p>
            ) : null}
          </form>

          <aside className="h-fit rounded-sm border border-caftan-border bg-caftan-cream p-6 shadow-sm shadow-caftan-brand/10 md:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-caftan-brand">
              Resume de la commande
            </p>

            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="border-b border-caftan-border/70 pb-4 last:border-b-0 last:pb-0">
                  <p className="text-base font-medium text-caftan-text">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-caftan-text">
                    Taille: {item.size} | Couleur: {item.color}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-caftan-text">
                      Quantite: {item.quantity}
                    </span>
                    <span className="font-medium text-caftan-brand">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-caftan-border pt-5">
              <div className="flex items-center justify-between text-sm text-caftan-text">
                <span>Articles</span>
                <span>{totalQuantity}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-caftan-text">
                <span>Livraison</span>
                <span>{selectedShippingOption?.label ?? "A choisir"}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-caftan-text">
                <span>Tarif ZR Express</span>
                <span>
                  {shippingLoading
                    ? "Chargement..."
                    : shippingPrice !== null
                      ? formatPrice(shippingPrice)
                      : selectedWilayaName &&
                          selectedCommune &&
                          selectedShippingMethod
                        ? "Indisponible"
                        : "A calculer"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-caftan-text">
                <span>Sous-total produits</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xl font-semibold text-caftan-text">
                <span>Total estime</span>
                <span>{formatPrice(orderTotal)}</span>
              </div>

              {shippingError ? (
                <p className="text-xs leading-5 text-red-500">
                  {shippingError}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
