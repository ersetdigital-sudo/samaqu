"use client";

import { useEffect } from "react";

/**
 * Efek halaman bio: scroll reveal (`.rv` → `.rv.in`), tilt hero (`.tilt`),
 * suara + progress bar video hero, dan CTA mengambang.
 * Dipisah ke komponen client kecil supaya halaman bio tetap server-rendered.
 */
export default function BioLinkEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".bio-root");
    if (!root) return;

    const cleanups: Array<() => void> = [];

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

    /* ------------------------------------------------------------------
     * Hero video: suara + progress bar
     * - Autoplay WITH suara dicoba dulu; kalau browser memblokir, otomatis
     *   fallback ke muted (perilaku standar semua browser).
     * - Tombol bunyi/diam ada di pojok hero.
     * - Kalau reel keluar viewport, suara dimatikan otomatis.
     * ------------------------------------------------------------------ */
    const video = root.querySelector<HTMLVideoElement>("#bio-reel");
    const soundBtn = root.querySelector<HTMLButtonElement>("#bio-sound");
    const fill = root.querySelector<HTMLElement>("#bio-pfill");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** on = suara hidup. */
    const setSound = (on: boolean) => {
      if (!video) return;
      video.muted = !on;
      if (!soundBtn) return;
      soundBtn.setAttribute("aria-pressed", String(on));
      soundBtn.setAttribute("aria-label", on ? "Matikan suara video" : "Aktifkan suara video");
      const mutedIcon = soundBtn.querySelector<SVGElement>(".bio-ico-muted");
      const soundIcon = soundBtn.querySelector<SVGElement>(".bio-ico-sound");
      if (mutedIcon) mutedIcon.style.display = on ? "none" : "";
      if (soundIcon) soundIcon.style.display = on ? "" : "none";
    };

    if (video) {
      if (reduce) {
        video.removeAttribute("autoplay");
        video.pause();
        setSound(false);
      } else {
        video.pause();
        setSound(true);
        const attempt = video.play();
        if (attempt && attempt.catch) {
          attempt.catch(() => {
            // Browser menolak autoplay bersuara → pakai muted.
            setSound(false);
            const retry = video.play();
            if (retry && retry.catch) retry.catch(() => {});
          });
        }
      }

      const onTime = () => {
        if (fill && video.duration) {
          fill.style.width = `${(video.currentTime / video.duration) * 100}%`;
        }
      };
      video.addEventListener("timeupdate", onTime);
      video.addEventListener("loadeddata", onTime);
      cleanups.push(() => {
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("loadeddata", onTime);
      });

      if (soundBtn) {
        const onClick = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          const enable = video.muted;
          setSound(enable);
          if (enable && video.paused) {
            const retry = video.play();
            if (retry && retry.catch) retry.catch(() => {});
          }
        };
        soundBtn.addEventListener("click", onClick);
        cleanups.push(() => soundBtn.removeEventListener("click", onClick));
      }

      // Jangan bother orang lain: matikan suara saat reel tidak terlihat.
      const reel = video.parentElement;
      if ("IntersectionObserver" in window && reel) {
        const soundObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting && !video.muted) setSound(false);
            }
          },
          { threshold: 0.35 },
        );
        soundObserver.observe(reel);
        cleanups.push(() => soundObserver.disconnect());
      }
    }

    /* ------------------------------------------------------------------
     * CTA mengambang: muncul setelah hero ter-scroll, hilang saat footer
     * (marquee) sudah masuk layar supaya tidak menutupi konten akhir.
     * ------------------------------------------------------------------ */
    const cta = root.querySelector<HTMLElement>("#bio-cta");
    const hero = root.querySelector<HTMLElement>("#bio-hero");
    const end = document.querySelector<HTMLElement>("[data-bio-end]");
    if (cta) {
      const onScroll = () => {
        const y = window.scrollY || document.documentElement.scrollTop;
        const heroHeight = hero?.offsetHeight ?? 600;
        const pastHero = y > heroHeight * 0.85;
        let endVisible = false;
        if (end) {
          const rect = end.getBoundingClientRect();
          endVisible = rect.top < window.innerHeight - 20;
        }
        cta.classList.toggle("on", pastHero && !endVisible);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      onScroll();
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      });
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(fallback);
      detachTilt?.();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
