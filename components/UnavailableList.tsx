import type { UnavailableBrand } from "@/lib/types.frontend";

export default function UnavailableList({ brands }: { brands: UnavailableBrand[] }) {
  if (!brands.length) return null;

  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faded">Not available</h2>
      <ul className="mt-3 divide-y divide-dashed divide-rule border-y border-dashed border-rule">
        {brands.map((b) => (
          <li
            key={b.brand}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-faded"
          >
            <span className="font-mono line-through decoration-faded/60">{b.brand}</span>
            <span className="text-sm">{b.parent} · not in the True Markets catalog</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
