import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, CloudOff, ChevronRight, History, Plus, ListMusic } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import PlaylistCard from "@/components/playlist/PlaylistCard";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";
import LibrarySelectionBar from "@/components/library/LibrarySelectionBar";
import BulkPlaylistPicker from "@/components/library/BulkPlaylistPicker";
import BulkTagModal from "@/components/library/BulkTagModal";
import { useToast } from "@/components/ui/use-toast";
import { getRecentPlays } from "@/lib/recentPlays";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const cache = useOfflineCache();
  const [tracks, setTracks] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [libItems, setLibItems] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const { toast } = useToast();

  const tagsByTrack = useMemo(() => {
    const map = {};
    for (const it of libItems) {
      if (it.track_id && it.tags?.length) map[it.track_id] = it.tags;
    }
    return map;
  }, [libItems]);

  const allTags = useMemo(
    () => [...new Set(libItems.flatMap((i) => i.tags || []))],
    [libItems]
  );

  const selectedTracks = useMemo(
    () => (tracks || []).filter((t) => selected.has(t.id)),
    [tracks, selected]
  );

  const offlineCount = cache.records.length;

  const loadPlaylists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await base44.entities.Playlist.filter({ creator_id: user.id }, "-created_date", 200);
      setPlaylists(rows || []);
    } catch {
      setPlaylists([]);
    }
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTracks([]);
      setUploads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
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
      )]
      );
      const trackIds = (items || []).
      map((i) => i.track_id).
      filter(Boolean);
      const uploadedIds = new Set((uploaded || []).map((t) => t.id));
      const list = trackIds.length ?
      await base44.entities.Track.filter(
        { id: { $in: trackIds } },
        "-created_date",
        1000
      ) :
      [];
      const order = new Map(trackIds.map((id, i) => [id, i]));
      const sorted = (list || []).
      slice().
      sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).
      filter((t) => !uploadedIds.has(t.id));
      setTracks(sorted);
      setUploads(uploaded || []);
      setLibItems(items || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    loadPlaylists();
  }, [load, loadPlaylists, ids]);

  useEffect(() => {
    const handler = () => setRecentlyPlayed(getRecentPlays());
    handler();
    window.addEventListener("recentplays:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("recentplays:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const toggleSelect = (track) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  async function bulkAddToPlaylist(playlistId) {
    const ids = [...selected];
    const pl = (playlists || []).find((p) => p.id === playlistId);
    setShowBulkPlaylist(false);
    if (!pl || !ids.length) return exitSelect();
    const current = pl.track_ids || [];
    const toAdd = ids.filter((id) => !current.includes(id));
    if (toAdd.length) {
      await base44.entities.Playlist.update(pl.id, {
        track_ids: [...current, ...toAdd],
      });
      await loadPlaylists();
      toast({
        title: `Added ${toAdd.length} ${toAdd.length === 1 ? "song" : "songs"} to ${pl.name}`,
      });
    }
    exitSelect();
  }

  async function bulkTag(tags) {
    const ids = [...selected];
    setShowBulkTag(false);
    if (!tags.length || !ids.length) return exitSelect();
    const rows = libItems.filter((i) => ids.includes(i.track_id));
    await base44.entities.LibraryItem.bulkUpdate(
      rows.map((r) => ({
        id: r.id,
        tags: [...new Set([...(r.tags || []), ...tags])],
      }))
    );
    await load();
    toast({ title: `Tagged ${ids.length} ${ids.length === 1 ? "track" : "tracks"}` });
    exitSelect();
  }

  async function bulkOffline() {
    const list = selectedTracks;
    await Promise.all(list.map((t) => cache.downloadTrack(t)));
    toast({ title: `Saved ${list.length} offline` });
    exitSelect();
  }

  async function bulkRemove() {
    const ids = [...selected];
    await base44.entities.LibraryItem.deleteMany({
      user_id: user.id,
      track_id: { $in: ids },
    });
    await refresh();
    await load();
    toast({ title: `Removed ${ids.length} from your library` });
    exitSelect();
  }

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      {selectMode ? (
        <LibrarySelectionBar
          count={selected.size}
          onDone={exitSelect}
          onPlaylist={() => setShowBulkPlaylist(true)}
          onTag={() => setShowBulkTag(true)}
          onOffline={bulkOffline}
          onRemove={bulkRemove}
        />
      ) : (
        <PageHeader title="Your Library" subtitle="Everything you've saved, in one place." />
      )}

      <Link
        to="/downloads"
        className="block mb-5 rounded-2xl ring-1 ring-inset ring-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] hover:from-foreground/[0.09] hover:to-foreground/[0.04] transition p-4 group">
        <div className="flex items-center gap-3.5">
          

          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight">PUBLIC OFFLINE</span>
              



              
            </div>
            

            
          </div>
          <ChevronRight size={18} className="text-foreground/40 group-hover:translate-x-0.5 transition shrink-0" />
        </div>
      </Link>

      <PullToRefresh onRefresh={async () => {await refresh();await load();await loadPlaylists();}}>
        {loading && tracks === null ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        <>
          {uploads?.length > 0 &&
          <section className="mb-7">
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Your Uploads</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {uploads.map((t) =>
              <TrackCard key={t.id} track={t} />
              )}
            </div>
          </section>
          }

          {recentlyPlayed.length > 0 &&
          <section className="mb-7">
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Recently Played</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentlyPlayed.map((t) =>
              <TrackCard key={t.id} track={t} />
              )}
            </div>
          </section>
          }

          <section className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Playlists</h2>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-foreground/70 hover:text-foreground transition">
                
                <Plus size={14} /> New
              </button>
            </div>
            {!playlists ?
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-foreground/30" size={18} />
              </div> :
            !playlists.length ?
            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-2xl border-2 border-dashed border-border p-6 text-center hover:bg-foreground/[0.02] transition">
              
                <ListMusic size={24} className="mx-auto text-foreground/30 mb-2" />
                <div className="text-sm font-semibold">Create your first playlist</div>
                <div className="text-xs text-foreground/50 mt-0.5">Group songs into custom rooms</div>
              </button> :

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {playlists.map((pl) =>
              <PlaylistCard key={pl.id} playlist={pl} />
              )}
              </div>
            }
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Saved</h2>
              {tracks?.length > 0 && !selectMode &&
              <button
                onClick={() => setSelectMode(true)}
                className="text-xs font-bold text-foreground/70 hover:text-foreground transition">
                  Select
                </button>
              }
            </div>
            {!tracks?.length ?
            <EmptyState
              icon={LibIcon}
              title="Your library is empty"
              description="Tap the + on any track to save it here for quick access." /> :


            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {tracks.map((t) =>
              <TrackCard
                key={t.id}
                track={t}
                tags={tagsByTrack[t.id] || []}
                selectable={selectMode}
                selected={selected.has(t.id)}
                onToggleSelect={toggleSelect} />
              )}
              </div>
            }
          </section>
        </>
        }
      </PullToRefresh>

      {showCreate &&
      <CreatePlaylistModal
        onClose={() => setShowCreate(false)}
        onCreated={() => loadPlaylists()} />

      }

      {showBulkPlaylist &&
      <BulkPlaylistPicker
        playlists={playlists || []}
        count={selected.size}
        onPick={bulkAddToPlaylist}
        onClose={() => setShowBulkPlaylist(false)} />
      }

      {showBulkTag &&
      <BulkTagModal
        allTags={allTags}
        count={selected.size}
        onApply={bulkTag}
        onClose={() => setShowBulkTag(false)} />
      }
    </div>);

}