import { useEffect, useState } from "react";
import { getRecord } from "@/lib/offlineCache";

// Resolves a track's cover art to a local blob: URL when the track is in the
// offline cache, so artwork still renders with no connection. Falls back to
// the remote URL (or whatever was passed in) when nothing is cached.
export function useOfflineCoverUrl(trackId, fallbackUrl) {
  const [url, setUrl] = useState(fallbackUrl || "");

  useEffect(() => {
    let blobUrl = null;
    let cancelled = false;

    (async () => {
      if (!trackId) {
        setUrl(fallbackUrl || "");
        return;
      }
      try {
        const rec = await getRecord(trackId);
        if (cancelled) return;
        if (rec?._coverBlob) {
          blobUrl = URL.createObjectURL(rec._coverBlob);
          setUrl(blobUrl);
          return;
        }
      } catch {
        /* ignore — fall through to remote url */
      }
      setUrl(fallbackUrl || "");
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [trackId, fallbackUrl]);

  return url;
}