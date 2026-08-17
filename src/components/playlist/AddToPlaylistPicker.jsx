import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { X, Plus, Check, Loader2, Search } from "lucide-react";

export default function AddToPlaylistPicker({ playlist, onClose }) {
  const { user } = useAuth();
  const { ids: libIds } = useLibrary();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const existingIds = useMemo(() => new Set(playlist?.track_ids || []), [playlist]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTracks([]);
      return;
    }
    setLoading(true);
    try {
      const [items, uploaded] = await Promise.all([
        base44.entities.LibraryItem.filter({ user_id: user.id }, "-created_date", 1000),
        base44.entities.Track.filter({ uploader_id: user.id }, "-created_date", 1000),
      ]);
      const libIds = (items || []).map((i) => i.track_id).filter(Boolean);
      const uploadIds = new Set((uploaded || []).map((t) => t.id));
      const allIds = [...new Set([...libIds, ...uploadIds])];
      if (!allIds.length) {
        setTracks([]);
        return;
      }
      const list = await base44.entities.Track.filter(
        { id: { $in: allIds } },
        "-created_date",
        1000
      );
      setTracks(list || []);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (playlist) load();
  }, [playlist, load, libIds]);

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

  if (!playlist) return null;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelected() {
    if (!selected.size || saving) return;
    setSaving(true);
    try {
      const current = playlist.track_ids || [];
      const toAdd = [...selected].filter((id) => !current.includes(id));
      if (toAdd.length) {
        await base44.entities.Playlist.update(playlist.id, {
          track_ids: [...current, ...toAdd],
        });
      }
      onClose();
    } catch {
      alert("Could not add songs. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate">Add to {playlist.name}</h2>
          <p className="text-xs text-white/50">
            {selected.size > 0 ? `${selected.size} selected` : "Tap to select songs"}
          </p>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/10" aria-label="Close">
          <X size={22} />
        </button>
      </div>

      <div className="px-5 pb-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your music"
            className="w-full pl-10 pr-3 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/15 transition"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-white/50" />
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-16 text-sm text-white/50">
            {query ? "No matches." : "No songs in your library yet."}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((t) => {
              const isSelected = selected.has(t.id);
              const alreadyIn = existingIds.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => !alreadyIn && toggle(t.id)}
                  disabled={alreadyIn}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition text-left ${
                    alreadyIn
                      ? "opacity-40"
                      : isSelected
                      ? "bg-white/15"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0">
                    {t.cover_art_url && (
                      <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-white/50 truncate">
                      {t.artist || t.uploader_name || "Unknown"}
                    </div>
                  </div>
                  {alreadyIn ? (
                    <Check size={18} className="text-emerald-400 shrink-0" />
                  ) : isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-white text-black grid place-items-center shrink-0">
                      <Check size={14} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/30 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="absolute bottom-0 inset-x-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 to-transparent">
          <button
            onClick={addSelected}
            disabled={saving}
            className="w-full h-12 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "Adding…" : `Add ${selected.size} ${selected.size === 1 ? "song" : "songs"}`}
          </button>
        </div>
      )}
    </div>
  );
}