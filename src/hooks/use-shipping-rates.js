"use client";

import * as React from "react";

export function useShippingRates({
  wilaya,
  wilayaCode,
  commune,
  shippingMethod,
  enabled = true,
}) {
  const [shippingFee, setShippingFee] = React.useState(null);
  const [shippingRates, setShippingRates] = React.useState(null);
  const [shippingLoading, setShippingLoading] = React.useState(false);
  const [shippingError, setShippingError] = React.useState("");

  React.useEffect(() => {
    async function loadShippingRates() {
      if (!enabled || !wilaya || !wilayaCode) {
        setShippingFee(null);
        setShippingRates(null);
        setShippingError("");
        return;
      }

      setShippingLoading(true);
      setShippingError("");

      try {
        const params = new URLSearchParams();

        params.set("wilaya", wilaya);
        params.set("wilayaCode", String(wilayaCode));

        if (commune) {
          params.set("commune", commune);
        }

        const response = await fetch(
          `/api/shipping/rates?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Failed to fetch shipping rates.");
        }

        const rates = result?.rates ?? null;
        let resolvedFee = null;

        if (shippingMethod === "home") {
          resolvedFee = rates?.home ?? null;
        } else if (shippingMethod === "desk") {
          resolvedFee = rates?.desk ?? rates?.pickupPoint ?? null;
        }

        setShippingRates(rates);
        setShippingFee(resolvedFee);
      } catch (error) {
        setShippingRates(null);
        setShippingFee(null);
        setShippingError(
          error instanceof Error
            ? error.message
            : "Failed to fetch shipping rates.",
        );
      } finally {
        setShippingLoading(false);
      }
    }

    loadShippingRates();
  }, [wilaya, wilayaCode, commune, shippingMethod, enabled]);

  return {
    shippingFee,
    shippingRates,
    shippingLoading,
    shippingError,
  };
}
