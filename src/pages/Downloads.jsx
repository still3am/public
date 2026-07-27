import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, Trash2, Play, Loader2, Music2, HardDriveDownload } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatTime } from "@/lib/audio-utils";
import BackHeader from "@/components/BackHeader";
import EmptyState from "@/components/EmptyState";

function formatSize(bytes) {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export default function Downloads() {
  const nav = useNavigate();
  const p = usePlayer();
  const { records, loading, removeTrack, clearAllCache, isCached } = useOfflineCache();
  const [online, setOnline] = useState(navigator.onLine);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function playFrom(index) {
    const tracks = records.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      uploader_id: r.uploader_id,
      uploader_name: r.uploader_name,
      cover_art_url: r.cover_art_url,
      audio_url: r.audio_url,
      duration_seconds: r.duration_seconds,
      genre: r.genre,
      explicit: r.explicit,
      is_published: true,
    }));
    p.playTrackAt(tracks, index);
  }

  if (loading && records.length === 0) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const totalSize = records.reduce((sum, r) => sum + (r._size || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 pb-24">
      <BackHeader
        title="Downloads"
        right={
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              online
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Online" : "Offline"}
          </span>
        }
      />

      {records.length === 0 ? (
        <EmptyState
          icon={HardDriveDownload}
          title="No downloads yet"
          description="Save tracks for offline listening. Use the “Save offline” action on any track to keep it here, ready to play without a connection."
          action={
            <button
              onClick={() => nav("/")}
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
            >
              Browse tracks
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="text-sm font-semibold text-foreground/60">
              {records.length} track{records.length !== 1 ? "s" : ""} · {formatSize(totalSize)}
            </div>
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs font-medium text-foreground/50 hover:text-destructive px-2 py-1.5 rounded-full hover:bg-foreground/5 transition"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-1">
            {records.map((r, i) => {
              const current = p.currentTrack?.id === r.id;
              return (
                <div
                  key={r.id}
                  className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.03] transition"
                >
                  <div className="w-6 text-center shrink-0">
                    <button
                      onClick={() => playFrom(i)}
                      className={current ? "text-foreground" : "text-foreground/40 hover:text-foreground"}
                      aria-label="Play"
                    >
                      {current && p.isPlaying ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} className="inline-block" />
                      )}
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                    {r.cover_art_url ? (
                      <img
                        src={r.cover_art_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 size={16} className="text-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-foreground/50 truncate">
                      {r.artist || "Unknown"} · {formatTime(r.duration_seconds)} · {formatSize(r._size)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTrack(r.id)}
                    className="p-2 rounded-full text-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove download"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {confirmingClear && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
              <div className="bg-card rounded-2xl w-full max-w-md p-5 shadow-2xl">
                <h3 className="text-lg font-extrabold mb-1">Remove all downloads?</h3>
                <p className="text-sm text-foreground/60 mb-4">
                  All saved tracks will be removed from this device. You can always
                  download them again later.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await clearAllCache();
                      setConfirmingClear(false);
                    }}
                    className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold"
                  >
                    Remove all
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}