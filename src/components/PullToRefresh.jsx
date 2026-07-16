import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
  className = "",
}) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    pullRef.current = pull;
  }, [pull]);
  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;
    const onStart = (e) => {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0]?.clientY ?? null;
      }
    };
    const onMove = (e) => {
      if (startY.current == null || refreshingRef.current) return;
      const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (delta > 4 && window.scrollY <= 0) {
        if (e.cancelable) e.preventDefault();
        setPull(Math.min(THRESHOLD * 1.5, delta * 0.5));
      }
    };
    const onEnd = async () => {
      const reached = pullRef.current >= THRESHOLD;
      startY.current = null;
      if (reached && onRefreshRef.current) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [disabled]);

  return (
    <div className={`relative ${className}`}>
      {(pull > 0 || refreshing) && (
        <div
          className="grid place-items-center text-foreground/60 overflow-hidden transition-[height] duration-150 ease-out"
          style={{
            height: `${pull}px`,
            opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD),
          }}
        >
          {refreshing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <ArrowDown
              size={22}
              className="transition-transform"
              style={{
                transform: `rotate(${(pull / THRESHOLD) * 180}deg)`,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}