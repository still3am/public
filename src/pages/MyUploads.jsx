import IncrementalList from "@/components/IncrementalList";
import LoadError from '@/components/LoadError';
import { useRef } from 'react';
import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { ChevronLeft, Loader2, Upload as UploadIcon } from "lucide-react";
import { Link } from "react-router-dom";
import TrackCard from "@/components/TrackCard";
import PublicSubmitButton from "@/components/upload/PublicSubmitButton";
import BulkPublicSubmitBar from "@/components/upload/BulkPublicSubmitBar";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import LibraryBulkBar from "@/components/library/LibraryBulkBar";
import BulkAddToPlaylistSheet from "@/components/library/BulkAddToPlaylistSheet";
import { useMyPlaylists } from "@/hooks/useMyPlaylists";
import { useToast } from "@/components/ui/use-toast";
import { readAllPages } from "@/lib/readPages";

// YOUR UPLOADS — every song this account has posted, on its own page so the
// Library stays for saved music. Bulk select covers playlists, un-saving and
// deleting, the same actions the Library bar offers.
export default function MyUploads() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const { playlists,error:playlistError,reload:reloadPlaylists } = useMyPlaylists();
  const { toast } = useToast();

  const [uploads, setUploads] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query,setQuery]=useState(""),[status,setStatus]=useState("all"),[sort,setSort]=useState("newest");
  const visibleUploads=useMemo(()=>{
    const term=query.trim().toLowerCase();
    const rows=(uploads||[]).filter(t=>(status==="all"||(t.approval_status||(t.is_published?"approved":"private"))===status)&&(!term||[t.title,t.artist,t.genre].some(value=>(value||"").toLowerCase().includes(term))));
    if(sort==="title")rows.sort((a,b)=>(a.title||"").localeCompare(b.title||""));
    if(sort==="plays")rows.sort((a,b)=>(b.play_count||0)-(a.play_count||0));
    return rows;
  },[uploads,query,status,sort]);

  const loadVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const load = useCallback(async () => {
    const request = ++loadVersion.current;request === loadVersion.current && setLoadError(false);
    if (!user?.id) {
      request === loadVersion.current && setUploads([]);
      return;
    }
    try {
      // Follow the server cursor until every upload is in — no fixed row cap.
      const rows = await readAllPages((options) =>
      base44.entities.Track.filter(
        { uploader_id: user.id },
        { sort: "-created_date", ...options }
      )
      );
      request === loadVersion.current && setUploads(rows);
    } catch {
      request === loadVersion.current && setLoadError(true);
    }
  }, [user?.id]);

  useEffect(() => {
    setSelected(new Set());setEditMode(false);load();return()=>{loadVersion.current++;};
  }, [load]);

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
    if (!removableIds.length||busy||!user?.id) return;
    setBusy(true);
    try {
      await base44.entities.LibraryItem.deleteMany({
        user_id: user.id,
        track_id: { $in: removableIds }
      });
      await refresh();
      toast({ title: `Removed ${removableIds.length} from your library` });
      exitEditMode();
    } catch {
      toast({ title: "Couldn't remove those songs", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const deleteUploads = async () => {
    if (!selectedIds.length||busy||!window.confirm(`Permanently delete ${selectedIds.length} uploads? This removes the songs from PUBLIC.`)) return;
    setBusy(true);
    try {
      await base44.entities.Track.deleteMany({ id: { $in: selectedIds } });
      // Clear the saved-library rows that pointed at these uploads, so nothing
      // is left favourited but unplayable.
      await base44.entities.LibraryItem.deleteMany({
        user_id: user.id,
        track_id: { $in: selectedIds }
      }).catch(() => {});
      await refresh();
      await load();
      toast({
        title: `Deleted ${selectedIds.length} ${
        selectedIds.length === 1 ? "upload" : "uploads"}`

      });
      exitEditMode();
    } catch {
      toast({ title: "Couldn't delete those uploads", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Flip the card in place once a song is offered to the public, so its action
  // swaps to the sent-for-review state without reloading the page.
  const markSubmitted = (ids) => {
    const isAdmin = user?.role === "admin";
    setUploads((prev) =>
    (prev || []).map((t) =>
    ids.includes(t.id) ?
    { ...t, approval_status: isAdmin ? "approved" : "pending", is_published: isAdmin } :
    t
    )
    );
  };

  if (loadError&&uploads===null) return <LoadError onRetry={load} />;
  return (
    <div className="uploads-page max-w-5xl mx-auto pb-10">
      <header className="page-intro"><h1>Your uploads</h1><p>Manage your music and finish songs waiting to go public.</p></header>
      <Link className="playlist-action mb-4" to="/unfinished-uploads">Unfinished uploads</Link>
      <Link
        to="/library"
        className="inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-foreground/60 hover:text-foreground transition">
        
        <ChevronLeft size={18} /> Back to Library
      </Link>

      <LibraryBulkBar
        visible={!!uploads?.length}
        active={editMode}
        count={selected.size}
        canRemove={removableIds.length > 0}
        canDelete={selectedIds.length > 0}
        busy={busy}
        onStart={() => setEditMode(true)}
        onExit={exitEditMode}
        onAddToPlaylist={() => setShowBulkPlaylist(true)}
        onRemove={removeFromLibrary}
        onDelete={deleteUploads} />
      

      <div className="collection-tools"><input aria-label="Search your uploads" placeholder="Search songs, artists, or genres" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Upload status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All uploads</option><option value="approved">Published</option><option value="pending">Pending review</option><option value="private">Private</option><option value="rejected">Needs changes</option></select><select aria-label="Sort uploads" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="title">Title A–Z</option><option value="plays">Most played</option></select></div>
      <PullToRefresh onRefresh={load}>
        {uploads === null ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        uploads.length === 0 ?
        <EmptyState
          icon={UploadIcon}
          title="Nothing uploaded yet"
          description="Head to the upload page to post your first song." /> :


        <section>
            <BulkPublicSubmitBar tracks={uploads} onSubmitted={markSubmitted} />
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">
              {visibleUploads.length} {visibleUploads.length === 1 ? "Song" : "Songs"}
            </h2>
            {!visibleUploads.length&&<EmptyState title="No matching uploads" description="Try another search or status." action={<button className="playlist-action" onClick={()=>{setQuery("");setStatus("all");}}>Reset filters</button>}/>}
            <IncrementalList items={visibleUploads} resetKey={JSON.stringify([query,status,sort])} className="desktop-card-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" renderItem={(t) =>
            <div key={t.id} className="flex flex-col">
                  <TrackCard queue={visibleUploads}
                track={t}
                selectable={editMode}
                selected={selected.has(t.id)}
                onToggleSelect={toggleSelect} />
              
                  {!editMode &&
              <PublicSubmitButton track={t} onSubmitted={markSubmitted} />
              }
                </div>
            }/>
          </section>
        }
      </PullToRefresh>

      {showBulkPlaylist &&
      <BulkAddToPlaylistSheet
        trackIds={selectedIds}
        playlists={playlists} error={playlistError} onRetry={()=>reloadPlaylists()}
        onClose={() => setShowBulkPlaylist(false)}
        onDone={() => {
          setShowBulkPlaylist(false);
          exitEditMode();
        }} />

      }
    </div>);

}