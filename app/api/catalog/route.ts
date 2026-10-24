import { getCatalogSnapshot } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
    const catalog = await getCatalogSnapshot();
    const assets = catalog.assets.filter((asset) => {
      if (!q) return true;
      return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q)
      );
    });

    return Response.json({ count: assets.length, assets, source: catalog.source, refreshSeconds: 60 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
