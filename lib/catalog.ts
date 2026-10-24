import catalogJson from "@/data/runway-assets.json";
import type { Asset, CatalogResponse, Chain } from "./types";


const LIVE_CATALOG_URL = "https://api.truemarkets.co/v1/gateway/assets?asset_class=stock";
function issuerFor(chain: Chain): string {
  if (chain === "robinhood") return "Robinhood Chain";
  if (chain === "base") return "Coinbase on Base";
  return "Exchange-settled";
}

export type CatalogSnapshot = { assets: Asset[]; source: "live" | "fallback" };

export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  try {
    const response = await fetch(LIVE_CATALOG_URL, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(
        `True Markets API failed: ${response.status}`,
      );
    }

    const result = await response.json();

    if (!result || !Array.isArray(result.data)) {
      throw new Error("Invalid catalog response");
    }

    const assets: Asset[] = result.data
      .filter(
        (row: {
          asset_class: string;
          is_active: boolean;
          tradeable: boolean;
          status: string;
        }) =>
          row.asset_class === "stock" &&
          row.is_active === true &&
          row.tradeable === true &&
          row.status === "active",
      )
      .map((row: Asset) => ({
        ...row,
        issuer: issuerFor(row.chain),
      }))
      .sort((a: Asset, b: Asset) =>
        a.symbol.localeCompare(b.symbol),
      );
    return { assets, source: "live" };
  } catch (error) {
    console.error("Live catalog failed:", error);

    // Temporary fallback: use the existing static catalog.
    const { data } = catalogJson as CatalogResponse;

    const assets = data
      .filter(
        (row) =>
          row.is_active &&
          row.tradeable &&
          row.status === "active",
      )
      .map((row) => ({
        ...row,
        issuer: issuerFor(row.chain),
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    return { assets, source: "fallback" };
  }
}

export async function getCatalog(): Promise<Asset[]> {
  return (await getCatalogSnapshot()).assets;
}
