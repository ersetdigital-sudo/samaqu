"use client";

import { useEffect } from "react";

/**
 * Efek halaman bio: scroll reveal (`.rv` → `.rv.in`) dan tilt hero (`.tilt`).
 * Dipisah ke komponen client kecil supaya halaman bio tetap server-rendered.
 */
export default function BioLinkEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".bio-root");
    if (!root) return;

    const elements = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    let observer: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target as HTMLElement;
            const siblings = Array.from(el.parentElement?.children ?? []).filter(
              (child): child is HTMLElement =>
                child instanceof HTMLElement && child.classList.contains("rv"),
            );
            el.style.transitionDelay = `${Math.max(0, siblings.indexOf(el)) * 80}ms`;
            el.classList.add("in");
            observer?.unobserve(el);
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      elements.forEach((el) => observer?.observe(el));
    } else {
      elements.forEach((el) => el.classList.add("in"));
    }

    // Kalau observer tidak pernah memicu (mis. elemen tersembunyi), tetap tampilkan.
    const fallback = window.setTimeout(() => {
      elements.forEach((el) => el.classList.add("in"));
    }, 4000);

    const card = root.querySelector<HTMLElement>(".tilt");
    let detachTilt: (() => void) | undefined;
    if (card && window.matchMedia("(hover: hover)").matches) {
      const onMove = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      };
      const onLeave = () => {
        card.style.transform = "";
      };
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
      detachTilt = () => {
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
        card.style.transform = "";
      };
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(fallback);
      detachTilt?.();
    };
  }, []);

  return null;
}
