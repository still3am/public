import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { Loader2, Upload as UploadIcon } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import LibraryBulkBar from "@/components/library/LibraryBulkBar";
import BulkAddToPlaylistSheet from "@/components/library/BulkAddToPlaylistSheet";
import { useMyPlaylists } from "@/hooks/useMyPlaylists";
import { useToast } from "@/components/ui/use-toast";

// YOUR UPLOADS — every song this account has posted, on its own page so the
// Library stays for saved music. Bulk select covers playlists, un-saving and
// deleting, the same actions the Library bar offers.
export default function MyUploads() {
  const { user } = useAuth();
  const { ids, refresh } = useLibrary();
  const { playlists } = useMyPlaylists();
  const { toast } = useToast();

  const [uploads, setUploads] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [showBulkPlaylist, setShowBulkPlaylist] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setUploads([]);
      return;
    }
    try {
      const rows = await base44.entities.Track.filter(
        { uploader_id: user.id },
        "-created_date",
        1000
      );
      setUploads(rows || []);
    } catch {
      setUploads([]);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

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
    setBusy(true);
    try {
      await base44.entities.LibraryItem.deleteMany({
        user_id: user.id,
        track_id: { $in: removableIds },
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
    if (!selectedIds.length) return;
    setBusy(true);
    try {
      await base44.entities.Track.deleteMany({ id: { $in: selectedIds } });
      // Clear the saved-library rows that pointed at these uploads, so nothing
      // is left favourited but unplayable.
      await base44.entities.LibraryItem.deleteMany({
        user_id: user.id,
        track_id: { $in: selectedIds },
      }).catch(() => {});
      await refresh();
      await load();
      toast({
        title: `Deleted ${selectedIds.length} ${
          selectedIds.length === 1 ? "upload" : "uploads"
        }`,
      });
      exitEditMode();
    } catch {
      toast({ title: "Couldn't delete those uploads", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
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
        onDelete={deleteUploads}
      />

      <PullToRefresh onRefresh={load}>
        {uploads === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : uploads.length === 0 ? (
          <EmptyState
            icon={UploadIcon}
            title="Nothing uploaded yet"
            description="Head to the upload page to post your first song."
          />
        ) : (
          <section>
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-3">
              {uploads.length} {uploads.length === 1 ? "Song" : "Songs"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {uploads.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  selectable={editMode}
                  selected={selected.has(t.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </section>
        )}
      </PullToRefresh>

      {showBulkPlaylist && (
        <BulkAddToPlaylistSheet
          trackIds={selectedIds}
          playlists={playlists}
          onClose={() => setShowBulkPlaylist(false)}
          onDone={() => {
            setShowBulkPlaylist(false);
            exitEditMode();
          }}
        />
      )}
    </div>
  );
}