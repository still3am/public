import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, CloudOff, ChevronRight, History, Plus, ListMusic, Mic2, Check, X } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import PlaylistCard from "@/components/playlist/PlaylistCard";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";
import SelectableTrackCard from "@/components/library/SelectableTrackCard";
import BulkSelectionBar from "@/components/library/BulkSelectionBar";
import { useToast } from "@/components/ui/use-toast";
import { getRecentPlays } from "@/lib/recentPlays";

export default function Library() {
  const { user } = useAuth();
  const { ids, refresh, removeMany } = useLibrary();
  const cache = useOfflineCache();
  const { toast } = useToast();
  const [tracks, setTracks] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState("");
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);

  const offlineCount = cache.records.length;
  const selectedTracks = (tracks || []).filter((t) => selected.has(t.id));
  const allSelected = !!tracks?.length && selected.size === tracks.length;

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
    setBulkBusy("");
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());else
    setSelected(new Set((tracks || []).map((t) => t.id)));
  }

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

  async function bulkRemove() {
    const list = [...selected];
    if (!list.length) return;
    setBulkBusy("Removing…");
    const ok = await removeMany(list);
    setBulkBusy("");
    toast(
      ok ?
      { title: `Removed ${list.length} ${list.length === 1 ? "track" : "tracks"}` } :
      { title: "Couldn't remove those tracks", variant: "destructive" }
    );
    if (ok) exitSelect();
  }

  async function bulkDownload() {
    const list = selectedTracks;
    if (!list.length) return;
    let done = 0;
    for (const t of list) {
      setBulkBusy(`Saving ${done + 1}/${list.length}…`);
      const ok = await cache.downloadTrack(t);
      if (ok) done += 1;
    }
    setBulkBusy("");
    toast(
      done ?
      { title: `Saved ${done} ${done === 1 ? "track" : "tracks"} for offline` } :
      { title: "Couldn't save those tracks", variant: "destructive" }
    );
    exitSelect();
  }

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      <PageHeader title="Your Library" subtitle="Everything you've saved, in one place." />

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

      <Link
        to="/records"
        className="block mb-5 rounded-2xl ring-1 ring-inset ring-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] hover:from-foreground/[0.09] hover:to-foreground/[0.04] transition p-4 group">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
            <Mic2 size={18} className="text-foreground/70" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-extrabold tracking-tight">PUBLIC RECORD</span>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Every artist on PUBLIC, A–Z
            </p>
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
              {tracks?.length > 0 &&
              <button
                onClick={() => selectMode ? exitSelect() : setSelectMode(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/70 hover:text-foreground transition">
                
                  {selectMode ? <X size={14} /> : <Check size={14} />}
                  {selectMode ? "Done" : "Select"}
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
              <SelectableTrackCard
                key={t.id}
                track={t}
                selectMode={selectMode}
                selected={selected.has(t.id)}
                onToggle={toggleOne} />

              )}
              </div>
            }
          </section>
        </>
        }
      </PullToRefresh>

      {selectMode &&
      <BulkSelectionBar
        count={selected.size}
        allSelected={allSelected}
        busyLabel={bulkBusy}
        onToggleAll={toggleAll}
        onAddToPlaylist={() => setShowBulkPlaylist(true)}
        onDownload={bulkDownload}
        onRemove={bulkRemove}
        onCancel={exitSelect} />

      }

      {showBulkPlaylist && selectedTracks.length > 0 &&
      <PlaylistPickerModal
        tracks={selectedTracks}
        onClose={() => {
          setShowBulkPlaylist(false);
          exitSelect();
        }} />

      }

      {showCreate &&
      <CreatePlaylistModal
        onClose={() => setShowCreate(false)}
        onCreated={() => loadPlaylists()} />

      }
    </div>);

}