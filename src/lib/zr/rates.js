import { getAllDeliveryRates } from "@/lib/zr/services";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPriceByDeliveryType(deliveryPrices, deliveryType) {
  if (!Array.isArray(deliveryPrices)) {
    return null;
  }

  const match = deliveryPrices.find(
    (item) => item?.deliveryType === deliveryType,
  );

  return match?.discountedPrice ?? match?.price ?? null;
}

export function getShippingFeeForMethod(rates, shippingMethod) {
  if (shippingMethod === "home") {
    return rates?.home ?? null;
  }

  if (shippingMethod === "desk") {
    return rates?.desk ?? rates?.pickupPoint ?? null;
  }

  return null;
}

export async function resolveShippingRates({ wilaya, commune, wilayaCode }) {
  if (!wilaya && !commune && !wilayaCode) {
    throw new Error("wilaya, commune or wilayaCode is required.");
  }

  const payload = await getAllDeliveryRates();
  const rates = Array.isArray(payload?.rates) ? payload.rates : [];
  const normalizedWilaya = normalizeText(wilaya);
  const normalizedCommune = normalizeText(commune);

  let matchedTerritory = null;

  if (commune) {
    matchedTerritory = rates.find(
      (item) =>
        item?.toTerritoryLevel === "commune" &&
        normalizeText(item?.toTerritoryName) === normalizedCommune,
    );
  }

  if (!matchedTerritory && wilayaCode) {
    matchedTerritory = rates.find(
      (item) =>
        item?.toTerritoryLevel === "wilaya" &&
        String(item?.toTerritoryCode ?? "") === String(wilayaCode),
    );
  }

  if (!matchedTerritory && wilaya) {
    matchedTerritory = rates.find(
      (item) =>
        item?.toTerritoryLevel === "wilaya" &&
        normalizeText(item?.toTerritoryName) === normalizedWilaya,
    );
  }

  if (!matchedTerritory) {
    throw new Error("No shipping price found for this location.");
  }

  const homePrice = getPriceByDeliveryType(
    matchedTerritory.deliveryPrices,
    "home",
  );
  const pickupPointPrice = getPriceByDeliveryType(
    matchedTerritory.deliveryPrices,
    "pickup-point",
  );
  const returnPrice = getPriceByDeliveryType(
    matchedTerritory.deliveryPrices,
    "return",
  );

  return {
    territory: {
      id: matchedTerritory.toTerritoryId,
      code: matchedTerritory.toTerritoryCode ?? null,
      name: matchedTerritory.toTerritoryName,
      nameArabic: matchedTerritory.toTerritoryNameArabic ?? null,
      level: matchedTerritory.toTerritoryLevel,
    },
    rates: {
      home: homePrice,
      desk: pickupPointPrice,
      pickupPoint: pickupPointPrice,
      return: returnPrice,
    },
  };
}
