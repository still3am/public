import { useState } from "react";
import { Play, Pause, Search, RotateCcw } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { formatTime } from "@/lib/audio-utils";
import DeckVisualizer from "./DeckVisualizer";
import DeckTrackPicker from "./DeckTrackPicker";

export default function MixDeck({ index, label, engine }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const track = engine.tracks[index];
  const isPlaying = engine.playing[index];
  const position = engine.positions[index];
  const duration = engine.durations[index];
  const volume = engine.volumes[index];
  const pitch = engine.pitches[index];
  const coverUrl = useCoverUrl(track?.cover_art_url);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/50 backdrop-blur p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest text-muted-foreground">{label}</span>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 active:scale-95 transition"
        >
          <Search size={13} /> Load
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-foreground/10 shrink-0 relative">
          {coverUrl ? (
            <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/20 text-[9px] uppercase tracking-wider text-center px-1">
              {track?.genre || "Empty"}
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 border-2 border-foreground/40 rounded-xl animate-pulse pointer-events-none" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{track?.title || "No track loaded"}</div>
          <div className="text-xs text-muted-foreground truncate">{track?.artist || track?.uploader_name || "—"}</div>
          <DeckVisualizer getAnalyser={() => engine.getAnalyser(index)} active={isPlaying} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => engine.togglePlay(index)}
          disabled={!track}
          className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-30 active:scale-95 transition shadow"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button
          onClick={() => engine.cue(index)}
          disabled={!track}
          className="w-9 h-9 rounded-full bg-foreground/5 grid place-items-center disabled:opacity-30 active:scale-95 transition"
          aria-label="Cue to start"
          title="Cue to start"
        >
          <RotateCcw size={15} />
        </button>
        <div className="text-[11px] text-muted-foreground tabular-nums ml-1">
          {formatTime(position)} / {formatTime(duration)}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(position, duration || 0)}
        onChange={(e) => engine.seek(index, Number(e.target.value))}
        className="w-full h-1.5 accent-foreground"
        aria-label="Seek"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1">
            <span>SPEED</span>
            <span className="tabular-nums">{pitch.toFixed(2)}×</span>
          </div>
          <input
            type="range" min={0.5} max={1.5} step={0.01}
            value={pitch}
            onChange={(e) => engine.setPitch(index, Number(e.target.value))}
            className="w-full h-1.5 accent-foreground"
            aria-label="Speed"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1">
            <span>VOL</span>
            <span className="tabular-nums">{Math.round(volume * 100)}</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01}
            value={volume}
            onChange={(e) => engine.setVolume(index, Number(e.target.value))}
            className="w-full h-1.5 accent-foreground"
            aria-label="Volume"
          />
        </div>
      </div>

      <DeckTrackPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(t) => engine.loadTrack(index, t)}
      />
    </div>
  );
}