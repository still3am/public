import { useEffect, useState } from "react";

const FALLBACK = "#2e2e2e";

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function darken(r, g, b, factor) {
  return [clamp(r * factor), clamp(g * factor), clamp(b * factor)];
}

// Extracts a dominant ambient color from an image URL using a tiny canvas.
// On CORS taint or any failure, returns a sensible dark fallback.
export function useColorExtraction(url) {
  const [color, setColor] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setColor(FALLBACK);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        const w = (canvas.width = 16);
        const h = (canvas.height = 16);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const R = data[i],
            G = data[i + 1],
            B = data[i + 2];
          // skip near-white / near-black pixels — they bias the average flat
          const max = Math.max(R, G, B);
          const min = Math.min(R, G, B);
          if (max > 235 && min > 220) continue;
          if (max < 30) continue;
          r += R;
          g += G;
          b += B;
          n += 1;
        }
        if (!n) {
          setColor(FALLBACK);
          return;
        }
        r /= n;
        g /= n;
        b /= n;
        const [dr, dg, db] = darken(r, g, b, 0.55);
        setColor(`rgb(${dr}, ${dg}, ${db})`);
      } catch {
        setColor(FALLBACK);
      }
    };

    img.onerror = () => {
      if (!cancelled) setColor(FALLBACK);
    };

    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}