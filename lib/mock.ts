import type { MatchedAsset, MatchResponse, UnavailableBrand } from "./types";

// Stand-in for /api/match until the backend is ready. The data is made up for layout
// work, not taken from the True Markets catalog. Replace mockMatch with a fetch later.

const MOCK_ASSETS: { keywords: string[]; asset: MatchedAsset }[] = [
  {
    keywords: ["roblox"],
    asset: {
      brand: "Roblox",
      symbol: "RBLX",
      company: "Roblox Corporation",
      issuer: "Robinhood chain",
      venue: "True Markets",
      tradeable: true,
      assetId: "mock-rblx",
      why: "Makes the game you play.",
    },
  },
  {
    keywords: ["netflix"],
    asset: {
      brand: "Netflix",
      symbol: "NFLX",
      company: "Netflix, Inc.",
      issuer: "Coinbase on Base",
      venue: "True Markets",
      tradeable: true,
      assetId: "mock-nflx",
      why: "Runs the streaming service you watch.",
    },
  },
  {
    keywords: ["lululemon", "lulu"],
    asset: {
      brand: "Lululemon",
      symbol: "LULU",
      company: "Lululemon Athletica Inc.",
      issuer: "Robinhood chain",
      venue: "True Markets",
      tradeable: true,
      assetId: "mock-lulu",
      why: "Makes the clothes you buy.",
    },
  },
  {
    keywords: ["apple", "iphone", "airpods", "macbook"],
    asset: {
      brand: "Apple",
      symbol: "AAPL",
      company: "Apple Inc.",
      issuer: "Coinbase on Base",
      venue: "True Markets",
      tradeable: true,
      assetId: "mock-aapl",
      why: "Makes the phone in your pocket.",
    },
  },
  {
    keywords: ["spotify"],
    asset: {
      brand: "Spotify",
      symbol: "SPOT",
      company: "Spotify Technology S.A.",
      issuer: "Robinhood chain",
      venue: "True Markets",
      tradeable: false,
      assetId: "mock-spot",
      why: "Plays the music you stream.",
    },
  },
  {
    keywords: ["nike", "jordan"],
    asset: {
      brand: "Nike",
      symbol: "NKE",
      company: "Nike, Inc.",
      issuer: "Coinbase on Base",
      venue: "True Markets",
      tradeable: true,
      assetId: "mock-nke",
      why: "Makes the shoes you wear.",
    },
  },
];

const MOCK_UNAVAILABLE: { keywords: string[]; brand: UnavailableBrand }[] = [
  {
    keywords: ["coca-cola", "coca cola", "coke"],
    brand: { brand: "Coca-Cola", parent: "The Coca-Cola Company" },
  },
  {
    keywords: ["trader joe"],
    brand: { brand: "Trader Joe's", parent: "Aldi Nord (private)" },
  },
  {
    keywords: ["chick-fil-a", "chick fil a"],
    brand: { brand: "Chick-fil-A", parent: "Chick-fil-A, Inc. (private)" },
  },
];

export const MOCK_SYMBOLS = MOCK_ASSETS.map(({ asset }) => asset.symbol);

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export async function mockMatch(transcript: string): Promise<MatchResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const text = transcript.toLowerCase();
  const mentioned = (keywords: string[]) => keywords.some((k) => text.includes(k));

  const available = MOCK_ASSETS.filter((m) => mentioned(m.keywords)).map((m) => m.asset);
  const unavailable = MOCK_UNAVAILABLE.filter((m) => mentioned(m.keywords)).map((m) => m.brand);

  const sentences: string[] = [];
  if (available.length) {
    sentences.push(`You can get ${joinNames(available.map((a) => a.brand))}.`);
  }
  if (unavailable.length) {
    const verb = unavailable.length === 1 ? "isn't" : "aren't";
    sentences.push(`${joinNames(unavailable.map((u) => u.brand))} ${verb} available here.`);
  }
  if (!sentences.length) {
    sentences.push("I didn't catch any brands. Try naming a few apps or stores you use.");
  }

  return { available, unavailable, spokenSummary: sentences.join(" ") };
}
