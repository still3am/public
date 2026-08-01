import { useEffect, useRef } from "react";

/**
 * Keeps the device screen awake while `active` is true (powered by the Screen
 * Wake Lock API). Re-acquires the lock on visibility changes so playback
 * resumes its keep-alive when the page comes back to the foreground.
 *
 * On iOS Safari standalone PWAs this prevents the phone from auto-locking and
 * stopping audio while a track is playing on the open page.
 */
export function useWakeLock(active) {
  const lockRef = useRef(null);

  const acquire = async () => {
    if (!("wakeLock" in navigator) || lockRef.current) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // user gesture / visibility conditions not met — ignore
    }
  };

  const release = () => {
    if (lockRef.current) {
      lockRef.current.release?.();
      lockRef.current = null;
    }
  };

  useEffect(() => {
    if (!active) {
      release();
      return;
    }
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && active) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      release();
    };
  }, [active]);
}