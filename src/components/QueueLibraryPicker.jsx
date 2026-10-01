import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayer } from "@/context/PlayerContext";
import { X, Plus, Check, Loader2, Search, ListMusic } from "lucide-react";

export default function QueueLibraryPicker({ open, onClose }) {
  const { user } = useAuth();
  const { ids } = useLibrary();
  const p = usePlayer();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState(new Set());

  const load = useCallback(async () => {
    if (!user?.id) {
      setTracks([]);
      return;
    }
    setLoading(true);
    try {
      const items = await base44.entities.LibraryItem.filter(
        { user_id: user.id },
        "-created_date",
        1000
      );
      const trackIds = (items || []).map((i) => i.track_id).filter(Boolean);
      if (!trackIds.length) {
        setTracks([]);
        return;
      }
      const list = await base44.entities.Track.filter(
        { id: { $in: trackIds } },
        "-created_date",
        1000
      );
      const order = new Map(trackIds.map((id, i) => [id, i]));
      const sorted = (list || [])
        .slice()
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      setTracks(sorted);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open) {
      setJustAdded(new Set());
      load();
    }
  }, [open, load, ids]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks || [];
    return (tracks || []).filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.uploader_name?.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  if (!open) return null;

  const addOne = (track) => {
    p.addToQueue(track);
    setJustAdded((prev) => new Set(prev).add(track.id));
  };

  const addAll = () => {
    if (!filtered.length) return;
    p.addManyToQueue(filtered);
    setJustAdded(new Set(filtered.map((t) => t.id)));
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="opacity-80 shrink-0" />
          <h2 className="text-lg font-bold truncate">Add to queue</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-white/10 active:scale-90 transition"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      <div className="px-5 pb-3 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library"
            className="w-full pl-10 pr-3 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/15 transition"
          />
        </div>
        {filtered.length > 0 && (
          <button
            onClick={addAll}
            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            Add all ({filtered.length})
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-white/50" />
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-white/50">
              {query ? "No matches." : "Your library is empty."}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((t) => {
              const added = justAdded.has(t.id);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition"
                >
                  <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0">
                    {t.cover_art_url && (
                      <img
                        src={t.cover_art_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-white/50 truncate">
                      {t.artist || t.uploader_name || "Unknown"}
                    </div>
                  </div>
                  <button
                    onClick={() => addOne(t)}
                    disabled={added}
                    className={`shrink-0 w-9 h-9 rounded-full grid place-items-center active:scale-90 transition ${
                      added
                        ? "bg-green-500/30 text-green-300"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                    aria-label={added ? "Added to queue" : "Add to queue"}
                  >
                    {added ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}