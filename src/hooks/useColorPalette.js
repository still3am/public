import { useEffect, useState } from "react";

const FALLBACK = ["#8b8b8b", "#4b4b4b", "#e8e8e8"];

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function boost([r, g, b]) {
  // push toward a vivid, screen-friendly version of the sampled color
  const max = Math.max(r, g, b) || 1;
  const k = Math.min(2.2, 210 / max);
  return `rgb(${clamp(r * k)}, ${clamp(g * k)}, ${clamp(b * k)})`;
}

// Samples an image and returns three vivid colors [primary, secondary, accent]
// for gradient use. Falls back to neutral greys on CORS taint or failure.
export function useColorPalette(url) {
  const [palette, setPalette] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setPalette(FALLBACK);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const w = (canvas.width = 24);
        const h = (canvas.height = 24);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        // bucket pixels by hue-ish key, keep the most saturated buckets
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i], G = data[i + 1], B = data[i + 2];
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          if (max < 24 || (max > 240 && min > 230)) continue;
          const key = `${R >> 5}-${G >> 5}-${B >> 5}`;
          const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, sat: max - min };
          b.r += R; b.g += G; b.b += B; b.n += 1;
          buckets.set(key, b);
        }
        const ranked = [...buckets.values()]
          .map((b) => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], score: b.n * (1 + b.sat / 120) }))
          .sort((a, b) => b.score - a.score);

        if (!ranked.length) {
          setPalette(FALLBACK);
          return;
        }
        const pick = (i) => boost(ranked[Math.min(i, ranked.length - 1)].rgb);
        setPalette([pick(0), pick(1), pick(2)]);
      } catch {
        setPalette(FALLBACK);
      }
    };
    img.onerror = () => {
      if (!cancelled) setPalette(FALLBACK);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return palette;
}