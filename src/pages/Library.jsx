import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useLikes } from "@/context/LikeContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, CloudOff, History, Plus, ListMusic, Disc3, Heart } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import LibraryEntryRow from "@/components/LibraryEntryRow";
import PlaylistCard from "@/components/playlist/PlaylistCard";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";
import LibraryBulkBar from "@/components/library/LibraryBulkBar";
import BulkAddToPlaylistSheet from "@/components/library/BulkAddToPlaylistSheet";
import { useToast } from "@/components/ui/use-toast";
import { getRecentPlays } from "@/lib/recentPlays";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const { count: likedCount } = useLikes();
  const cache = useOfflineCache();
  const [tracks, setTracks] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { toast } = useToast();

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

  const selectedIds = [...selected];
  const uploadIds = new Set((uploads || []).map((t) => t.id));
  const removableIds = selectedIds.filter((id) => ids.has(id));
  const deletableIds = selectedIds.filter((id) => uploadIds.has(id));

  const toggleSelect = (track) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelected(new Set());
  };

  const removeFromLibrary = async () => {
    if (!removableIds.length) return;
    setBulkBusy(true);
    try {
      await base44.entities.LibraryItem.deleteMany({
        user_id: user.id,
        track_id: { $in: removableIds }
      });
      await refresh();
      await load();
      toast({ title: `Removed ${removableIds.length} from your library` });
      exitEditMode();
    } catch {
      toast({ title: "Couldn't remove those songs", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteUploads = async () => {
    if (!deletableIds.length) return;
    setBulkBusy(true);
    try {
      await base44.entities.Track.deleteMany({ id: { $in: deletableIds } });
      await load();
      toast({
        title: `Deleted ${deletableIds.length} ${deletableIds.length === 1 ? "upload" : "uploads"}`
      });
      exitEditMode();
    } catch {
      toast({ title: "Couldn't delete those uploads", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      <PageHeader title="Your Library" subtitle="Everything you've saved, in one place." />

      <LibraryEntryRow
        to="/records"
        icon={Disc3}
        label="Public Record"
        subtitle="A–Z artist directory" />

      <LibraryEntryRow
        to="/liked"
        icon={Heart}
        label="Liked Songs"
        subtitle={likedCount ? `${likedCount} ${likedCount === 1 ? "track" : "tracks"} you've liked` : "Tracks you've liked"} />

      <LibraryEntryRow to="/downloads" label="PUBLIC OFFLINE" />

      <LibraryBulkBar
        visible={!!(uploads?.length || tracks?.length)}
        active={editMode}
        count={selected.size}
        canRemove={removableIds.length > 0}
        canDelete={deletableIds.length > 0}
        busy={bulkBusy}
        onStart={() => setEditMode(true)}
        onExit={exitEditMode}
        onAddToPlaylist={() => setShowBulkPlaylist(true)}
        onRemove={removeFromLibrary}
        onDelete={deleteUploads} />

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
              <TrackCard
                key={t.id}
                track={t}
                selectable={editMode}
                selected={selected.has(t.id)}
                onToggleSelect={toggleSelect} />

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
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Saved</h2>
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
                selectable={editMode}
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
      <BulkAddToPlaylistSheet
        trackIds={selectedIds}
        playlists={playlists}
        onClose={() => setShowBulkPlaylist(false)}
        onDone={() => {
          setShowBulkPlaylist(false);
          exitEditMode();
        }} />

      }
    </div>);

}