// Reusable inline download button for a single track — shows live state pulled
// from the shared offline cache. Idle -> saving spinner -> saved (check) ->
// tap again to remove. Used on track rows, the track detail page, and the bar.

import { Download, Loader2, Check, Trash2, CloudOff } from "lucide-react";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";

export default function DownloadButton({ track, size = 18, className = "" }) {
  const cache = useOfflineCache();
  const { toast } = useToast();

  if (!track || !track.audio_url) return null;

  const saved = cache.isCached(track.id);
  const saving = !!cache.downloading[track.id];

  const onClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (saving) return;
    if (saved) {
      await cache.removeTrack(track.id);
      toast({ title: "Removed from PUBLIC OFFLINE" });
      return;
    }
    const ok = await cache.downloadTrack(track);
    toast(
      ok
        ? { title: "Saved to PUBLIC OFFLINE", description: "Listen without Wi‑Fi or data." }
        : { title: "Couldn't save offline", variant: "destructive" }
    );
  };

  if (saving) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative grid place-items-center text-foreground/50 ${className}`}
        aria-label="Saving offline">
        <Loader2 size={size} className="animate-spin" />
      </button>
    );
  }

  if (saved) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative grid place-items-center text-emerald-500 hover:text-emerald-600 active:scale-90 transition ${className}`}
        aria-label="Saved offline — tap to remove">
        <Check size={size} strokeWidth={2.75} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative grid place-items-center text-foreground/45 hover:text-foreground active:scale-90 transition ${className}`}
      aria-label="Save offline">
      <Download size={size} />
    </button>
  );
}