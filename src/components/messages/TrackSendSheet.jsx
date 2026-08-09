import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { X, Search, Loader2, Music2 } from "lucide-react";

export default function TrackSendSheet({ onSend, onClose }) {
  const [query, setQuery] = useState("");
  const [allTracks, setAllTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const published = await base44.entities.Track.filter(
          { is_published: true },
          "-created_date",
          10000
        );
        if (!cancelled) setAllTracks(published || []);
      } catch {
        if (!cancelled) setAllTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? allTracks.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          (t.artist || "").toLowerCase().includes(q) ||
          (t.uploader_name || "").toLowerCase().includes(q)
      )
    : allTracks;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold">Send a song</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 size={22} className="animate-spin text-foreground/40" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-foreground/40 py-8">
              {allTracks.length === 0 ? "No tracks available." : "No tracks found"}
            </p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSend(t)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-foreground/[0.04] transition"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                  {t.cover_art_url ? (
                    <Image src={t.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
                  ) : (
                    <Music2 size={18} className="text-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-foreground/50 truncate">{t.artist || t.uploader_name}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}