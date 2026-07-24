"use client";

import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(".fade-up");

    function revealAll() {
      targets.forEach((el) => el.classList.add("in"));
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );

      targets.forEach((el) => io.observe(el));

      const onLoad = () => setTimeout(revealAll, 400);
      window.addEventListener("load", onLoad);

      return () => {
        io.disconnect();
        window.removeEventListener("load", onLoad);
      };
    } else {
      revealAll();
    }
  }, []);
}
