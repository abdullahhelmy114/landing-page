import { useEffect } from "react";

/**
 * Drives every parallax effect on the page from one rAF loop:
 * - [data-speed="0.3"]  translates the element relative to its parent's distance from viewport centre
 * - [data-pin]          writes scroll progress (0→1) through the element into the CSS var --p
 * - .reveal             fades in when it enters the viewport
 */
export function useScrollMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      if (!reduce) {
        document.querySelectorAll<HTMLElement>("[data-speed]").forEach((el) => {
          const host = el.parentElement ?? el;
          const r = host.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const speed = parseFloat(el.dataset["speed"] || "0");
          const axis = el.dataset["axis"] === "x" ? "x" : "y";
          const d = (r.top + r.height / 2 - vh / 2) * speed;
          el.style.transform =
            axis === "x" ? `translate3d(${d}px,0,0)` : `translate3d(0,${d}px,0)`;
        });
      }
      document.querySelectorAll<HTMLElement>("[data-pin]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const total = r.height - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        el.style.setProperty("--p", p.toFixed(4));
      });
      const doc = document.documentElement;
      doc.style.setProperty(
        "--scroll",
        (window.scrollY / Math.max(1, doc.scrollHeight - vh)).toFixed(4),
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
