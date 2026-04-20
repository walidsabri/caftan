export const zrConfig = {
  baseUrl: process.env.ZR_API_BASE_URL,
  version: process.env.ZR_API_VERSION || "1",
  apiKey: process.env.ZR_API_KEY,
  tenantId: process.env.ZR_TENANT_ID,
};

export function validateZrConfig() {
  if (!zrConfig.baseUrl) throw new Error("Missing ZR_API_BASE_URL");
  if (!zrConfig.version) throw new Error("Missing ZR_API_VERSION");
  if (!zrConfig.apiKey) throw new Error("Missing ZR_API_KEY");
  if (!zrConfig.tenantId) throw new Error("Missing ZR_TENANT_ID");
}
