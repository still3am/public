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
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import useTrackActionState from "@/hooks/useTrackActionState";

/**
 * The standardized track action set for one track, in fixed order, as groups:
 * playback · collection · navigation · experience · report — then whatever the
 * surface adds through `items`, then admin tools.
 *
 * Mounted only while a menu is open, so the listener's like / follow / offline
 * state is read fresh each time instead of once per track on screen.
 */
export default function useTrackMenuItems({ track, items = [], onReport, onAddToPlaylist, onLounge }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();
  const player = usePlayer();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const { liked, following, busy: stateBusy, toggleLike, toggleFollow } = useTrackActionState(
    track,
    true,
    user?.id
  );

  const trackId = track.id;
  const artistName = (track.artist || "").trim();
  const uploaderId = track.uploader_id || "";
  const isCurrent = player.currentTrack?.id === trackId;
  const inLib = isInLibrary(trackId);
  const savedOffline = cache.isCached(trackId);
  const savingOffline = !!cache.downloading[trackId];
  const isOwner = !!user?.id && uploaderId === user.id;
  const isAdmin = user?.role === "admin";
  const onTrackPage =
    typeof window !== "undefined" && window.location.pathname === `/track/${trackId}`;

  const report = () => {
    if (onReport) return onReport(track);
    const reason = window.prompt("What's wrong with this track?");
    if (!reason) return;
    base44.entities.Report.create({ reporter_id: user.id, track_id: trackId, reason })
      .then(() => toast({ title: "Report sent to the PUBLIC admin team" }))
      .catch(() => toast({ title: "Couldn't submit report", variant: "destructive" }));
  };

  const share = async () => {
    const url = `${window.location.origin}/track/${trackId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} on PUBLIC.`, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const groups = [
    [
      {
        icon: isCurrent && player.isPlaying ? Pause : Play,
        label: isCurrent && player.isPlaying ? "Pause" : "Play",
        onClick: () => (isCurrent ? player.togglePlay() : player.playTrackAt([track])),
      },
      {
        icon: ListPlus,
        label: "Add to queue",
        onClick: () => {
          player.addToQueue(track);
          toast({ title: "Added to queue" });
        },
      },
    ],
    [
      {
        icon: busy === "library" ? Loader2 : inLib ? Check : Plus,
        label: inLib ? "Remove from library" : "Add to library",
        danger: inLib,
        onClick: async () => {
          setBusy("library");
          try {
            await toggle(track);
          } finally {
            setBusy("");
          }
        },
      },
      { icon: ListMusic, label: "Add to playlist", onClick: onAddToPlaylist },
      {
        icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
        label: savingOffline ? "Saving…" : savedOffline ? "Remove offline" : "Download",
        onClick: async () => {
          if (savedOffline) {
            await cache.removeTrack(trackId);
            toast({ title: "Removed from downloads" });
            return;
          }
          const ok = await cache.downloadTrack(track);
          toast(
            ok
              ? { title: "Saved for offline" }
              : { title: "Couldn't save offline", variant: "destructive" }
          );
        },
      },
      user && {
        icon: stateBusy === "like" ? Loader2 : Heart,
        label: liked ? "Unlike" : "Like",
        active: liked,
        onClick: async () => {
          try {
            await toggleLike();
            toast({ title: liked ? "Removed from your likes" : "Added to your likes" });
          } catch {
            toast({ title: "Couldn't update your like", variant: "destructive" });
          }
        },
      },
    ],
    [
      !onTrackPage && {
        icon: Music2,
        label: "Go to track",
        onClick: () => navigate(`/track/${trackId}`),
      },
      artistName && {
        icon: Mic2,
        label: "Go to artist",
        onClick: () => navigate(`/artist?name=${encodeURIComponent(artistName)}`),
      },
      !artistName &&
        uploaderId && {
          icon: Mic2,
          label: "Go to artist",
          onClick: () => navigate(`/profile/${uploaderId}`),
        },
      user &&
        uploaderId &&
        !isOwner && {
          icon: following ? UserMinus : UserPlus,
          label: following ? "Unfollow artist" : "Follow artist",
          active: following,
          onClick: async () => {
            try {
              await toggleFollow();
              toast({
                title: following ? "Unfollowed artist" : "Following artist",
              });
            } catch {
              toast({ title: "Couldn't update follow", variant: "destructive" });
            }
          },
        },
    ],
    [
      {
        icon: SlidersHorizontal,
        label: "Mix",
        onClick: () => {
          if (!isCurrent) player.playTrackAt([track]);
          player.openMixer();
        },
      },
      user && { icon: Smartphone, label: "Lounge", onClick: onLounge },
      { icon: Share2, label: "Share", onClick: share },
    ],
    user && !isOwner && { icon: Flag, label: "Report", danger: true, onClick: report },
    items,
    isAdmin &&
      track.is_published && {
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
            await base44.entities.Track.update(trackId, {
              is_published: false,
              approval_status: "rejected",
            });
            toast({ title: "Removed from PUBLIC" });
          } catch {
            toast({ title: "Couldn't remove track", variant: "destructive" });
          }
        },
      },
  ];

  return groups
    .map((group) => (Array.isArray(group) ? group : [group]).filter(Boolean))
    .filter((group) => group.length);
}