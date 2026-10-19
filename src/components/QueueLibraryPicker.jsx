import IncrementalList from "@/components/IncrementalList";
import { readAllPages } from "@/lib/readPages";
import { Image } from "@/components/ui/image";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { usePlayer } from "@/context/PlayerContext";
import { X, Plus, Check, Loader2, Search, ListMusic } from "lucide-react";

/** @param {any} props */
export default function QueueLibraryPicker({ open, onClose }) {
  const { user } = useAuth();
  const { ids } = useLibrary();
  const p = usePlayer();
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState(new Set());
  const addedRef = useRef(new Set()),loadVersion = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadVersion.current;setLoadError(false);
    if (!user?.id) {
      setTracks([]);setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await readAllPages((options) => base44.entities.LibraryItem.filter({ user_id: user.id }, { sort: "-created_date", ...options }));
      const trackIds = (items || []).map((i) => i.track_id).filter(Boolean);
      if (!trackIds.length) {
        if (request === loadVersion.current) setTracks([]);
        return;
      }
      const list = [];for (let start = 0; start < trackIds.length; start += 200) list.push(...(await readAllPages((options) => base44.entities.Track.filter({ id: { $in: trackIds.slice(start, start + 200) } }, { ...options }))));
      const order = new Map(trackIds.map((id, i) => [id, i]));
      const sorted = (list || []).
      slice().
      sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      if (request === loadVersion.current) setTracks(sorted);
    } catch {
      if (request === loadVersion.current) setLoadError(true);
    } finally {
      if (request === loadVersion.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {addedRef.current = new Set();setJustAdded(new Set());setQuery("");}, [open, user?.id]);
  useEffect(() => {setTracks(null);loadVersion.current++;}, [user?.id]);
  useEffect(() => {if (open) load();return () => {loadVersion.current++;};}, [open, load, ids]);

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
    if (addedRef.current.has(track.id)) return;
    addedRef.current.add(track.id);p.addToQueue(track);
    setJustAdded((prev) => new Set(prev).add(track.id));
  };

  const addAll = () => {const remaining = filtered.filter((track) => !addedRef.current.has(track.id));if (!remaining.length) return;remaining.forEach((track) => addedRef.current.add(track.id));p.addManyToQueue(remaining);setJustAdded(new Set(addedRef.current));};

  return (
    <div role="dialog" aria-modal="true" aria-label="Add music from your library" onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();onClose();}}} data-public-dialog tabIndex={-1} className="queue-library-picker absolute inset-0 z-[60] bg-card text-foreground flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="opacity-80 shrink-0 hidden" />
          <h2 className="text-lg font-bold truncate">Add to queue</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-90 transition"
          aria-label="Close">
          
          <X size={22} />
        </button>
      </div>

      <div className="px-5 pb-3 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus onKeyDown={(e) => {if (e.key === "Escape") {e.stopPropagation();onClose();}}}
            aria-label="Search songs to add to queue" placeholder="Search your library"
            className="w-full pl-10 pr-3 py-2.5 rounded-full bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-accent transition" />
          
        </div>
        {filtered.length > 0 &&
        <button
          onClick={addAll} disabled={filtered.every((track) => justAdded.has(track.id))}
          className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted hover:bg-accent active:scale-95 transition">
          
            Add remaining ({filtered.filter((track) => !justAdded.has(track.id)).length})
          </button>
        }
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-10">
        {loadError && <div role="alert" className="px-3 py-4 text-sm"><p>Couldn’t load your library. Your saved music is still there.</p><button className="playlist-action mt-3" disabled={loading} onClick={load}>Retry</button></div>}
        {loading && tracks === null ?
        <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div> :
        loadError && tracks === null ? null : !filtered.length ?
        <div className="text-center py-16 px-6">
            <p className="text-sm text-muted-foreground">
              {query ? "No matches." : "Your library is empty."}
            </p>
          </div> :

        <IncrementalList items={filtered} resetKey={query} className="space-y-0.5" renderItem={(t) => {
          const added = justAdded.has(t.id);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition">
              
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                    {t.cover_art_url &&
                <Image src={t.cover_art_url} alt="" className="w-full h-full" fittingType="fill" />
                }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.artist || t.uploader_name || "Unknown"}
                    </div>
                  </div>
                  <button
                onClick={() => addOne(t)}
                disabled={added}
                className={`shrink-0 w-9 h-9 rounded-full grid place-items-center active:scale-90 transition ${
                added ?
                "bg-foreground text-background" :
                "bg-muted hover:bg-accent"}`
                }
                aria-label={added ? "Added to queue" : "Add to queue"}>
                
                    {added ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>);

        }} />
        }
      </div>
    </div>);

}