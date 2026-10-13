import LoadError from '@/components/LoadError';
import { useRef } from 'react';
import BulkOrganizeSheet from '@/components/library/BulkOrganizeSheet';
import { readAllPages } from '@/lib/readPages';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import TrackRow from "@/components/TrackRow";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { Library as LibIcon, Loader2, Plus, ListMusic, Disc3, X, Upload, CloudOff, Search, SlidersHorizontal, LayoutGrid, ListPlus, Play, History } from "lucide-react";
import TrackCard from "@/components/TrackCard";
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
  const [unsavingIds, setUnsavingIds] = useState(new Set());
  const unsavingRef = useRef(new Set());
  const savedLoadVersion = useRef(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showOrganize, setShowOrganize] = useState(false);
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [entryMap, setEntryMap] = useState({});
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
    const request = ++savedLoadVersion.current;
    if (!user?.id) return;
    try {
      const rows = await readAllPages((opts) => base44.entities.SavedPlaylist.filter({ user_id: user.id }, { sort: "-created_date", ...opts }));
      const ids = (rows || []).map((r) => r.playlist_id).filter(Boolean);
      if (!ids.length) {
        if (request === savedLoadVersion.current) setSavedPlaylists([]);
        return;
      }
      const list = await readAllPages((opts) => base44.entities.Playlist.filter({ id: { $in: ids } }, { sort: "-created_date", ...opts }));
      const order = new Map(ids.map((pid, i) => [pid, i]));
      if (request !== savedLoadVersion.current) return;
      setSavedPlaylists(
        (list || []).
        slice().
        sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      );
    } catch {

      /* Keep saved playlists visible if a refresh fails. */}
  }, [user?.id]);

  const loadVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const load = useCallback(async () => {
    const request = ++loadVersion.current;request === loadVersion.current && setLoadError(false);
    if (!user?.id) {
      request === loadVersion.current && setTracks([]);
      request === loadVersion.current && setLoading(false);
      return;
    }
    request === loadVersion.current && setLoading(true);
    try {
      const items = await readAllPages((opts) => base44.entities.LibraryItem.filter({ user_id: user.id }, { sort: "-created_date", ...opts }));
      request === loadVersion.current && setEntryMap(Object.fromEntries(items.map((r) => [r.track_id, r])));
      request === loadVersion.current && setFolders([...new Set(items.map((r) => r.folder).filter(Boolean))]);
      const trackIds = (items || []).
      map((i) => i.track_id).
      filter(Boolean);
      const list = trackIds.length ?
      await readAllPages((opts) => base44.entities.Track.filter({ id: { $in: trackIds } }, { sort: "-created_date", ...opts })) :
      [];
      const order = new Map(trackIds.map((id, i) => [id, i]));
      request === loadVersion.current && setTracks(
        (list || []).
        slice().
        sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      );
    } catch {request === loadVersion.current && setLoadError(true);
    } finally {
      request === loadVersion.current && setLoading(false);
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
      if (next.has(track.id)) next.delete(track.id);else
      next.add(track.id);
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
    if (!user?.id || unsavingRef.current.has(playlistId)) return;
    unsavingRef.current.add(playlistId);setUnsavingIds(new Set(unsavingRef.current));
    savedLoadVersion.current++;
    try {
      await base44.entities.SavedPlaylist.deleteMany({ user_id: user.id, playlist_id: playlistId });
      savedLoadVersion.current++;
      setSavedPlaylists((previous) => (previous || []).filter((pl) => pl.id !== playlistId));
      toast({ title: "Removed from your library" });
    } catch {

      /* Keep the saved shortcut so the user can try again. */} finally {
      unsavingRef.current.delete(playlistId);setUnsavingIds(new Set(unsavingRef.current));
    }
  };


  const [libraryView, setLibraryView] = useState("songs");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("saved");
  const [display, setDisplay] = useState("list");
  const p = usePlayer();
  const visibleTracks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (tracks || []).filter((t) => (!folder || entryMap[t.id]?.folder === folder) && (!tagQuery || (entryMap[t.id]?.tags || []).some((tag) => tag.toLowerCase().includes(tagQuery.trim().toLowerCase()))) && (!term || [t.title, t.artist, t.uploader_name].some((value) => (value || "").toLowerCase().includes(term))));
    if (sort === "title") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "artist") list.sort((a, b) => (a.artist || "").localeCompare(b.artist || ""));
    return list;
  }, [tracks, folder, entryMap, tagQuery, search, sort]);
  const matchingPlaylist = (pl) => !search.trim() || [pl.name, pl.description].some((value) => (value || "").toLowerCase().includes(search.trim().toLowerCase()));
  const ownPlaylists = (playlists || []).filter(matchingPlaylist);
  const otherPlaylists = (savedPlaylists || []).filter(matchingPlaylist);
  const recent = recentlyPlayed.filter((t) => !search.trim() || [t.title, t.artist, t.uploader_name].some((value) => (value || "").toLowerCase().includes(search.trim().toLowerCase())));
  const activeFilters = !!folder || !!tagQuery || sort !== "saved";
  const chooseView = (value) => {setLibraryView(value);exitEditMode();setSearch("");};
  if (loadError && tracks === null) return <LoadError onRetry={load} />;
  return (
    <div className="library-page max-w-6xl mx-auto pb-10">
      <header className="library-heading">
        <div><h1>Library</h1><p className="text-sm text-muted-foreground mt-2">Music you keep coming back to.</p></div>
        <button onClick={() => setShowCreate(true)} className="chrome-button"><Plus size={16} /><span>New playlist</span></button>
      </header>
      <div className="library-shortcuts">
        <LibraryEntryRow to="/my-uploads" icon={Upload} label="Uploads" subtitle="Your posted music" />
        <LibraryEntryRow to="/records" icon={Disc3} label="Public Record" subtitle="Explore artists A–Z" />
        <LibraryEntryRow to="/downloads" icon={CloudOff} label="Offline" subtitle={offlineCount ? `${offlineCount} songs on this device` : "Listen without data"} />
      </div>
      <div className="library-navigation" role="group" aria-label="Library views">
        {[["songs", "Songs", tracks?.length], ["playlists", "Playlists", playlists ? playlists.length + (savedPlaylists?.length || 0) : null], ["recent", "Recent", recentlyPlayed.length]].map(([value, label, count]) =>
        <button key={value} aria-pressed={libraryView === value} onClick={() => chooseView(value)} className={libraryView === value ? "active text-left" : ""}>{label}{count != null && <span>{count}</span>}</button>
        )}
      </div>
      <div className="library-tools">
        <div className="library-search"><Search size={17} aria-hidden="true" /><input aria-label="Search your library" placeholder={libraryView === "playlists" ? "Search playlists" : "Search saved music"} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => {if (e.key === "Escape") setSearch("");}} />{search && <button aria-label="Clear library search" onClick={() => setSearch("")}><X size={16} /></button>}</div>
        {libraryView === "songs" && <>
          <button className={`library-tool ${activeFilters ? "active" : ""}`} aria-label="Library filters" aria-expanded={showFilters} aria-controls="library-filters" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={17} /><span className="hidden sm:inline">Filters</span>{activeFilters && <span className="w-1.5 h-1.5 rounded-full bg-current" />}</button>
          <button className="library-tool" aria-label={display === "list" ? "Show music as cards" : "Show music as a list"} onClick={() => setDisplay((value) => value === "list" ? "grid" : "list")}>{display === "list" ? <LayoutGrid size={17} /> : <ListMusic size={17} />}</button>
        </>}
      </div>
      {libraryView === "songs" && showFilters && <div id="library-filters" className="library-filters">
        
        
        <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="saved">Recently saved</option><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option></select></label>
        {activeFilters && <button className="text-xs underline underline-offset-4" onClick={() => {setFolder("");setTagQuery("");setSort("saved");}}>Reset filters</button>}
      </div>}
      <LibraryBulkBar visible={libraryView !== "recent" && (!!tracks?.length || !!savedPlaylists?.length)} active={editMode} count={selected.size} canRemove={removableIds.length > 0} busy={bulkBusy} onOrganize={() => setShowOrganize(true)} onStart={() => setEditMode(true)} onExit={exitEditMode} onAddToPlaylist={() => setShowBulkPlaylist(true)} onRemove={removeFromLibrary} />
      <PullToRefresh onRefresh={async () => {await refresh();await load();await reloadPlaylists();await loadSavedPlaylists();}}>
        {loading && tracks === null ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div> : <>
          {libraryView === "songs" && <section>
            

            
            {!visibleTracks.length ? <EmptyState icon={LibIcon} title={tracks?.length ? "No matching songs" : "Make this space yours"} description={tracks?.length ? "Try another search or reset your filters." : "Save songs from anywhere on PUBLIC to find them here."} action={tracks?.length ? <button className="playlist-action" onClick={() => {setSearch("");setFolder("");setTagQuery("");}}>Clear filters</button> : <Link className="chrome-button" to="/search">Find music</Link>} /> :
            display === "grid" ? <div className="library-music-grid">{visibleTracks.map((t) => <TrackCard key={t.id} track={t} selectable={editMode} selected={selected.has(t.id)} onToggleSelect={toggleSelect} />)}</div> :
            <div className="library-song-list">{visibleTracks.map((t, i) => <div key={t.id} className="library-song-item">{editMode && <input type="checkbox" aria-label={`Select ${t.title}`} checked={selected.has(t.id)} onChange={() => toggleSelect(t)} />}<div className="min-w-0 flex-1"><TrackRow track={t} index={i} queue={visibleTracks} queueIndex={i} /></div></div>)}</div>}
          </section>}
          {libraryView === "playlists" && <>
            <section className="mb-8"><div className="library-section-heading"><h2>Your playlists <span>{ownPlaylists.length}</span></h2></div>
              {!playlists ? <div className="py-8 grid place-items-center"><Loader2 size={18} className="animate-spin" /></div> : ownPlaylists.length ? <div className="library-playlist-grid">{ownPlaylists.map((pl) => <PlaylistCard key={pl.id} playlist={pl} />)}</div> : <EmptyState icon={ListMusic} title={search ? "No matching playlists" : "Your next mix starts here"} description={search ? "Try a different playlist name." : "Collect your favorites and make a playlist for any mood."} action={!search && <button className="chrome-button" onClick={() => setShowCreate(true)}><Plus size={15} />Create playlist</button>} />}
            </section>
            {otherPlaylists.length > 0 && <section><div className="library-section-heading"><h2>Saved playlists <span>{otherPlaylists.length}</span></h2></div><div className="library-playlist-grid">{otherPlaylists.map((pl) => <div key={pl.id} className="relative group/saved-playlist"><PlaylistCard playlist={pl} /><button onClick={(e) => {e.preventDefault();e.stopPropagation();unsavePlaylist(pl.id);}} disabled={unsavingIds.has(pl.id)} className={`absolute z-20 top-1 right-1 w-11 h-11 grid place-items-center rounded-full text-foreground transition disabled:opacity-60 ${editMode ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none group-hover/saved-playlist:opacity-100 group-hover/saved-playlist:pointer-events-auto group-focus-within/saved-playlist:opacity-100 group-focus-within/saved-playlist:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"}`} aria-label={`Remove ${pl.name} from saved playlists`} title="Remove saved playlist"><span className="w-6 h-6 rounded-full grid place-items-center bg-background/95 border border-border shadow-sm">{unsavingIds.has(pl.id) ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}</span></button></div>)}</div></section>}
          </>}
          {libraryView === "recent" && <section><div className="library-section-heading"><h2>Recently played <span>{recent.length}</span></h2></div>{recent.length ? <div className="library-song-list">{recent.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={recent} queueIndex={i} />)}</div> : <EmptyState icon={History} title={search ? "No matching recent music" : "Your listening history starts here"} description="Songs you play on this device will appear here." />}</section>}
        </>}
      </PullToRefresh>
      {showOrganize && <BulkOrganizeSheet trackIds={selectedIds} onClose={() => setShowOrganize(false)} onDone={() => {setShowOrganize(false);exitEditMode();load();}} />}
      {showCreate && <CreatePlaylistModal onClose={() => setShowCreate(false)} onCreated={() => {reloadPlaylists();chooseView("playlists");}} />}
      {showBulkPlaylist && <BulkAddToPlaylistSheet trackIds={selectedIds} playlists={playlists} onClose={() => setShowBulkPlaylist(false)} onDone={() => {setShowBulkPlaylist(false);exitEditMode();}} />}
    </div>);

}