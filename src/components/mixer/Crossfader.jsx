import { Crosshair, Volume2 } from "lucide-react";

export default function Crossfader({ crossfade, onCrossfade, master, onMaster, onSync, canSync }) {
  return (
    <div className="rounded-3xl bg-white/[0.06] ring-1 ring-white/10 p-4 flex flex-col gap-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Crossfader</span>
        <button
          onClick={onSync}
          disabled={!canSync}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 transition"
        >
          <Crosshair size={13} /> Sync B→A
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-white text-black text-xs font-extrabold grid place-items-center shrink-0">A</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={crossfade}
          onChange={(e) => onCrossfade(Number(e.target.value))}
          className="flex-1 accent-white"
          aria-label="Crossfade A to B"
        />
        <span className="w-6 h-6 rounded-full bg-white text-black text-xs font-extrabold grid place-items-center shrink-0">B</span>
        <button
          onClick={() => onCrossfade(0.5)}
          className="text-[10px] text-white/50 hover:text-white px-1"
          aria-label="Center crossfader"
        >
          center
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 size={14} className="text-white/50" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={master}
          onChange={(e) => onMaster(Number(e.target.value))}
          className="flex-1 accent-white"
          aria-label="Master volume"
        />
        <span className="text-[10px] tabular-nums text-white/50 w-8 text-right">{Math.round(master * 100)}</span>
      </div>
    </div>
  );
}