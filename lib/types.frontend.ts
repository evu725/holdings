// Presentation model for the frontend cards. lib/frontend-adapter.ts converts
// the actual /api/match wire contract from lib/types.ts into this shape.

export type MatchedAsset = {
  brand: string; // what the user said, e.g. "Roblox"
  symbol: string; // e.g. "RBLX"
  company: string; // e.g. "Roblox Corporation"
  issuer: string; // e.g. "Robinhood chain" | "Coinbase on Base"
  venue: string;
  tradeable: boolean;
  assetId: string;
  why: string; // one-line reason, e.g. "Makes the game you play."
};

export type UnavailableBrand = {
  brand: string; // e.g. "Coca-Cola"
  parent: string; // e.g. "The Coca-Cola Company"
};

export type MatchResponse = {
  available: MatchedAsset[];
  unavailable: UnavailableBrand[];
  spokenSummary: string; // text sent to ElevenLabs for the voice reply
};
