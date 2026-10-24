// Slowly scrolling symbols along the bottom of the page. Feed it the real catalog symbols later.
export default function TickerStrip({ symbols }: { symbols: string[] }) {
  // Repeat so one copy is wider than the screen, then render it twice for a seamless loop.
  const row = Array.from({ length: 4 }, () => symbols).flat();

  return (
    <div
      aria-hidden
      className="overflow-hidden border-t border-dashed border-rule py-3 font-mono text-xs tracking-[0.3em] text-faded"
    >
      <div className="ticker-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {row.map((symbol, i) => (
              <span key={i} className="px-4">
                {symbol} ·
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
