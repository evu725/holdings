import type { MatchResponse as ApiMatchResponse } from "./types";
import type { MatchResponse as FrontendMatchResponse } from "./types.frontend";

// Keep the backend wire contract and teammate card model separate.
export function toFrontendMatch(result: ApiMatchResponse): FrontendMatchResponse {
  return {
    available: result.matches.map(({ symbol, why, asset }) => ({
      brand: "",
      symbol,
      company: asset.name,
      issuer: asset.issuer,
      venue: asset.venue,
      tradeable: asset.tradeable,
      assetId: asset.id,
      why,
    })),
    unavailable: result.unavailable,
    spokenSummary: result.matches.length
      ? `Companies to explore: ${result.matches.map(match => match.asset.name).join(", ")}.`
      : "No matching companies were found in the current catalog. Try another brand.",
  };
}
