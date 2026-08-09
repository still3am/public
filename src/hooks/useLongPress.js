import { useRef, useCallback } from "react";

export function useLongPress(onLongPress, delay = 450) {
  const timeoutRef = useRef(null);
  const triggered = useRef(false);

  const start = useCallback((e) => {
    triggered.current = false;
    if (e.touches && e.touches.length > 1) return;
    if (e.button != null && e.button !== 0) return;
    timeoutRef.current = setTimeout(() => {
      triggered.current = true;
      onLongPress(e);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    triggered,
    bind: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear,
      onContextMenu: (e) => {
        e.preventDefault();
        onLongPress(e);
      },
    },
  };
}