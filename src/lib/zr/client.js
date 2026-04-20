import { zrConfig, validateZrConfig } from "@/lib/zr/config";

export async function zrRequest(path, options = {}) {
  validateZrConfig();

  const url = `${zrConfig.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "X-Api-Key": zrConfig.apiKey,
      "X-Tenant": zrConfig.tenantId,
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
    throw new Error(
      data?.message ||
        data?.error ||
        `ZR request failed with status ${response.status}`,
    );
  }

  return data;
}
