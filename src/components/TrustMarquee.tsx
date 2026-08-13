"use client";

import { useSafeTranslations } from "@/lib/safe-i18n";

export default function TrustMarquee() {
  const t = useSafeTranslations("trust");
  const items = [t("item1"), t("item2"), t("item3"), t("item4"), t("item5")];

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
