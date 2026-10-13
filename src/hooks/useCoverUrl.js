import { useEffect, useState } from "react";

// URLs with a valid image extension load fine in the browser. The old
// base44.app file host stored some covers with a trailing dot and no
// extension (e.g. "...cover.") — those files are valid JPEGs but browsers
// can't render them (trailing dot gets stripped → 403, and the response is
// served as application/octet-stream). This hook detects those broken URLs,
// fetches the bytes, and returns a blob: object URL the browser CAN render.
// Results are cached so scrolling doesn't re-fetch the same cover twice.

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg)$/i;
const WIX_MEDIA_HOSTS = ["media.base44.com", "static.wixstatic.com"];
const blobCache = new Map();

function needsFix(url) {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;
  if (IMAGE_EXT_RE.test(url)) return false;
  return true;
}

// Normalize Wix Media URLs that lack a file extension (e.g. trailing-dot
// URLs from the old file host) by stripping the trailing dot and appending
// .webp. This lets the Image component's transform pipeline resize and
// serve them via CDN instead of falling through to the slow blob-fetch.
function fixWixMediaUrl(url) {
  try {
    const u = new URL(url);
    if (!WIX_MEDIA_HOSTS.includes(u.hostname)) return null;
    const segments = u.pathname.split("/");
    const last = segments[segments.length - 1];
    if (!last) return null;
    const cleaned = last.replace(/\.+$/, "");
    if (IMAGE_EXT_RE.test(cleaned)) return null;
    segments[segments.length - 1] = cleaned + ".webp";
    return `${u.origin}${segments.join("/")}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

export function useCoverUrl(url) {
  const [fixed, setFixed] = useState(() => {
    if (!url) return "";
    const wixFixed = fixWixMediaUrl(url);
    if (wixFixed) return wixFixed;
    if (!needsFix(url)) return url;
    return blobCache.get(url) || "";
  });

  useEffect(() => {
    if (!url) {
      setFixed("");
      return;
    }
    const wixFixed = fixWixMediaUrl(url);
    if (wixFixed) {
      setFixed(wixFixed);
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
        let blob = await res.blob();
        // Older image hosts use application/octet-stream; preserve actual image
        // bytes with the correct MIME so Safari can render their object URLs.
        if(!blob.type.startsWith("image/")){
          const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());
          let mime;
          if(bytes[0]===0xff&&bytes[1]===0xd8)mime="image/jpeg";
          else if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)mime="image/png";
          else if(bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46)mime="image/gif";
          else if(bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[8]===0x57&&bytes[9]===0x45)mime="image/webp";
          if(mime)blob=new Blob([blob],{type:mime});
        }
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