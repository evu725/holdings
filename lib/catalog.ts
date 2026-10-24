import catalogJson from "@/data/runway-assets.json";
import type { Asset, CatalogResponse, CatalogRow, Chain } from "./types";


const LIVE_CATALOG_URL = "https://api.truemarkets.co/v1/gateway/assets?asset_class=stock";
function issuerFor(chain: Chain): string {
  if (chain === "robinhood") return "Robinhood Chain";
  if (chain === "base") return "Coinbase on Base";
  return "Exchange-settled";
}

function toAsset(row: CatalogRow): Asset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    chain: row.chain,
    venue: row.venue,
    address: row.address,
    tradeable: row.tradeable,
    is_active: row.is_active,
    status: row.status,
    icon: row.icon,
    issuer: issuerFor(row.chain),
  };
}

let cached: Asset[] | null = null;
export async function getCatalog(): Promise<Asset[]> {
  try {
    const response = await fetch(LIVE_CATALOG_URL, {
      next: { revalidate: 60 },
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

    return result.data
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
        issuer:
          row.chain === "robinhood"
            ? "Robinhood Chain"
            : row.chain === "base"
              ? "Coinbase on Base"
              : "Exchange-settled",
      }))
      .sort((a: Asset, b: Asset) =>
        a.symbol.localeCompare(b.symbol),
      );
  } catch (error) {
    console.error("Live catalog failed:", error);

    // Temporary fallback: use the existing static catalog.
    const { data } = catalogJson as CatalogResponse;

    return data
      .filter(
        (row) =>
          row.is_active &&
          row.tradeable &&
          row.status === "active",
      )
      .map((row) => ({
        ...row,
        issuer:
          row.chain === "robinhood"
            ? "Robinhood Chain"
            : row.chain === "base"
              ? "Coinbase on Base"
              : "Exchange-settled",
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
}