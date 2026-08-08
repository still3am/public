import { useEffect, useState } from "react";

// URLs with a valid image extension load fine in the browser. The old
// base44.app file host stored some covers with a trailing dot and no
// extension (e.g. "...cover.") — those files are valid JPEGs but browsers
// can't render them (trailing dot gets stripped → 403, and the response is
// served as application/octet-stream). This hook detects those broken URLs,
// fetches the bytes, and returns a blob: object URL the browser CAN render.
// Results are cached so scrolling doesn't re-fetch the same cover twice.

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg)$/i;
const blobCache = new Map();

function needsFix(url) {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;
  if (IMAGE_EXT_RE.test(url)) return false;
  return true;
}

export function useCoverUrl(url) {
  const [fixed, setFixed] = useState(() => {
    if (!url) return "";
    if (!needsFix(url)) return url;
    return blobCache.get(url) || "";
  });

  useEffect(() => {
    if (!url) {
      setFixed("");
      return;
    }
    if (!needsFix(url)) {
      setFixed(url);
      return;
    }
    if (blobCache.has(url)) {
      setFixed(blobCache.get(url));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) setFixed(url); // let the <img onError> handle it
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        blobCache.set(url, blobUrl);
        setFixed(blobUrl);
      } catch {
        if (!cancelled) setFixed(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return fixed;
}