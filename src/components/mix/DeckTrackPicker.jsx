import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";

/**
 * Bottom-sheet / centered modal that lists published tracks and lets the DJ
 * load one into a deck. Client-side filter by title / artist / uploader.
 */
export default function DeckTrackPicker({ open, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const t = await base44.entities.Track.filter({ is_published: true }, "-created_date", 200);
        if (active) setTracks(Array.isArray(t) ? t : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open]);

  const filtered = query.trim()
    ? tracks.filter((t) => {
        const q = query.toLowerCase();
        return (t.title || "").toLowerCase().includes(q) ||
          (t.artist || "").toLowerCase().includes(q) ||
          (t.uploader_name || "").toLowerCase().includes(q);
      })
    : tracks;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks to load…"
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-foreground/10 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-2 flex-1">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading tracks…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No tracks found.</div>
          ) : (
            filtered.map((t) => (
              <TrackOption key={t.id} track={t} onSelect={() => { onSelect(t); onClose(); }} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TrackOption({ track, onSelect }) {
  const coverUrl = useCoverUrl(track.cover_art_url);
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/5 active:scale-[0.99] transition text-left"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
        {coverUrl ? <Image src={coverUrl} fittingType="fill" alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-muted-foreground truncate">{track.artist || track.uploader_name || "Unknown"}</div>
      </div>
      <div className="text-[10px] text-muted-foreground shrink-0 px-2 py-0.5 rounded-full bg-foreground/5">{track.genre}</div>
    </button>
  );
}