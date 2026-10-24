export type Chain = "robinhood" | "base" | null;
export type Venue = "defi" | "cefi";

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  chain: Chain;
  venue: Venue;
  address: string | null;
  tradeable: boolean;
  is_active: boolean;
  status: string;
  icon: string;
  issuer: string;
};

export type CatalogRow = Omit<Asset, "issuer">;

export type CatalogResponse = {
  data: CatalogRow[];
};

export type MatchRequest = {
  text: string;
};

export type MatchResponse = {
  matches: { symbol: string; why: string; asset: Asset }[];
  unavailable: { brand: string; parent: string }[];
  source: "grok" | "local";
};
