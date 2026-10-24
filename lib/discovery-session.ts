const BRANDS_KEY = "hodlings-reviewed-brands";

// Only explicitly approved brand names are kept, for this browser tab.
export function readReviewedBrands(storage: Pick<Storage, "getItem">): string[] {
  try {
    const saved = JSON.parse(storage.getItem(BRANDS_KEY) ?? "null");
    if (!saved || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= Date.now() || !Array.isArray(saved.brands)) return [];
    return [...new Set<string>(saved.brands.filter((brand: unknown): brand is string => typeof brand === "string" && brand.length > 0 && brand.length <= 100))].slice(0, 100);
  } catch { return []; }
}
export function saveReviewedBrands(storage: Pick<Storage, "setItem" | "removeItem">, brands: string[]) {
  if (!brands.length) storage.removeItem(BRANDS_KEY);
  else storage.setItem(BRANDS_KEY, JSON.stringify({ brands, expiresAt: Date.now() + 55 * 60_000 }));
}
