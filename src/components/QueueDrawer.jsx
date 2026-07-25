import { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  ArrowLeft,
  ListMusic,
  Heart,
  Loader2,
  Check,
} from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";

export default function QueueDrawer({ p, onClose }) {
  const { user } = useAuth();
  const likes = useLikes(user);
  const [addMode, setAddMode] = useState(false);
  const [likedTracks, setLikedTracks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [justAdded, setJustAdded] = useState(new Set());

  async function openAdd() {
    setAddMode(true);
    if (!loaded && likes.ready && likes.likedIds.size > 0) {
      setLoadingLiked(true);
      try {
        const all = await base44.entities.Track.list("-created_date", 200);
        setLikedTracks(all.filter((t) => likes.likedIds.has(t.id)));
        setLoaded(true);
      } catch {
        // ignore
      } finally {
        setLoadingLiked(false);
      }
    }
  }

  function addNext(track) {
    p.playNext(track);
    setJustAdded((s) => new Set([...s, track.id]));
    setTimeout(() => {
      setJustAdded((s) => {
        const n = new Set(s);
        n.delete(track.id);
        return n;
      });
    }, 1400);
  }

  const queuedIds = new Set(p.queue.map((t) => t.id));
  const upcoming = p.currentIndex >= 0 ? p.queue.slice(p.currentIndex + 1) : p.queue;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          {addMode ? (
            <>
              <button
                onClick={() => setAddMode(false)}
                className="p-2 -ml-2 rounded-full hover:bg-foreground/5"
                aria-label="Back to queue"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="font-bold flex-1">Add liked songs</h3>
            </>
          ) : (
            <>
              <ListMusic size={18} className="text-foreground/60" />
              <h3 className="font-bold flex-1">Up Next</h3>
              <button
                onClick={openAdd}
                disabled={likes.likedIds.size === 0}
                className="p-2 rounded-full hover:bg-foreground/5 text-foreground/70 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Add liked songs to queue"
                title="Add liked songs"
              >
                <Plus size={18} />
              </button>
              {p.queue.length > 0 && (
                <button
                  onClick={() => p.clearQueue()}
                  className="p-2 rounded-full hover:bg-foreground/5 text-foreground/60 hover:text-red-500"
                  aria-label="Clear queue"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close queue"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-4">
          {addMode ? (
            <>
              <div className="px-4 py-3 text-xs text-foreground/55 border-b border-border bg-foreground/[0.02] flex items-center gap-2">
                <Heart size={12} /> Tap a song to add it next in the queue.
              </div>
              {loadingLiked && (
                <div className="py-12 grid place-items-center text-foreground/50">
                  <Loader2 className="animate-spin" />
                </div>
              )}
              {!loadingLiked && likes.likedIds.size === 0 && (
                <div className="px-6 py-14 text-center text-sm text-foreground/55">
                  You haven't liked any songs yet.
                  <br />
                  Tap the <Heart size={12} className="inline" /> icon on any track to
                  start collecting them here.
                </div>
              )}
              {!loadingLiked && likedTracks.length === 0 && likes.likedIds.size > 0 && (
                <div className="px-6 py-14 text-center text-sm text-foreground/55">
                  Couldn't load your liked songs right now.
                </div>
              )}
              <div className="p-2">
                {likedTracks.map((t) => {
                  const inQueue = queuedIds.has(t.id);
                  const added = justAdded.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => addNext(t)}
                      disabled={inQueue}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03] text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0">
                        {t.cover_art_url && (
                          <img
                            src={t.cover_art_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-foreground/50 truncate">
                          {t.artist || t.uploader_name || "Unknown"}
                        </div>
                      </div>
                      <span className="text-[11px] text-foreground/40 hidden sm:block shrink-0">
                        {formatTime(t.duration_seconds)}
                      </span>
                      <span
                        className={`p-2 rounded-full shrink-0 ${
                          added
                            ? "text-emerald-500"
                            : inQueue
                            ? "text-foreground/30"
                            : "text-foreground/60"
                        }`}
                        aria-label={added ? "Added next" : "Add next"}
                      >
                        {added ? (
                          <Check size={16} />
                        ) : inQueue ? (
                          <Check size={16} />
                        ) : (
                          <Plus size={16} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Now Playing */}
              {p.currentTrack && (
                <div className="px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2 px-2">
                    Now Playing
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-foreground/[0.06]">
                    <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0">
                      {p.currentTrack.cover_art_url && (
                        <img
                          src={p.currentTrack.cover_art_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">
                        {p.currentTrack.title}
                      </div>
                      <div className="text-xs text-foreground/55 truncate">
                        {p.currentTrack.artist ||
                          p.currentTrack.uploader_name ||
                          "Unknown"}
                      </div>
                    </div>
                    <div className="flex items-end gap-0.5 h-4 mr-1">
                      <span className="w-1 h-2 bg-foreground rounded-full animate-pulse" />
                      <span
                        className="w-1 h-3 bg-foreground rounded-full animate-pulse"
                        style={{ animationDelay: ".15s" }}
                      />
                      <span
                        className="w-1 h-2.5 bg-foreground rounded-full animate-pulse"
                        style={{ animationDelay: ".3s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Up Next */}
              <div className="px-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2 px-2">
                  {upcoming.length > 0
                    ? `${upcoming.length} up next`
                    : "Nothing up next"}
                </div>
                {upcoming.length === 0 && p.queue.length === 0 && (
                  <div className="px-4 py-14 text-center text-sm text-foreground/55">
                    Queue is empty.
                    <br />
                    Use the{" "}
                    <Plus size={12} className="inline" /> button to add your liked
                    songs.
                  </div>
                )}
                {upcoming.length === 0 && p.queue.length > 0 && (
                  <div className="px-4 py-10 text-center text-sm text-foreground/55">
                    This is the end of your queue.
                  </div>
                )}
                {upcoming.map((t, i) => {
                  const idx = p.currentIndex + 1 + i;
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03] cursor-pointer"
                      onClick={() => p.setCurrentIndex(idx)}
                    >
                      <div className="text-[11px] text-foreground/40 w-4 text-center shrink-0">
                        {i + 1}
                      </div>
                      {t.cover_art_url ? (
                        <img
                          src={t.cover_art_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-foreground/10 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-foreground/50 truncate">
                          {t.artist || t.uploader_name || "Unknown"}
                        </div>
                      </div>
                      <span className="text-xs text-foreground/40 shrink-0">
                        {formatTime(t.duration_seconds)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          p.removeFromQueue(t.id);
                        }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-foreground/50 hover:text-foreground"
                        aria-label="Remove from queue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}