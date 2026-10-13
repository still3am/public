import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Subscribes to Track updates and calls `onUnpublished(trackId)`
 * whenever a track's `is_published` flips to false (admin takedown),
 * so a public discovery list can drop it immediately without a reload.
 */
export function useUnpublishedSync(onUnpublished) {
  const ref = useRef(onUnpublished);
  useEffect(() => {
    ref.current = onUnpublished;
  }, [onUnpublished]);

  useEffect(() => {
    let unsub=()=>{};try{unsub = base44.entities.Track.subscribe((event) => {
      if(event.type==="delete" || (event.type === "update" && event.data?.is_published === false)) {
        window.dispatchEvent(new Event("catalog:invalidate"));
        ref.current?.(event.data?.id||event.id);
      }
    });}catch{}
    return unsub;
  }, []);
}