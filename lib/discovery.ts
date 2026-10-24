import type { MatchResponse } from "./types";

export function discoveryText(transcript: string, emailBrands: string[]): string {
  const approved = [...new Set(emailBrands.map(value => value.trim()).filter(Boolean))];
  return [transcript.trim(), approved.length ? `Additional brands I selected: ${approved.join(", ")}.` : ""].filter(Boolean).join("\n");
}

export function narrationFor(result: MatchResponse): string {
  const matches = [...new Map(result.matches.map(match => [match.symbol, match])).values()];
  const found = matches.length
    ? `Here are some companies to explore. ${matches.slice(0, 5).map(match => `${match.asset.name.slice(0, 120)}. ${match.why.slice(0, 400)}`).join(" ")}`
    : "No matching companies were found in the current catalog. Try mentioning another brand you use.";
  const more = matches.length > 5 ? " More matches are shown on screen." : "";
  const unavailable = result.unavailable.length ? ` Some brands are outside the current catalog: ${result.unavailable.slice(0, 5).map(item => item.brand.slice(0, 80)).join(", ")}.` : "";
  return `${found}${more}${unavailable} This is educational discovery, not investment advice.`.slice(0, 4000);
}
