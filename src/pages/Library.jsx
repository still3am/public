import LoadError from '@/components/LoadError';
import {useRef} from 'react';
import BulkOrganizeSheet from '@/components/library/BulkOrganizeSheet';
import {readAllPages} from '@/lib/readPages';
import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, Plus, ListMusic, Disc3, X, Upload } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import CardRail from "@/components/CardRail";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import LibraryEntryRow from "@/components/LibraryEntryRow";
import PlaylistCard from "@/components/playlist/PlaylistCard";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";
import LibraryBulkBar from "@/components/library/LibraryBulkBar";
import BulkAddToPlaylistSheet from "@/components/library/BulkAddToPlaylistSheet";
import { useToast } from "@/components/ui/use-toast";
import { getRecentPlays } from "@/lib/recentPlays";
import { useMyPlaylists } from "@/hooks/useMyPlaylists";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const cache = useOfflineCache();
  const [tracks, setTracks] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedPlaylists, setSavedPlaylists] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showOrganize,setShowOrganize]=useState(false);
  const [folders,setFolders]=useState([]);
  const [folder,setFolder]=useState("");
  const [tagQuery,setTagQuery]=useState("");
  const [entryMap,setEntryMap]=useState({});
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { toast } = useToast();
  const { playlists, reload: reloadPlaylists } = useMyPlaylists();

  // Shown on the PUBLIC OFFLINE row so the row states how much is on the device.
  const offlineCount = cache.records.length;

  // Playlists other people made and this user added to their library.
  const loadSavedPlaylists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows=await readAllPages(opts=>base44.entities.SavedPlaylist.filter({user_id:user.id},{sort:"-created_date",...opts}));
      const ids = (rows || []).map((r) => r.playlist_id).filter(Boolean);
      if (!ids.length) {
        setSavedPlaylists([]);
        return;
      }
      const list=await readAllPages(opts=>base44.entities.Playlist.filter({id:{$in:ids}},{sort:"-created_date",...opts}));
      const order = new Map(ids.map((pid, i) => [pid, i]));
      setSavedPlaylists(
        (list || [])
          .slice()
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      );
    } catch {
      setSavedPlaylists([]);
    }
  }, [user?.id]);

  const loadVersion=useRef(0);
  const [loadError,setLoadError]=useState(false);
  const load = useCallback(async () => {
    const request=++loadVersion.current;(request===loadVersion.current)&&setLoadError(false);
    if (!user?.id) {
      (request===loadVersion.current)&&setTracks([]);
      (request===loadVersion.current)&&setLoading(false);
      return;
    }
    (request===loadVersion.current)&&setLoading(true);
    try {
      const items = await readAllPages(opts=>base44.entities.LibraryItem.filter({user_id:user.id},{sort:"-created_date",...opts}));
      (request===loadVersion.current)&&setEntryMap(Object.fromEntries(items.map(r=>[r.track_id,r])));
      (request===loadVersion.current)&&setFolders([...new Set(items.map(r=>r.folder).filter(Boolean))]);
      const trackIds = (items || []).
      map((i) => i.track_id).
      filter(Boolean);
      const list = trackIds.length ?
      await readAllPages(opts=>base44.entities.Track.filter({id:{$in:trackIds}},{sort:"-created_date",...opts})) :
      [];
      const order = new Map(trackIds.map((id, i) => [id, i]));
      (request===loadVersion.current)&&setTracks(
        (list || []).
        slice().
        sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      );
    } catch {(request===loadVersion.current)&&setLoadError(true);
    } finally {
      (request===loadVersion.current)&&setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    loadSavedPlaylists();
  }, [load, loadSavedPlaylists, ids]);

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
  const removableIds = selectedIds.filter((id) => ids.has(id));

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

  const unsavePlaylist = async (playlistId) => {
    setSavedPlaylists((prev) => (prev || []).filter((pl) => pl.id !== playlistId));
    try {
      await base44.entities.SavedPlaylist.deleteMany({
        user_id: user.id,
        playlist_id: playlistId,
      });
      toast({ title: "Removed from your library" });
    } catch {
      toast({ title: "Couldn't remove that playlist", variant: "destructive" });
      loadSavedPlaylists();
    }
  };

  if(loadError)return <LoadError onRetry={load}/>;
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <LibraryEntryRow
        to="/my-uploads"
        icon={Upload}
        label="Your Uploads"
        subtitle="Every song you've posted, in one place" />

      <LibraryEntryRow
        to="/records"
        icon={Disc3}
        label="Public Record"
        subtitle="A–Z artist directory" />

      <LibraryEntryRow
        to="/downloads"
        label="PUBLIC OFFLINE"
        subtitle={
        offlineCount ?
        `${offlineCount} ${offlineCount === 1 ? "song" : "songs"} saved on this device` :
        "Songs saved to play without data"} />

      <LibraryBulkBar
        visible={!!tracks?.length}
        active={editMode}
        count={selected.size}
        canRemove={removableIds.length > 0}
        busy={bulkBusy}
        onOrganize={()=>setShowOrganize(true)}
        onStart={() => setEditMode(true)}
        onExit={exitEditMode}
        onAddToPlaylist={() => setShowBulkPlaylist(true)}
        onRemove={removeFromLibrary} />

      <div className="flex gap-2 mb-4"><select aria-label="Library folder" className="bg-background border rounded-xl p-2 text-sm" value={folder} onChange={e=>setFolder(e.target.value)}><option value="">All folders</option>{folders.map(name=><option key={name}>{name}</option>)}</select><input aria-label="Filter tags" placeholder="Filter by tag" className="min-w-0 bg-background border rounded-xl p-2 text-sm" value={tagQuery} onChange={e=>setTagQuery(e.target.value)}/></div>
      <PullToRefresh onRefresh={async () => {await refresh();await load();await reloadPlaylists();await loadSavedPlaylists();}}>
        {loading && tracks === null ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        <>
          {recentlyPlayed.length > 0 &&
          <section className="mb-7">
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Recently Played</h2>
            <CardRail>
              {recentlyPlayed.map((t) =>
              <TrackCard key={t.id} track={t} />
              )}
            </CardRail>
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

          {savedPlaylists?.length > 0 &&
          <section className="mb-7">
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Saved Playlists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {savedPlaylists.map((pl) =>
              <div key={pl.id} className="relative group">
                  <PlaylistCard playlist={pl} />
                  <button
                  onClick={() => unsavePlaylist(pl.id)}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full grid place-items-center bg-background/85 backdrop-blur text-foreground/60 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                  aria-label="Remove from your library">
                  
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </section>
          }

          <section>
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">Saved</h2>
            {!tracks?.length ?
            <EmptyState
              icon={LibIcon}
              title="Your library is empty"
              description="Tap the + on any track to save it here for quick access." /> :


            <CardRail>
                {tracks.filter(t=>(!folder||entryMap[t.id]?.folder===folder)&&(!tagQuery||(entryMap[t.id]?.tags||[]).some(tag=>tag.toLowerCase().includes(tagQuery.toLowerCase())))).map((t) =>
              <TrackCard
                key={t.id}
                track={t}
                selectable={editMode}
                selected={selected.has(t.id)}
                onToggleSelect={toggleSelect} />

              )}
              </CardRail>
            }
          </section>
        </>
        }
      </PullToRefresh>

      {showOrganize&&<BulkOrganizeSheet trackIds={selectedIds} onClose={()=>setShowOrganize(false)} onDone={()=>{setShowOrganize(false);exitEditMode();load();}}/>}
      {showCreate &&
      <CreatePlaylistModal
        onClose={() => setShowCreate(false)}
        onCreated={reloadPlaylists} />

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