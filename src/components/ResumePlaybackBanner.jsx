import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { formatTime, displayArtist } from "@/lib/audio-utils";
import { Image } from "@/components/ui/image";
import { Laptop, Play, Smartphone, X } from "lucide-react";

// Offers a one-tap handoff when another of the user's devices was last playing
// something different from what's playing here.
export default function ResumePlaybackBanner() {
  const { currentTrack, resumeTrack } = usePlayer();
  const { remote } = usePlaybackSync();
  const [dismissed, setDismissed] = useState("");
  const key = remote ? `${remote.track_id}:${remote.device_id}` : "";

  // Auto-hide after a few seconds if the user doesn't act on it.
  useEffect(() => {
    if (!key || dismissed === key) return;
    const timer = setTimeout(() => setDismissed(key), 8000);
    return () => clearTimeout(timer);
  }, [key, dismissed]);

  if (!remote?.trackObj) return null;
  if (currentTrack && currentTrack.id === remote.track_id) return null;
  if (dismissed === key) return null;

  const t = remote.trackObj;
  const at = remote.resumeAt ?? Math.max(0, remote.position_seconds || 0);

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 player-bar-mobile-bottom z-40 w-[min(94vw,26rem)] ${
        currentTrack ? "mb-[5.75rem]" : "mb-2 md:mb-3"
      }`}>
      <div className="flex items-center gap-3 p-2.5 pr-3 rounded-2xl bg-card border border-border shadow-xl">
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-foreground/[0.06] shrink-0">
          {t.cover_art_url &&
          <Image
            src={t.cover_art_url}
            alt=""
            className="w-full h-full object-cover" />

          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground/40 hidden">
            {/^(iphone|ipad|android|phone|mobile|tablet)/i.test(
              remote.device_label || ""
            ) ?
            <Smartphone size={11} /> :

            <Laptop size={11} />
            }{" "}
            {remote.device_label || "Another device"}
          </div>
          <div className="text-sm font-bold truncate mt-0.5">{t.title}</div>
          <div className="text-xs text-foreground/50 truncate">
            {displayArtist(t)} · {remote.is_playing ? "playing" : "paused"} at{" "}
            {formatTime(at)}
          </div>
        </div>
        <button
          onClick={() => resumeTrack(t, at)}
          className="shrink-0 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center active:scale-95 transition"
          aria-label="Resume here"
          title="Resume here">
          
          <Play size={16} className="translate-x-[1px]" />
        </button>
        <button
          onClick={() => setDismissed(key)}
          className="shrink-0 w-9 h-9 md:w-7 md:h-7 rounded-full grid place-items-center text-foreground/40 hover:bg-foreground/[0.06]"
          aria-label="Dismiss">
          
          <X size={14} />
        </button>
      </div>
    </div>);

}