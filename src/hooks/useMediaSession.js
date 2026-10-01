import { useEffect } from "react";

// Lock-screen / Control Center integration. Without this the OS shows the app
// name and icon instead of the track, and the hardware play/pause buttons do
// nothing. Extracted from PlayerContext to keep that file readable.
export function useMediaSession({ track, isPlaying, onPlay, onPause, onPrev, onNext, onSeek }) {
  // Metadata: title, artist and artwork for the now-playing widget.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    // Multiple sizes widen compatibility: iOS lock screen wants 512+,
    // Android notifications often prefer a smaller bitmap.
    const artwork = track.cover_art_url
      ? [
          { src: track.cover_art_url, sizes: "96x96", type: "image/jpeg" },
          { src: track.cover_art_url, sizes: "128x128", type: "image/jpeg" },
          { src: track.cover_art_url, sizes: "192x192", type: "image/jpeg" },
          { src: track.cover_art_url, sizes: "256x256", type: "image/jpeg" },
          { src: track.cover_art_url, sizes: "384x384", type: "image/jpeg" },
          { src: track.cover_art_url, sizes: "512x512", type: "image/jpeg" },
        ]
      : [];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "PUBLIC.",
        artist: track.artist || track.uploader_name || "Unknown",
        album: "PUBLIC.",
        artwork,
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [track, isPlaying]);

  // Hardware / lock-screen controls.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const set = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    };
    set("play", () => onPlay());
    set("pause", () => onPause());
    set("previoustrack", () => onPrev());
    set("nexttrack", () => onNext());
    set("seekto", (d) => {
      if (d && typeof d.seekTime === "number") onSeek(d.seekTime);
    });
    return () => {
      ["play", "pause", "previoustrack", "nexttrack", "seekto"].forEach((a) =>
        set(a, null)
      );
    };
  }, [onPlay, onPause, onPrev, onNext, onSeek]);
}