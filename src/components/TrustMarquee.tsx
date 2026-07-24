export default function TrustMarquee() {
  const items = ["Material Premium", "Jahitan Presisi", "Nyaman Dipakai", "Desain Modern"];

  return (
    <div
      className="py-5 border-y overflow-hidden"
      style={{ background: "var(--espresso)", borderColor: "var(--coffee)" }}
    >
      <div className="flex whitespace-nowrap marquee">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
            {items.map((item) => (
              <span key={`${dup}-${item}`} className="contents">
                <span className="mx-8 text-[12px] tracking-[0.32em] uppercase" style={{ color: "var(--sand)" }}>
                  {item}
                </span>
                <span style={{ color: "var(--gold)" }}>&#10022;</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
