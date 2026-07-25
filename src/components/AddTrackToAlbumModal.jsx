import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Check, Music, X } from "lucide-react";

export default function AddTrackToAlbumModal({ albumId, currentCount = 0, onClose, onAdded }) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    base44.entities.Track
      .filter({ uploader_id: user.id }, "-created_date", 200)
      .then((res) => {
        const all = Array.isArray(res) ? res : [];
        setTracks(all.filter((t) => t.album_id !== albumId));
      })
      .finally(() => setLoading(false));
  }, [user.id, albumId]);

  function toggle(id) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function add() {
    setAdding(true);
    const list = tracks.filter((t) => sel.has(t.id));
    try {
      const album = await base44.entities.Album.get(albumId).catch(() => null);
      const updates = list.map((t, i) => {
        const patch = { id: t.id, album_id: albumId, track_number: currentCount + i };
        if (album?.artisan && !t.artist) patch.artist = album.artisan;
        if (album?.cover_art_url && !t.cover_art_url) patch.cover_art_url = album.cover_art_url;
        return patch;
      });
      await base44.entities.Track.bulkUpdate(updates);
      setDone(true);
      onAdded?.();
      onClose();
    } catch {
      alert("Could not add tracks right now. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold tracking-tight">Add your tracks</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-foreground/50 mb-3">
          Pick from your uploads to contribute to this album.
        </p>

        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-foreground/60 py-8 text-center">
            You don't have any tracks available to add. Upload a track first!
          </p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1 no-scrollbar">
              {tracks.map((t) => {
                const checked = sel.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${
                      checked ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 transition ${
                        checked ? "bg-foreground text-background border-foreground" : "border-border"
                      }`}
                    >
                      {checked && <Check size={12} />}
                    </div>
                    <div className="w-9 h-9 rounded bg-foreground/10 overflow-hidden shrink-0">
                      {t.cover_art_url && <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-xs text-foreground/50 truncate">{t.genre}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-xs text-foreground/50">{sel.size} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-foreground/5"
                >
                  Cancel
                </button>
                <button
                  onClick={add}
                  disabled={sel.size === 0 || adding || done}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 flex items-center gap-2 hover:scale-[1.02] transition"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Music size={14} />}
                  Add to album
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}