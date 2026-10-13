import { useRef, useState, useEffect } from "react";

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
  const origin=useRef(null);

  const cancel=()=>{clearTimeout(timer.current);origin.current=null;};
  useEffect(()=>{cancel();fired.current=false;if(disabled)setSignal(0);return cancel;},[disabled]);
  const start = (e) => {
    fired.current=false;cancel();
    if(disabled||e.pointerType==='mouse'||e.isPrimary===false)return;
    if(e.target instanceof Element&&e.target.closest('button,input,textarea,select'))return;
    origin.current={x:e.clientX,y:e.clientY};
    timer.current = setTimeout(() => {
      if(!ref.current?.isConnected||!ref.current.getClientRects().length)return;
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
      onPointerMove:event=>{const start=origin.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)cancel();},
      onPointerCancel: cancel,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}