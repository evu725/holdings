import brands from "@/data/brands.json";
import { getCatalog } from "@/lib/catalog";
import type { Asset, MatchRequest, MatchResponse } from "@/lib/types";

type BrandHint = { brand: string; parent: string; symbol: string | null };

type ModelMatch = { symbol: string; why: string };
type ModelUnavailable = { brand: string; parent: string };
type ModelResult = { matches: ModelMatch[]; unavailable: ModelUnavailable[] };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function brandPattern(brand: string) {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(brand)}(?![A-Za-z0-9])`, "i");
}

function matchLocal(text: string): ModelResult {
  const hints = [...(brands as BrandHint[])].sort(
    (a, b) => b.brand.length - a.brand.length,
  );
  const matches: ModelMatch[] = [];
  const unavailable: ModelUnavailable[] = [];
  const seenBrands = new Set<string>();

  for (const hint of hints) {
    if (!brandPattern(hint.brand).test(text)) continue;
    const key = hint.brand.toLowerCase();
    if (seenBrands.has(key)) continue;
    seenBrands.add(key);

    if (hint.symbol) {
      matches.push({
        symbol: hint.symbol,
        why: `${hint.brand} is ${hint.parent}`,
      });
    } else {
      unavailable.push({ brand: hint.brand, parent: hint.parent });
    }
  }

  return { matches, unavailable };
}

function catalogPromptList() {
  return getCatalog()
    .map((asset) => `${asset.symbol} — ${asset.name}`)
    .join("\n");
}

function brandHintList() {
  return (brands as BrandHint[])
    .map((hint) =>
      hint.symbol
        ? `${hint.brand} → ${hint.parent} (${hint.symbol})`
        : `${hint.brand} → ${hint.parent} (not in catalog)`,
    )
    .join("\n");
}

function applyGuardrail(result: ModelResult, source: MatchResponse["source"]): MatchResponse {
  const bySymbol = new Map(getCatalog().map((asset) => [asset.symbol.toUpperCase(), asset]));
  const seen = new Set<string>();
  const matches: MatchResponse["matches"] = [];

  for (const match of result.matches ?? []) {
    const symbol = String(match.symbol ?? "").toUpperCase();
    const asset: Asset | undefined = bySymbol.get(symbol);
    if (!asset || seen.has(asset.symbol)) continue;
    seen.add(asset.symbol);
    matches.push({
      symbol: asset.symbol,
      why: typeof match.why === "string" && match.why.trim() ? match.why : `Matched ${asset.name}`,
      asset,
    });
  }

  const unavailable: MatchResponse["unavailable"] = [];
  const seenUnavailable = new Set<string>();
  for (const item of result.unavailable ?? []) {
    const brand = String(item.brand ?? "").trim();
    const parent = String(item.parent ?? "").trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    if (seenUnavailable.has(key)) continue;
    seenUnavailable.add(key);
    unavailable.push({ brand, parent: parent || brand });
  }

  return { matches, unavailable, source };
}

async function matchWithGrok(text: string): Promise<ModelResult> {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL;
  if (!apiKey || !model) {
    throw new Error("missing grok config");
  }

  const system = `You map everyday brands and apps to tokenized stocks.

Use ONLY these catalog symbols (symbol — name). Never invent symbols:
${catalogPromptList()}

Brand hints (prefer these mappings when they appear):
${brandHintList()}

Return JSON only with this shape:
{"matches":[{"symbol":"NVDA","why":"short reason"}],"unavailable":[{"brand":"Nike","parent":"Nike"}]}

Rules:
- matches.symbol must be copied exactly from the catalog list above.
- If a brand's parent is not in the catalog, put it in unavailable.
- Do not include symbols that are not in the catalog list.
- Skip brands the user did not mention.`;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`grok http ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty grok response");

  const parsed = JSON.parse(content) as ModelResult;
  return {
    matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    unavailable: Array.isArray(parsed.unavailable) ? parsed.unavailable : [],
  };
}

export async function POST(request: Request) {
  try {
    let body: MatchRequest;
    try {
      body = (await request.json()) as MatchRequest;
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return jsonError("text is required", 400);
    }

    let source: MatchResponse["source"] = "local";
    let result: ModelResult = matchLocal(text);

    if (process.env.XAI_API_KEY) {
      try {
        result = await matchWithGrok(text);
        source = "grok";
      } catch {
        result = matchLocal(text);
        source = "local";
      }
    }

    return Response.json(applyGuardrail(result, source));
  } catch {
    return jsonError("Failed to match brands", 500);
  }
}
