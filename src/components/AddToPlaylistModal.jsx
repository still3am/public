import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, Plus, Loader2, CheckCircle2 } from "lucide-react";

export default function AddToPlaylistModal({ trackId, onClose }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [addedId, setAddedId] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const pl = await base44.entities.Playlist.filter(
          { creator_id: user.id },
          "-created_date",
          100
        );
        setPlaylists(pl);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  async function add(playlist) {
    if (playlist.track_ids?.includes(trackId)) {
      setAddedId(playlist.id);
      setTimeout(() => setAddedId(null), 1500);
      return;
    }
    await base44.entities.Playlist.update(playlist.id, {
      track_ids: [...(playlist.track_ids || []), trackId],
    });
    setAddedId(playlist.id);
    setTimeout(() => setDone(true), 600);
  }

  async function createNew() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await base44.entities.Playlist.create({
        name: newName.trim(),
        creator_id: user.id,
        track_ids: [trackId],
      });
      setDone(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-md bg-white border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold">Add to playlist</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {done ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 size={32} className="text-foreground mb-2" />
            <p className="font-semibold">Added to playlist</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <button
                onClick={createNew}
                disabled={creating || !newName.trim()}
                className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Create
              </button>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="py-6 text-center">
                  <Loader2 className="animate-spin inline" />
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-sm text-foreground/50 text-center py-6">
                  No playlists yet. Create your first one above.
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => add(pl)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03] text-left"
                  >
                    {pl.cover_art_url ? (
                      <img
                        src={pl.cover_art_url}
                        alt=""
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-foreground/10 shrink-0 grid place-items-center text-xs text-foreground/40">
                        {pl.track_ids?.length || 0}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {pl.name}
                      </div>
                      <div className="text-xs text-foreground/50">
                        {pl.track_ids?.length || 0} track
                        {(pl.track_ids?.length || 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    {addedId === pl.id ? (
                      <CheckCircle2 size={18} className="text-foreground" />
                    ) : pl.track_ids?.includes(trackId) ? (
                      <CheckCircle2
                        size={18}
                        className="text-foreground/30"
                      />
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}