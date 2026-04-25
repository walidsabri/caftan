import { getZrAccount, validateZrConfig, zrConfig } from "@/lib/zr/config";

export async function zrRequest(path, options = {}) {
  const accountKey = options.accountKey || "hanane";

  validateZrConfig(accountKey);

  const account = getZrAccount(accountKey);
  const url = `${zrConfig.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "X-Api-Key": account.apiKey,
      "X-Tenant": account.tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const validationErrors = Array.isArray(data?.errors)
      ? data.errors
          .map((error) => error.description)
          .filter(Boolean)
          .join(" ")
      : "";

    throw new Error(
      validationErrors ||
        data?.detail ||
        data?.message ||
        data?.error ||
        `ZR request failed with status ${response.status}`,
    );
  }

  return data;
}
