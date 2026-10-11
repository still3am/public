import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Download,
  EyeOff,
  Flag,
  Heart,
  ListMusic,
  ListPlus,
  Loader2,
  Mic2,
  Music2,
  Pause,
  Play,
  Plus,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useLikes } from "@/context/LikesContext";
import { useFollows } from "@/context/FollowsContext";
import { usePlayer } from "@/context/PlayerContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";

/**
 * Builds THE track action list — one definition, one order, for every surface
 * that shows a track.
 *
 * Every item reflects the user's real state right now: already in the library,
 * already downloaded, already liked, already following the artist, already the
 * track that's playing. Items that make no sense for this track or this user
 * (no artist to visit, own track, signed out) are left out entirely instead of
 * being shown and then failing.
 */
export function useTrackActions(track, { onPlay, onReport } = {}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle: toggleLibrary } = useLibrary();
  const { isLiked, toggleLike } = useLikes();
  const { isFollowing, toggleFollow } = useFollows();
  const p = usePlayer();
  const cache = useOfflineCache();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const id = track?.id;
  const inLibrary = !!id && isInLibrary(id);
  const liked = !!id && isLiked(id);
  const savedOffline = !!id && cache.isCached(id);
  const savingOffline = !!id && !!cache.downloading[id];
  const isOwner = !!user && track?.uploader_id === user.id;
  const artistName = (track?.artist || "").trim();
  const artistId = track?.uploader_id || "";
  const following = !!artistId && isFollowing(artistId);
  const isCurrent = !!id && p?.currentTrack?.id === id;
  const isPlayingNow = isCurrent && !!p?.isPlaying;

  const share = async () => {
    const url = `${window.location.origin}/track/${id}`;
    const title = `${track.title} on PUBLIC.`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      toast({ title: "Link copied" });
    } catch {}
  };

  const report = async () => {
    if (onReport) return onReport(track);
    const reason = window.prompt("What's wrong with this track?");
    if (!reason) return;
    try {
      await base44.entities.Report.create({
        reporter_id: user?.id,
        track_id: id,
        reason,
      });
      alert("Thanks — a report was sent to the PUBLIC admin team.");
    } catch {
      alert("Could not submit report. Try again later.");
    }
  };

  const toggleOffline = async () => {
    if (savedOffline) {
      await cache.removeTrack(id);
      toast({ title: "Removed from downloads" });
      return;
    }
    const ok = await cache.downloadTrack(track);
    toast(
      ok
        ? { title: "Downloaded for offline" }
        : { title: "Couldn't download this track", variant: "destructive" }
    );
  };

  const items = [
    {
      id: "play",
      icon: isPlayingNow ? Pause : Play,
      label: isPlayingNow ? "Pause" : "Play",
      filled: isPlayingNow,
      onClick: () => {
        if (isPlayingNow) p.togglePlay();
        else if (onPlay) onPlay();
        else p.playTrackAt([track]);
      },
    },
    {
      id: "queue",
      icon: ListMusic,
      label: "Add to Queue",
      onClick: () => {
        p.addToQueue(track);
        toast({ title: "Added to queue" });
      },
    },
    {
      id: "library",
      icon: busy ? Loader2 : inLibrary ? Check : Plus,
      label: busy ? "Saving…" : inLibrary ? "Remove from Library" : "Add to Library",
      danger: !busy && inLibrary,
      onClick: async () => {
        setBusy(true);
        try {
          await toggleLibrary(track);
        } finally {
          setBusy(false);
        }
      },
    },
    {
      id: "playlist",
      icon: ListPlus,
      label: "Add to Playlist",
      onClick: () => setPickerOpen(true),
    },
    {
      id: "download",
      icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
      label: savingOffline ? "Downloading…" : savedOffline ? "Remove Offline" : "Download",
      onClick: toggleOffline,
    },
    !!user && {
      id: "like",
      icon: Heart,
      label: liked ? "Unlike" : "Like",
      filled: liked,
      onClick: () => toggleLike(track),
    },
    {
      id: "track",
      icon: Music2,
      label: "Go to Track",
      onClick: () => nav(`/track/${id}`),
    },
    (artistName || artistId) && {
      id: "artist",
      icon: Mic2,
      label: "Go to Artist",
      onClick: () =>
        artistName
          ? nav(`/artist?name=${encodeURIComponent(artistName)}`)
          : nav(`/profile/${artistId}`),
    },
    !!user && !!artistId && artistId !== user.id && {
      id: "follow",
      icon: following ? UserMinus : UserPlus,
      label: following ? "Unfollow Artist" : "Follow Artist",
      onClick: () => toggleFollow(artistId),
    },
    {
      id: "mix",
      icon: SlidersHorizontal,
      label: "Mix",
      onClick: () => p.openMixer(track),
    },
    {
      id: "lounge",
      icon: Smartphone,
      label: "Lounge",
      onClick: () => p.requestLounge(track),
    },
    {
      id: "share",
      icon: Share2,
      label: "Share",
      onClick: share,
    },
    !isOwner && {
      id: "report",
      icon: Flag,
      label: "Report",
      danger: true,
      onClick: report,
    },
    !!user && user.role === "admin" && track?.is_published && {
      id: "unpublish",
      icon: EyeOff,
      label: "Remove from PUBLIC",
      danger: true,
      onClick: async () => {
        if (
          !window.confirm(
            "Remove this track from PUBLIC? It stays in the uploader's library and profile."
          )
        )
          return;
        try {
          await base44.entities.Track.update(id, {
            is_published: false,
            approval_status: "rejected",
          });
          toast({ title: "Removed from PUBLIC" });
        } catch {
          toast({ title: "Couldn't remove track", variant: "destructive" });
        }
      },
    },
  ].filter(Boolean);

  return { items, pickerOpen, setPickerOpen };
}