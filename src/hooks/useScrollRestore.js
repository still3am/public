import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const cache = {};
const EXEMPT = ["/track/", "/album/"];

export function useScrollRestore() {
  const loc = useLocation();
  const isExempt = EXEMPT.some((p) => loc.pathname.startsWith(p));

  // Restore (or scroll to anchor) before paint to avoid flicker.
  useLayoutEffect(() => {
    if (isExempt) {
      window.scrollTo(0, 0);
      return;
    }
    if (loc.hash) {
      try {
        const id = decodeURIComponent(loc.hash.slice(1));
        window.setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 50);
        return;
      } catch {
        // fall through
      }
    }
    window.scrollTo(0, cache[loc.pathname] ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname, loc.hash, isExempt]);

  // Continuously record scroll for the active path so returning restores it.
  useEffect(() => {
    if (isExempt) return;
    const onScroll = () => {
      cache[loc.pathname] = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loc.pathname, isExempt]);
}