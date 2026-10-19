"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Angka yang menghitung halus dari nilai lama ke nilai baru.
 *
 * Satu rAF per angka, durasi pendek, dan berhenti sendiri — tidak ada interval atau
 * timer yang menumpuk. Nilai baru saat animasi masih berjalan melanjutkan dari angka
 * yang sedang tampil (bukan melompat ke target lama).
 */
export default function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("id-ID"),
  duration = 550,
  className,
}: {
  value: number;
  /** Formatter per frame (mis. rupiah). */
  format?: (value: number) => string;
  /** Durasi animasi (ms). */
  duration?: number;
  className?: string;
}) {
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (reduceMotion) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic: cepat di awal, lembut di akhir.
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [target, duration]);

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
    >
      {format(display)}
    </span>
  );
}
