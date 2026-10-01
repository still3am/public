import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ListMusic, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Appends every selected track to the chosen playlist in one go.
export default function BulkAddToPlaylistSheet({ trackIds = [], playlists, onClose, onDone }) {
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  const add = async (playlist) => {
    if (busyId) return;
    setBusyId(playlist.id);
    try {
      const current = playlist.track_ids || [];
      const added = trackIds.filter((id) => !current.includes(id));
      if (added.length) {
        await base44.entities.Playlist.update(playlist.id, {
          track_ids: [...current, ...added],
        });
      }
      toast({
        title: added.length
          ? `Added ${added.length} ${added.length === 1 ? "song" : "songs"} to ${playlist.name}`
          : "Already in that playlist",
      });
      onDone?.();
    } catch {
      toast({ title: "Couldn't add to playlist", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background w-full md:max-w-md rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold flex items-center gap-2">
              <ListPlusHeader /> Add to playlist
            </h3>
            <p className="text-xs text-foreground/50 mt-0.5">
              {trackIds.length} {trackIds.length === 1 ? "song" : "songs"} selected
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!playlists ? (
            <div className="grid place-items-center py-12 text-foreground/50">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : !playlists.length ? (
            <p className="text-center text-sm text-foreground/55 py-12 px-6">
              You don't have any playlists yet — create one first from your library.
            </p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => add(pl)}
                disabled={!!busyId}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-accent transition disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground/10 grid place-items-center shrink-0">
                  {pl.cover_art_url ? (
                    <img src={pl.cover_art_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic size={16} className="text-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{pl.name}</div>
                  <div className="text-xs text-foreground/50">
                    {pl.track_ids?.length || 0} {pl.track_ids?.length === 1 ? "song" : "songs"}
                  </div>
                </div>
                {busyId === pl.id && <Loader2 size={16} className="animate-spin text-foreground/50" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ListPlusHeader() {
  return <ListMusic size={16} />;
}