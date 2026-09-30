import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import { useLikedTracks, toggleTrackLike } from "@/lib/likes";
import { openFullPlayer } from "@/lib/playerUi";
import { primaryArtistName } from "@/lib/artistCatalog";

// The behaviour behind the shared Track Options menu: every page that shows a
// track gets the same actions, driven by the same live state (library, offline,
// likes, queue, player), from one place.
export function useTrackActions(track) {
  const p = usePlayer();
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();
  const { isLiked } = useLikedTracks(user?.id);
  const [busy, setBusy] = useState("");

  const isCurrent = p.currentTrack?.id === track?.id;
  const artistName = primaryArtistName(track);
  const inLibrary = !!track?.id && isInLibrary(track.id);
  const liked = !!track?.id && isLiked(track.id);
  const savedOffline = !!track?.id && cache.isCached(track.id);
  const savingOffline = !!track?.id && !!cache.downloading[track.id];

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  };

  return {
    busy,
    isCurrent,
    isPlaying: isCurrent && p.isPlaying,
    inLibrary,
    liked,
    savedOffline,
    savingOffline,
    artistName,
    canPlay: !!track?.audio_url,

    play: () => (isCurrent ? p.togglePlay() : p.playTrackAt([track])),

    toggleLibrary: () =>
      run("library", async () => {
        const added = await toggle(track);
        toast({ title: added ? "Added to your library" : "Removed from your library" });
      }),

    toggleLike: () =>
      run("like", async () => {
        const res = await toggleTrackLike(track, user?.id);
        if (res === false) {
          toast({ title: "Couldn't update your like", variant: "destructive" });
          return;
        }
        toast({ title: liked ? "Removed from liked songs" : "Added to liked songs" });
      }),

    toggleOffline: () =>
      run("offline", async () => {
        if (savedOffline) {
          await cache.removeTrack(track.id);
          toast({ title: "Removed from downloads" });
          return;
        }
        const ok = await cache.downloadTrack(track);
        toast(
          ok
            ? { title: "Saved for offline" }
            : { title: "Couldn't save offline", variant: "destructive" }
        );
      }),

    download: () => {
      if (track?.audio_url && /^https?:\/\//i.test(track.audio_url)) {
        window.open(track.audio_url, "_blank");
      }
    },

    addToQueue: () => {
      p.addToQueue(track);
      toast({ title: "Added to queue" });
    },

    goToTrack: () => nav(`/track/${track.id}`),
    goToArtist: () => {
      if (!artistName) return;
      nav(`/artist?name=${encodeURIComponent(artistName)}`);
    },

    mix: () => {
      if (!isCurrent) p.playTrackAt([track]);
      openFullPlayer({ mixer: true });
    },

    lounge: () => {
      if (!isCurrent) p.playTrackAt([track]);
      openFullPlayer({ lounge: true });
    },

    share: async () => {
      const url = `${window.location.origin}/track/${track.id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: `${track.title} on PUBLIC.`, url });
          return;
        } catch {
          return;
        }
      }
      try {
        await navigator.clipboard?.writeText(url);
        toast({ title: "Link copied" });
      } catch {
        toast({ title: "Couldn't copy the link", variant: "destructive" });
      }
    },
  };
}