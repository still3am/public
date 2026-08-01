import { useRef } from "react";

/*
  Touch-friendly vertical fader driven by pointer events with pointer capture,
  so dragging stays attached even when the finger leaves the track.
*/
export default function VSlider({ value, min = 0, max = 1, step = 0.01, onChange, accent = "#ffffff", heightClass = "h-full" }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const pct = (value - min) / (max - min || 1);

  const setFromY = (clientY) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let p = 1 - (clientY - r.top) / r.height;
    p = Math.max(0, Math.min(1, p));
    let v = min + p * (max - min);
    if (step) v = Math.round(v / step) * step;
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };

  const onDown = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    dragging.current = true;
    setFromY(e.clientY);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    setFromY(e.clientY);
  };
  const onUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={`relative w-3 ${heightClass} rounded-full bg-white/15 cursor-pointer touch-none select-none`}
      style={{ touchAction: "none" }}
    >
      <div
        className="absolute left-0 right-0 bottom-0 rounded-full"
        style={{ height: `${pct * 100}%`, background: accent }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-md ring-1 ring-black/10"
        style={{ top: `calc(${pct * 100}% - 10px)` }}
      />
    </div>
  );
}