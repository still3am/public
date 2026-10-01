import { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlaybackSpeedMenu() {
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const rate = p.playbackRate || 1;
  const custom = Math.abs(rate - 1) > 0.001;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const pick = (r) => {
    p.setPlaybackRate(r);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative flex items-center shrink-0">
      {open &&
      <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Playback speed"
        title="Playback speed"
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full transition active:scale-90 ${
        custom ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10"}`
        }>
        
        <Gauge size={20} />
        {custom && <span className="text-xs font-bold tabular-nums">{rate}×</span>}
      </button>

      {open &&
      <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl py-1.5 animate-[fadeIn_.15s_ease-out]">
          <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-[0.2em] opacity-50">
            Playback speed
          </div>

          {RATES.map((r) =>
        <button
          key={r}
          onClick={() => pick(r)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition flex items-center justify-between ${
          Math.abs(r - rate) < 0.001 ? "font-bold" : "opacity-80"}`
          }>
          
              <span>{r === 1 ? "Normal (1×)" : `${r}×`}</span>
              {Math.abs(r - rate) < 0.001 && <span className="text-xs opacity-70">•</span>}
            </button>
        )}

          <p className="px-3 pt-1.5 pb-1 text-[11px] opacity-45">
            Keeps the pitch unchanged.
          </p>
        </div>
      }
    </div>);

}