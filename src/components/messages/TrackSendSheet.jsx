import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import { X, Search, Loader2, Music2, Disc3, Send } from "lucide-react";

export default function TrackSendSheet({ onSend, onClose }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) setTracks([]);
        setLoading(false);
        return;
      }
      try {
        const [items, uploaded] = await Promise.all([
          base44.entities.LibraryItem.filter(
            { user_id: user.id },
            "-created_date",
            1000
          ),
          base44.entities.Track.filter(
            { uploader_id: user.id },
            "-created_date",
            1000
          ),
        ]);
        const trackIds = (items || [])
          .map((i) => i.track_id)
          .filter(Boolean);
        const saved =
          trackIds.length > 0
            ? await base44.entities.Track.filter(
                { id: { $in: trackIds } },
                "-created_date",
                1000
              )
            : [];
        const uploadedIds = new Set((uploaded || []).map((t) => t.id));
        const merged = [
          ...(uploaded || []),
          ...(saved || []).filter((t) => !uploadedIds.has(t.id)),
        ];
        if (!cancelled) setTracks(merged);
      } catch {
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? tracks.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          (t.artist || "").toLowerCase().includes(q) ||
          (t.uploader_name || "").toLowerCase().includes(q)
      )
    : tracks;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-background border border-border/50 rounded-t-3xl md:rounded-3xl max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-background">
          <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[17px] font-semibold">Send a Song</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-foreground/10 transition" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <p className="text-[13px] text-foreground/50 mb-3">Choose from your library to share in the chat.</p>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-8 pr-3 py-2 rounded-full bg-foreground/[0.07] text-[15px] border-0 focus:outline-none placeholder:text-foreground/40"
            />
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 size={24} className="animate-spin text-foreground/30" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground/40">
              <Disc3 size={30} className="mb-3" />
              <p className="text-sm text-center max-w-[220px]">
                {tracks.length === 0
                  ? "Your library is empty. Save songs to share them in chat."
                  : "No tracks found"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSend(t)}
                  className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-foreground/[0.04] active:bg-foreground/[0.06] rounded-2xl transition group"
                >
                  <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                    {t.cover_art_url ? (
                      <Image src={t.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
                    ) : (
                      <Music2 size={20} className="text-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{t.title}</div>
                    <div className="text-[13px] text-foreground/50 truncate">
                      {t.artist || t.uploader_name || "Unknown artist"}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full grid place-items-center shrink-0 transition opacity-0 group-hover:opacity-100 bg-foreground text-background">
                    <Send size={15} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}