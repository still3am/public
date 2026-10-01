import { Link } from "react-router-dom";
import { Check, X, Music2, Loader2 } from "lucide-react";

// One pending-upload row: cover, title/artist/genre, approve + reject.
// All actions are owned by the parent; this is purely presentational.
export default function ApprovalRow({ track, busy, onApprove, onReject }) {
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
          {track.artist || "Unknown artist"} · {track.genre || "Other"}
        </div>
        <div className="text-[11px] text-foreground/40 truncate">
          by {track.uploader_name || "Unknown"}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onApprove}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border text-foreground/70 text-xs font-semibold disabled:opacity-50 active:scale-95 transition"
        >
          <X size={13} /> Reject
        </button>
      </div>
    </div>
  );
}