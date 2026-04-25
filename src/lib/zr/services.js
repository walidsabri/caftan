import { zrConfig } from "@/lib/zr/config";
import { zrRequest } from "@/lib/zr/client";

export async function getAllDeliveryRates() {
  return zrRequest(`/api/v${zrConfig.version}/delivery-pricing/rates`, {
    accountKey: "hanane",
  });
}

export async function createZrParcel({ accountKey, payload }) {
  return zrRequest(`/api/v${zrConfig.version}/parcels`, {
    method: "POST",
    accountKey,
    body: payload,
  });
}
