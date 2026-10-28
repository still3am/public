import { useEffect, useState } from "react";
import {useAuth} from "@/lib/AuthContext";
import {withReadTimeout} from "@/lib/readTimeout";
import { getRecord } from "@/lib/offlineCache";

// Resolves a track's cover art to a local blob: URL when the track is in the
// offline cache, so artwork still renders with no connection. Falls back to
// the remote URL (or whatever was passed in) when nothing is cached.
export function useOfflineCoverUrl(trackId, fallbackUrl) {
  const {user}=useAuth();
  const source=JSON.stringify([user?.id||null,trackId||null,fallbackUrl||""]);
  const [resolved, setResolved] = useState(()=>({source,value:fallbackUrl||""}));

  useEffect(() => {
    let blobUrl = null;
    const setUrl=value=>{if(!cancelled)setResolved({source,value});};
    let cancelled = false;

    (async () => {
      if (!trackId) {
        setUrl(fallbackUrl || "");
        return;
      }
      try {
        const rec = await withReadTimeout(getRecord(trackId,user?.id||null),2500);
        if (cancelled) return;
        if (rec?._coverBlob?.size > 0) {
          blobUrl = URL.createObjectURL(rec._coverBlob);
          const image = new Image();
          const decoded = new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Cached cover is invalid'));image.src=blobUrl;});
          try {
            await withReadTimeout(decoded,2500);
            if (!cancelled) setUrl(blobUrl);
            return;
          } catch {
            if(blobUrl)URL.revokeObjectURL(blobUrl);
            blobUrl=null;
          } finally {image.onload=null;image.onerror=null;}
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
  }, [trackId, fallbackUrl,user?.id]);

  return resolved.source===source?resolved.value:fallbackUrl||"";
}