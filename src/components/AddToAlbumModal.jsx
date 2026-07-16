import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, Loader2, CheckCircle2, Disc3 } from "lucide-react";

export default function AddToAlbumModal({
  trackId,
  currentAlbumId,
  onClose,
  onAdded,
}) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.Album.filter({ creator_id: user.id }, "-created_date", 100)
      .then((a) => setAlbums(Array.isArray(a) ? a : []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function addTo(album) {
    if (busy) return;
    if (currentAlbumId === album.id) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await base44.entities.Track.update(trackId, {
        album_id: album.id,
        track_number: 0,
      });
      onAdded?.(album);
      onClose();
    } catch {
      alert("Could not add this track to the album. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold">Add track to album</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-foreground/50 mb-3">
            Pick one of your albums to attach this track to (it will also appear
            on that album page).
          </p>
          {loading ? (
            <div className="py-6 text-center">
              <Loader2 className="animate-spin inline" />
            </div>
          ) : albums.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-6">
              You don't have any albums yet. Create one first from Upload.
            </p>
          ) : (
            <div className="space-y-1">
              {albums.map((a) => (
                <button
                  key={a.id}
                  onClick={() => addTo(a)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03] text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-foreground/10 shrink-0 grid place-items-center text-foreground/40">
                    {a.cover_art_url ? (
                      <img
                        src={a.cover_art_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Disc3 size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-foreground/50 truncate">
                      {a.genre || a.artisan || "Album"}
                    </div>
                  </div>
                  {a.id === currentAlbumId && (
                    <CheckCircle2 size={18} className="text-foreground/40" />
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