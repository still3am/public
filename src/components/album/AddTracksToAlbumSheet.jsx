import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

// Lets an album's owner pull their existing uploads into the release — for
// songs that were uploaded before the album existed, or as an EP.
export default function AddTracksToAlbumSheet({ album, existingIds, onAdded, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracks, setTracks] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const nextNumber = useRef((existingIds?.size || 0) + 1);

  useEffect(() => {
    let alive = true;
    base44.entities.Track
      .filter({ uploader_id: user?.id }, "-created_date", 200)
      .then((rows) => alive && setTracks(rows || []))
      .catch(() => alive && setTracks([]));
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const candidates = (tracks || []).filter((t) => !existingIds?.has(t.id));
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? candidates.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(needle))
    : candidates;

  async function add(track) {
    setBusy(track.id);
    try {
      await base44.entities.Track.update(track.id, {
        album_id: album.id,
        track_number: nextNumber.current,
      });
      nextNumber.current += 1;
      onAdded?.(track);
    } catch {
      toast({ title: "Couldn't add that track", variant: "destructive" });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight truncate">Add to {album.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your uploads"
            className="h-10 pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {tracks === null ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="animate-spin text-foreground/40" />
            </div>
          ) : !shown.length ? (
            <div className="text-xs text-foreground/50 py-10 text-center">
              {candidates.length ? "Nothing matches that search." : "All of your uploads are already in this release."}
            </div>
          ) : (
            <div className="space-y-1">
              {shown.map((t) => (
                <button
                  key={t.id}
                  onClick={() => add(t)}
                  disabled={!!busy}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-foreground/[0.04] transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-foreground/[0.06] grid place-items-center shrink-0 text-foreground/50">
                    {busy === t.id ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-foreground/50 truncate">{t.artist || t.uploader_name || "You"}</div>
                  </div>
                  {t.album_id && t.album_id !== album.id && (
                    <span className="text-[10px] font-bold text-foreground/45 shrink-0">in another release</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}