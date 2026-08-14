import { Link } from "react-router-dom";
import { EyeOff, Music2, Loader2 } from "lucide-react";

// One live-on-PUBLIC row: cover, title/artist/genre/play count, takedown.
// The takedown action is owned by the parent; this is purely presentational.
export default function LiveTrackRow({ track, busy, onTakedown }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border border-border/70 bg-background/40">
      <div className="w-11 h-11 rounded-md overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
        {track.cover_art_url ? (
          <img src={track.cover_art_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music2 size={16} className="text-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to={`/track/${track.id}`}
          className="text-sm font-semibold truncate block hover:underline"
        >
          {track.title}
        </Link>
        <div className="text-xs text-foreground/50 truncate">
          {track.artist || "Unknown artist"} · {track.genre || "Other"} · {track.play_count || 0} plays
        </div>
      </div>
      <button
        onClick={onTakedown}
        disabled={busy}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Remove
      </button>
    </div>
  );
}