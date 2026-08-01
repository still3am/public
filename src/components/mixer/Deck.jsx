import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Loader2,
  RotateCcw,
  Music,
  ListMusic,
} from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import VSlider from "@/components/mixer/VSlider";

function EqColumn({ label, value, onChange, accent = "#ffffff" }) {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <span className="text-[9px] uppercase tracking-widest text-white/50">{label}</span>
      <div className="h-24 w-6 flex items-end justify-center">
        <VSlider value={value} min={-12} max={12} step={1} onChange={onChange} accent={accent} />
      </div>
      <span className="text-[9px] tabular-nums text-white/60">
        {value > 0 ? "+" : ""}
        {Math.round(value)}
      </span>
    </div>
  );
}

export default function Deck({ label, accent, deck, onLoad, onPlay, onPause, onSeek, onVolume, onPitch, onEq }) {
  const t = deck.track;
  const pct = deck.duration ? (deck.position / deck.duration) * 100 : 0;

  return (
    <div className="flex-1 min-w-0 rounded-3xl bg-white/[0.06] ring-1 ring-white/10 p-4 flex flex-col gap-3 backdrop-blur-sm">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold text-black"
            style={{ background: accent }}
          >
            {label}
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Deck {label}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLoad}
          className="text-white/70 hover:text-white hover:bg-white/10 h-8 gap-1.5 text-xs"
        >
          <ListMusic size={14} /> Load
        </Button>
      </div>

      {/* artwork + meta */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 shrink-0 grid place-items-center">
          {t?.cover_art_url ? (
            <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music size={22} className="text-white/40" />
          )}
        </div>
        <div className="min-w-0">
          {deck.loading ? (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : t ? (
            <>
              <div className="text-sm font-bold truncate text-white">{t.title}</div>
              <div className="text-xs text-white/55 truncate">{t.artist || t.uploader_name || "Unknown"}</div>
            </>
          ) : (
            <div className="text-sm text-white/40">No track loaded</div>
          )}
        </div>
      </div>

      {/* scrubber */}
      <div>
        <input
          type="range"
          min={0}
          max={deck.duration || 0}
          step="0.1"
          value={deck.position}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={!t}
          className="w-full accent-white disabled:opacity-40"
          aria-label="Seek"
        />
        <div className="flex justify-between text-[10px] tabular-nums text-white/50 mt-1">
          <span>{formatTime(deck.position)}</span>
          <span>{formatTime(Math.max(0, (deck.duration || 0) - deck.position))}</span>
        </div>
      </div>

      {/* transport */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSeek(0)}
          disabled={!t}
          className="rounded-full text-white/70 hover:bg-white/10"
          aria-label="Cue to start"
        >
          <RotateCcw size={18} />
        </Button>
        <button
          onClick={() => (deck.isPlaying ? onPause() : onPlay())}
          disabled={!t}
          className="w-14 h-14 rounded-full bg-white text-black grid place-items-center active:scale-95 transition disabled:opacity-40 shadow-lg"
          aria-label={deck.isPlaying ? "Pause" : "Play"}
        >
          {deck.isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" className="ml-0.5" />}
        </button>
      </div>

      {/* EQ + volume */}
      <div className="flex items-end justify-around px-1 pt-1">
        <EqColumn label="Low" value={deck.eq.bass} onChange={(v) => onEq("bass", v)} />
        <EqColumn label="Mid" value={deck.eq.mid} onChange={(v) => onEq("mid", v)} />
        <EqColumn label="High" value={deck.eq.treble} onChange={(v) => onEq("treble", v)} />
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="text-[9px] uppercase tracking-widest text-white/50">Vol</span>
          <div className="h-24 w-6 flex items-end justify-center">
            <VSlider
              value={Math.round(deck.volume * 100)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => onVolume(v / 100)}
              accent="#e5e5e5"
            />
          </div>
          <span className="text-[9px] tabular-nums text-white/60">{Math.round(deck.volume * 100)}</span>
        </div>
      </div>

      {/* pitch */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-white/50 w-10">Pitch</span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.01}
          value={deck.pitch}
          onChange={(e) => onPitch(Number(e.target.value))}
          disabled={!t}
          className="flex-1 accent-white disabled:opacity-40"
          aria-label="Pitch"
        />
        <button
          onClick={() => onPitch(1)}
          className="text-[10px] tabular-nums text-white/60 hover:text-white w-12 text-right"
        >
          {deck.pitch === 1 ? "0.0%" : `${(((deck.pitch - 1) * 100) | 0)}%`}
        </button>
      </div>
    </div>
  );
}