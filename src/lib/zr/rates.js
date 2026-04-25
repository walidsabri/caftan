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

function findWilayaTerritory({ rates, wilaya, wilayaCode }) {
  const normalizedWilaya = normalizeText(wilaya);

  if (wilayaCode) {
    const matchByCode = rates.find(
      (item) =>
        item?.toTerritoryLevel === "wilaya" &&
        String(item?.toTerritoryCode ?? "") === String(wilayaCode),
    );

    if (matchByCode) {
      return matchByCode;
    }
  }

  if (wilaya) {
    const matchByName = rates.find(
      (item) =>
        item?.toTerritoryLevel === "wilaya" &&
        normalizeText(item?.toTerritoryName) === normalizedWilaya,
    );

    if (matchByName) {
      return matchByName;
    }
  }

  return null;
}

function findCommuneTerritory({ rates, commune }) {
  const normalizedCommune = normalizeText(commune);

  if (!commune) {
    return null;
  }

  return (
    rates.find(
      (item) =>
        item?.toTerritoryLevel === "commune" &&
        normalizeText(item?.toTerritoryName) === normalizedCommune,
    ) ?? null
  );
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

  const communeTerritory = findCommuneTerritory({ rates, commune });
  const wilayaTerritory = findWilayaTerritory({ rates, wilaya, wilayaCode });

  const matchedTerritory = communeTerritory ?? wilayaTerritory;

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
    zrAddress: {
      cityTerritoryId: wilayaTerritory?.toTerritoryId ?? null,
      districtTerritoryId: communeTerritory?.toTerritoryId ?? null,
    },
    rates: {
      home: homePrice,
      desk: pickupPointPrice,
      pickupPoint: pickupPointPrice,
      return: returnPrice,
    },
  };
}
