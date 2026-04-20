const storefrontPriceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatPrice(price) {
  const numericPrice = Number(price ?? 0);

  if (!Number.isFinite(numericPrice)) {
    return "0 DZD";
  }

  return `${storefrontPriceFormatter.format(numericPrice)} DZD`;
}
