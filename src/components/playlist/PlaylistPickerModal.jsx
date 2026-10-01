import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, ListMusic, Plus, Check, Loader2 } from "lucide-react";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";

export default function PlaylistPickerModal({ track, onClose }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [addedTo, setAddedTo] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Playlist
      .filter({ creator_id: user.id }, "-created_date", 200)
      .then((rows) => setPlaylists(rows || []))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!track) return null;

  async function addToPlaylist(pl) {
    setAdding(pl.id);
    try {
      const ids = pl.track_ids || [];
      if (ids.includes(track.id)) {
        setAddedTo(pl.id);
        return;
      }
      await base44.entities.Playlist.update(pl.id, {
        track_ids: [...ids, track.id],
      });
      setAddedTo(pl.id);
    } catch {
      alert("Could not add to playlist. Try again.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">Add to playlist</h2>
            <p className="text-xs text-foreground/50 truncate mt-0.5">{track.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.07] transition mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.08] grid place-items-center">
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold">Create new playlist</span>
        </button>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : !playlists?.length ? (
          <div className="text-center py-10 text-sm text-foreground/50">
            No playlists yet. Create one above.
          </div>
        ) : (
          <div className="space-y-1">
            {playlists.map((pl) => {
              const count = pl.track_ids?.length || 0;
              const isAdded = addedTo === pl.id;
              const isAdding = adding === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => !isAdded && addToPlaylist(pl)}
                  disabled={isAdded || isAdding}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.04] transition text-left disabled:opacity-60"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-foreground/[0.06] grid place-items-center shrink-0">
                    {pl.cover_art_url ? (
                      <img src={pl.cover_art_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic size={18} className="text-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{pl.name}</div>
                    <div className="text-xs text-foreground/50">
                      {count} {count === 1 ? "song" : "songs"}
                    </div>
                  </div>
                  {isAdding ? (
                    <Loader2 size={18} className="animate-spin text-foreground/50" />
                  ) : isAdded ? (
                    <Check size={18} className="text-emerald-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={(pl) => {
            addToPlaylist(pl);
            setPlaylists((prev) => [pl, ...(prev || [])]);
          }}
        />
      )}
    </div>
  );
}