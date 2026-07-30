import { useMemo, useState } from "react";
import {
  CloudOff,
  Play,
  Pause,
  Trash2,
  Loader2,
  WifiOff,
  HardDriveDownload,
  CheckCircle2 } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatTime, bytesToReadable } from "@/lib/audio-utils";
import PullToRefresh from "@/components/PullToRefresh";
import BackHeader from "@/components/BackHeader";
import { useToast } from "@/components/ui/use-toast";

// PUBLIC OFFLINE — locally-cached tracks that play without Wi-Fi or data.
// Everything here runs off IndexedDB blobs already on the device, so the page
// is fully usable on airplane mode.
export default function Downloads() {
  const p = usePlayer();
  const cache = useOfflineCache();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const tracks = useMemo(
    () =>
    cache.records.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist || r.uploader_name,
      uploader_name: r.uploader_name,
      uploader_id: r.uploader_id,
      cover_art_url: r.cover_art_url,
      audio_url: r.audio_url,
      duration_seconds: r.duration_seconds,
      genre: r.genre,
      explicit: r.explicit,
      _offline: true
    })),
    [cache.records]
  );

  const totalBytes = useMemo(
    () => cache.records.reduce((sum, r) => sum + (r._size || 0), 0),
    [cache.records]
  );

  const isCurrent = (id) => p.currentTrack?.id === id;
  const anyPlayingHere =
  isPlaying(tracks, p) && p.isPlaying;

  const playAll = () => {
    if (!tracks.length) return;
    p.playTrackAt(tracks, 0);
  };

  const playOne = (i) => {
    if (isCurrent(tracks[i].id)) {
      p.togglePlay();
      return;
    }
    p.playTrackAt(tracks, i);
  };

  const removeOne = async (id) => {
    await cache.removeTrack(id);
    toast({ title: "Removed from PUBLIC OFFLINE" });
  };

  const clearEverything = async () => {
    await cache.clearAllCache();
    setConfirming(false);
    toast({ title: "Downloads cleared" });
  };

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const loading = cache.loading;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 main-content">
      <BackHeader title="PUBLIC OFFLINE" />

      <div className="pt-3 pb-6 hidden">
        <div className="flex items-center gap-2.5 mb-1.5">
          <WifiOff size={22} className="text-foreground/60" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            PUBLIC OFFLINE
          </h1>
        </div>
        <p className="text-sm text-foreground/55 max-w-md">
          Your saved songs live right here on this device. Play them anywhere —
          no Wi‑Fi, no cellular data, no signal needed.
        </p>
      </div>

      {/* Status card */}
      <div className="mt-2 mb-6 grid grid-cols-3 gap-2.5">
        <Stat
          label="Saved tracks"
          value={String(cache.records.length)}
          icon={<HardDriveDownload size={15} />} />
        
        <Stat
          label="Storage used"
          value={bytesToReadable(totalBytes)}
          icon={<HardDriveDownload size={15} />} />
        
        <Stat
          label="Connection"
          value={online ? "Online" : "Offline"}
          tone={online ? "ok" : "warn"}
          icon={online ? <CheckCircle2 size={15} /> : <WifiOff size={15} />} />
        
      </div>

      {!online &&
      <div className="mb-5 rounded-2xl bg-foreground/[0.05] px-4 py-3 flex items-center gap-2.5 text-sm text-foreground/70">
          <CloudOff size={16} />
          You're offline — but your saved tracks still play perfectly.
        </div>
      }

      <PullToRefresh onRefresh={async () => await cache.refresh()}>
        {loading ?
        <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        tracks.length === 0 ?
        <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-4">
              <CloudOff size={28} className="text-foreground/35" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mb-1.5">
              No downloads yet
            </h2>
            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
              Tap the download icon on any song to save it here for offline
              listening.
            </p>
          </div> :

        <>
            {tracks.length > 0 &&
          <div className="flex items-center justify-between mb-3 px-1">
                <button
              onClick={playAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold active:scale-95 transition">
                  {anyPlayingHere ? <Pause size={15} /> : <Play size={15} />}
                  {anyPlayingHere ? "Pause all" : "Play all"}
                </button>
                <button
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold text-foreground/55 hover:text-destructive hover:bg-destructive/5 transition">
                  <Trash2 size={14} /> Clear all
                </button>
              </div>
          }

            <div className="space-y-1">
              {tracks.map((t, i) => {
              const here = isCurrent(t.id);
              const playingHere = here && p.isPlaying;
              return (
                <div
                  key={t.id}
                  onDoubleClick={() => playOne(i)}
                  className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.03] transition">
                    <button
                    onClick={() => playOne(i)}
                    className="w-10 h-10 rounded overflow-hidden shrink-0 relative bg-foreground/10 grid place-items-center"
                    aria-label="Play">
                      {t.cover_art_url ?
                    <img
                      src={t.cover_art_url}
                      alt=""
                      className="w-full h-full object-cover" /> :


                    <CloudOff size={16} className="text-foreground/40" />
                    }
                      <span className="absolute inset-0 grid place-items-center bg-black/0 group-hover:bg-black/30 transition">
                        {playingHere ?
                      <Pause size={15} className="text-white" /> :

                      <Play size={15} className="text-white opacity-0 group-hover:opacity-100 transition" />
                      }
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {t.title}
                        {t.explicit &&
                      <span className="px-1 py-0.5 rounded bg-foreground/15 text-[9px] font-extrabold">
                            E
                          </span>
                      }
                        <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                          <CloudOff size={9} /> Offline
                        </span>
                      </div>
                      <div className="text-xs text-foreground/50 truncate">
                        {t.artist || t.uploader_name || "Unknown"}
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-foreground/40 w-10 text-right">
                      {formatTime(t.duration_seconds)}
                    </div>
                    <button
                    onClick={() => removeOne(t.id)}
                    className="p-2 rounded-full text-foreground/45 hover:text-destructive hover:bg-destructive/5 active:scale-90 transition shrink-0"
                    aria-label="Remove download">
                      <Trash2 size={15} />
                    </button>
                  </div>);

            })}
            </div>
          </>
        }
      </PullToRefresh>

      {confirming &&
      <div className="fixed inset-0 z-50 grid place-items-center p-6 bg-black/40">
          <div className="bg-card rounded-2xl ring-1 ring-border max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-destructive/10 grid place-items-center mx-auto mb-3">
              <Trash2 size={20} className="text-destructive" />
            </div>
            <h3 className="text-lg font-extrabold tracking-tight mb-1.5">
              Remove all downloads?
            </h3>
            <p className="text-sm text-foreground/55 mb-5">
              This deletes {cache.records.length} saved track
              {cache.records.length === 1 ? "" : "s"} (
              {bytesToReadable(totalBytes)}) from this device.
            </p>
            <div className="flex items-center gap-2">
              <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-full bg-foreground/[0.06] text-sm font-bold active:scale-95 transition">
                Cancel
              </button>
              <button
              onClick={clearEverything}
              className="flex-1 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold active:scale-95 transition">
                Remove all
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}

function Stat({ label, value, icon, tone }) {
  const ringTone =
  tone === "ok" ?
  "text-emerald-600 dark:text-emerald-400" :
  tone === "warn" ?
  "text-amber-600 dark:text-amber-400" :
  "text-foreground/55";
  return (
    <div className="rounded-2xl ring-1 ring-inset ring-border bg-card p-3 hidden">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${ringTone}`}>
        {icon} {label}
      </div>
      <div className="text-lg font-extrabold tracking-tight mt-1.5 truncate">
        {value}
      </div>
    </div>);

}

function isPlaying(tracks, p) {
  return tracks.some((t) => t.id === p.currentTrack?.id);
}