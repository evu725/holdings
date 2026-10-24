import catalogJson from "@/data/runway-assets.json";
import type { Asset, CatalogResponse, CatalogRow, Chain } from "./types";

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

export function getCatalog(): Asset[] {
  if (cached) return cached;

  const { data } = catalogJson as CatalogResponse;
  const bySymbol = new Map<string, CatalogRow>();

  for (const row of data) {
    if (!row.is_active || !row.tradeable || row.status !== "active") continue;
    const existing = bySymbol.get(row.symbol);
    if (!existing || (existing.chain == null && row.chain != null)) {
      bySymbol.set(row.symbol, row);
    }
  }

  cached = [...bySymbol.values()]
    .map(toAsset)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  return cached;
}
