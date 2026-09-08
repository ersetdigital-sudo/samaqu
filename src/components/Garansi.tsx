import { useSafeTranslations } from "@/lib/safe-i18n";

export default function Garansi() {
  const t = useSafeTranslations("garansi");

  const items = [
    {
      label: t("item1"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]" style={{ color: "var(--gold)" }}>
          <path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3Z" />
          <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
        </svg>
      ),
    },
    {
      label: t("item2"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]" style={{ color: "var(--gold)" }}>
          <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M6 9.5v5M18 9.5v5" />
        </svg>
      ),
    },
    {
      label: t("item3"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]" style={{ color: "var(--gold)" }}>
          <path d="M8.5 3.5 5 5.2 3.2 9l2.6 1.3V20a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1v-9.7L20.8 9 19 5.2l-3.5-1.7" />
          <path d="M8.5 3.5a3.5 3.5 0 0 0 7 0" />
        </svg>
      ),
    },
    {
      label: t("item4"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]" style={{ color: "var(--gold)" }}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Swirl decorative background */}
      <div className="swirl absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 1200 500" preserveAspectRatio="none" fill="none" stroke="rgba(181,140,74,.35)" strokeWidth="1" className="absolute inset-0 w-full h-full opacity-35">
          <path d="M-50 120 C 250 40, 420 190, 700 110 S 1150 20, 1260 90" />
          <path d="M-50 165 C 250 85, 430 235, 710 155 S 1150 65, 1260 135" />
          <path d="M-60 400 C 220 470, 460 330, 720 420 S 1120 470, 1260 400" />
          <path d="M-60 440 C 220 510, 470 370, 730 460 S 1120 505, 1260 440" />
        </svg>
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(201,160,99,.20), transparent 55%), radial-gradient(110% 90% at 0% 100%, rgba(201,160,99,.16), transparent 55%), radial-gradient(90% 70% at 50% 50%, rgba(255,255,255,.55), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 py-12 sm:py-16 text-center">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-8" style={{ background: "rgba(181,140,74,.6)" }} />
          <span
            className="font-semibold font-ui"
            style={{ letterSpacing: "0.4em", fontSize: "11px", color: "var(--gold)" }}
          >
            {t("eyebrow")}
          </span>
          <span className="h-px w-8" style={{ background: "rgba(181,140,74,.6)" }} />
        </div>

        {/* Heading */}
        <h2
          className="mt-4 font-semibold tracking-[.06em] leading-none"
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(44px, 8vw, 60px)",
          }}
        >
          {t("heading")}
        </h2>

        {/* Description */}
        <p
          className="mt-5 mx-auto max-w-[60ch] text-[14px] sm:text-[15px] leading-relaxed font-ui"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("desc")}
        </p>

        {/* 4 guarantee items */}
        <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-8 sm:gap-y-10">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center px-4">
              <span
                className="grid place-items-center w-[72px] h-[72px] rounded-full"
                style={{
                  background: "#efe6d8",
                  boxShadow: "inset 0 0 0 1px rgba(181,140,74,.25)",
                }}
              >
                {item.icon}
              </span>
              <p className="mt-4 text-[13px] sm:text-[14px] leading-snug font-ui whitespace-pre-line" style={{ color: "var(--espresso)" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
