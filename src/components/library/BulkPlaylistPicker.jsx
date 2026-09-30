import { useState } from "react";
import { X, ListMusic, Plus } from "lucide-react";
import CreatePlaylistModal from "@/components/playlist/CreatePlaylistModal";

export default function BulkPlaylistPicker({ playlists = [], count, onPick, onClose }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto">
          <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight">Add to playlist</h2>
              <p className="text-xs text-foreground/50 mt-0.5">{count} selected</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-foreground/10 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.07] transition mb-3"
          >
            <div className="w-10 h-10 rounded-xl bg-foreground/[0.08] grid place-items-center">
              <Plus size={18} />
            </div>
            <span className="text-sm font-bold">Create new playlist</span>
          </button>

          {!playlists.length ? (
            <div className="text-center py-10 text-sm text-foreground/50">
              No playlists yet.
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => onPick(pl.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.05] transition text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-foreground/[0.08] grid place-items-center shrink-0">
                    <ListMusic size={16} className="text-foreground/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{pl.name}</div>
                    <div className="text-xs text-foreground/50">
                      {pl.track_ids?.length || 0} songs
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={(pl) => {
            setShowCreate(false);
            onPick(pl.id);
          }}
        />
      )}
    </>
  );
}