export const SAVED_KEY = "hodlings-saved-discoveries-v1";
export type SavedCompany = { symbol: string; company: string; why: string };
export type SavedDiscovery = { id: string; savedAt: string; companies: SavedCompany[] };
type Store = Pick<Storage, "getItem" | "setItem">;

export function readSaved(storage: Pick<Store, "getItem">): SavedDiscovery[] {
  const raw = storage.getItem(SAVED_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is SavedDiscovery => Boolean(item && typeof item.id === "string" && typeof item.savedAt === "string" && Number.isFinite(Date.parse(item.savedAt)) && Array.isArray(item.companies) && item.companies.length <= 100 && item.companies.every((company: SavedCompany) => company && typeof company.symbol === "string" && typeof company.company === "string" && typeof company.why === "string"))).slice(0, 20);
}
export function saveDiscovery(storage: Store, companies: SavedCompany[]): SavedDiscovery {
  const record = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), companies: companies.slice(0, 100).map(item => ({ symbol: item.symbol.slice(0, 40), company: item.company.slice(0, 200), why: item.why.slice(0, 1000) })) };
  let existing: SavedDiscovery[] = [];
  try { existing = readSaved(storage); } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  storage.setItem(SAVED_KEY, JSON.stringify([record, ...existing].slice(0, 20)));
  return record;
}
export function removeSaved(storage: Store, id: string): SavedDiscovery[] {
  const remaining = readSaved(storage).filter(item => item.id !== id);
  storage.setItem(SAVED_KEY, JSON.stringify(remaining));
  return remaining;
}
