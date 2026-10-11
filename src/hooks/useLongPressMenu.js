import { useRef, useState } from "react";

/**
 * Touch long-press that opens a TrackOptionsMenu. Spread `handlers` on the card,
 * pass `ref` / `signal` to the menu (anchorRef / openSignal), and call
 * `consumeLongPress()` at the top of click handlers so the release after a
 * long-press doesn't also trigger play/navigation.
 */
export function useLongPressMenu(disabled = false) {
  const ref = useRef(null);
  const timer = useRef(null);
  const fired = useRef(false);
  const [signal, setSignal] = useState(0);

  const cancel = () => clearTimeout(timer.current);
  const start = (e) => {
    if (disabled || e.pointerType === "mouse") return;
    fired.current = false;
    cancel();
    timer.current = setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(15);
      setSignal((n) => n + 1);
    }, 450);
  };
  const consumeLongPress = () => {
    const was = fired.current;
    fired.current = false;
    return was;
  };

  return {
    ref,
    signal,
    consumeLongPress,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerMove: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}