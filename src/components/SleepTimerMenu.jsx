import { useEffect, useRef, useState } from "react";
import { Moon } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const OPTIONS = [5, 15, 30, 45, 60];

function remainingLabel(endsAt, now) {
  const secs = Math.max(0, Math.round((endsAt - now) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SleepTimerMenu() {
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const wrapRef = useRef(null);

  const endsAt = p.sleepTimerEndsAt;
  const active = !!endsAt;

  // Ticking countdown while a timer is running
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

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

  const pick = (minutes) => {
    p.setSleepTimer(minutes);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative flex items-center shrink-0">
      {open &&
      <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      <button
        onClick={() => {setNow(Date.now());setOpen((v) => !v);}}
        aria-label="Sleep timer"
        title="Sleep timer"
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-full transition active:scale-90 ${
        active ? "bg-white/15 ring-1 ring-white/20" : "hover:bg-white/10"}`
        }>
        
        <Moon size={20} />
        {active && <span className="text-xs font-bold tabular-nums">{remainingLabel(endsAt, now)}</span>}
      </button>

      {open &&
      <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl py-1.5 animate-[fadeIn_.15s_ease-out]">
          <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-[0.2em] opacity-50">
            {active ? `Pauses in ${remainingLabel(endsAt, now)}` : "Sleep timer"}
          </div>

          {OPTIONS.map((m) =>
        <button
          key={m}
          onClick={() => pick(m)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition">
          
              {m} minutes
            </button>
        )}

          {active &&
        <button
          onClick={() => pick(0)}
          className="w-full px-3 py-2 text-left text-sm border-t border-white/10 hover:bg-white/10 transition opacity-80">
          
              Turn off
            </button>
        }

          <p className="px-3 pt-1.5 pb-1 text-[11px] opacity-45">
            Playback pauses when the timer runs out.
          </p>
        </div>
      }
    </div>);

}