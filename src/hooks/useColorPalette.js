import { useEffect, useState } from "react";

const FALLBACK = ["#8b8b8b", "#4b4b4b", "#e8e8e8"];

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** @param {number[]} rgb */
function boost([r, g, b]) {
  // push toward a vivid, screen-friendly version of the sampled color
  const max = Math.max(r, g, b) || 1;
  const k = Math.min(2.2, 210 / max);
  return `rgb(${clamp(r * k)}, ${clamp(g * k)}, ${clamp(b * k)})`;
}

// Samples an image and returns three vivid colors [primary, secondary, accent]
// for gradient use. Falls back to neutral greys on CORS taint or failure.
export function useColorPalette(url, vivid = false) {
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
        const allBuckets = [...buckets.values()];
        const saturated = allBuckets.filter(bucket => bucket.sat > 45 && bucket.n >= 2);
        const candidates = vivid && saturated.length ? saturated : allBuckets;
        const ranked = candidates
          .map((b) => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], score: b.n * (1 + b.sat / (vivid ? 45 : 120)) }))
          .sort((a, b) => b.score - a.score);

        if (!ranked.length) {
          setPalette(FALLBACK);
          return;
        }
        const distinct=[];
        for(const candidate of ranked){
          if(distinct.every(previous=>Math.hypot(...previous.map((value,index)=>value-candidate.rgb[index]))>70))distinct.push(candidate.rgb);
          if(distinct.length===3)break;
        }
        // Distinct artwork colors make the flowing bands visible instead of picking three almost identical buckets.
        const sampled=distinct.map(color=>boost(color));
        setPalette([sampled[0],sampled[1]||sampled[0],sampled[2]||sampled[1]||sampled[0]]);
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
  }, [url, vivid]);

  return palette;
}