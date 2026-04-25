export const zrConfig = {
  baseUrl: process.env.ZR_API_BASE_URL,
  version: process.env.ZR_API_VERSION || "1",

  accounts: {
    warda: {
      apiKey: process.env.ZR_WARDA_API_KEY,
      tenantId: process.env.ZR_WARDA_TENANT_ID,
    },
    hanane: {
      apiKey: process.env.ZR_HANANE_API_KEY,
      tenantId: process.env.ZR_HANANE_TENANT_ID,
    },
  },
};

export function validateZrConfig(accountKey = "hanane") {
  if (!zrConfig.baseUrl) throw new Error("Missing ZR_API_BASE_URL");
  if (!zrConfig.version) throw new Error("Missing ZR_API_VERSION");

  const account = zrConfig.accounts[accountKey];

  if (!account) {
    throw new Error(`Unknown ZR account: ${accountKey}`);
  }

  if (!account.apiKey) {
    throw new Error(`Missing ZR ${accountKey} API key`);
  }

  if (!account.tenantId) {
    throw new Error(`Missing ZR ${accountKey} tenant ID`);
  }
}

export function getZrAccount(accountKey) {
  validateZrConfig(accountKey);
  return zrConfig.accounts[accountKey];
}
