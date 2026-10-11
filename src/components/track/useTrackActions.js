import {
  Play, Pause, ListPlus, Check, Plus, ListMusic, Download, Trash2, Loader2, Heart,
  Music2, User, UserPlus, UserCheck, Radio, Smartphone, Share2, Flag, EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import { buildAutoQueue } from "@/lib/autoQueue";

/**
 * The one standard action list for a track, in fixed order. Every entry
 * reflects the user's current state (library, offline, liked, following).
 * `ui` carries the modal openers owned by the menu component.
 */
export function useTrackActions(track, menuState, ui) {
  const { user } = useAuth();
  const p = usePlayer();
  const nav = useNavigate();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();

  const requireAuth = () => {
    if (user) return true;
    toast({ title: "Sign in to do that" });
    base44.auth.redirectToLogin(window.location.href);
    return false;
  };

  const isCurrent = p.currentTrack?.id === track.id;
  const playingNow = isCurrent && p.isPlaying;
  const inLib = isInLibrary(track.id);
  const offline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isOwner = track.uploader_id === user?.id;
  const { liked, following, canFollow } = menuState;
  const artistName = track.artist || track.uploader_name || "artist";

  const toggleLike = async () => {
    if (!requireAuth()) return;
    menuState.setLiked(!liked);
    try {
      await base44.functions.invoke("toggleLike", { track_id: track.id, liked: !liked });
      toast({ title: liked ? "Removed from liked" : "Liked" });
    } catch {
      menuState.setLiked(liked);
      toast({ title: "Couldn't update like", variant: "destructive" });
    }
  };

  const toggleFollow = async () => {
    if (!requireAuth()) return;
    menuState.setFollowing(!following);
    try {
      if (following) {
        await base44.entities.Follow.deleteMany({ follower_id: user.id, following_id: track.uploader_id });
      } else {
        await base44.entities.Follow.create({ follower_id: user.id, following_id: track.uploader_id });
        base44.entities.Notification.create({
          user_id: track.uploader_id, type: "new_follower", actor_id: user.id,
        }).catch(() => {});
      }
      toast({ title: following ? `Unfollowed ${artistName}` : `Following ${artistName}` });
    } catch {
      menuState.setFollowing(following);
      toast({ title: "Couldn't update follow", variant: "destructive" });
    }
  };

  const toggleOffline = async () => {
    if (offline) {
      await cache.removeTrack(track.id);
      toast({ title: "Removed from downloads" });
      return;
    }
    const ok = await cache.downloadTrack(track);
    toast(ok ? { title: "Saved for offline" } : { title: "Couldn't save offline", variant: "destructive" });
  };

  const startMix = async () => {
    toast({ title: "Building your mix…" });
    const more = await buildAutoQueue(track, [], 20);
    p.playTrackAt([track, ...more]);
  };

  const share = async () => {
    const url = `${window.location.origin}/track/${track.id}`;
    if (navigator.share) {
      navigator.share({ title: `${track.title} on PUBLIC.`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    }
  };

  const takedown = async () => {
    if (!window.confirm("Remove this track from PUBLIC? It stays in the uploader's library and profile.")) return;
    try {
      await base44.entities.Track.update(track.id, { is_published: false, approval_status: "rejected" });
      toast({ title: "Removed from PUBLIC" });
    } catch {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    }
  };

  const artistPath = track.artist
    ? `/artist?name=${encodeURIComponent(track.artist)}`
    : `/profile/${track.uploader_id}`;

  const standard = [
    {
      icon: playingNow ? Pause : Play,
      label: playingNow ? "Pause" : "Play",
      onClick: () => (isCurrent ? p.togglePlay() : p.playTrackAt([track])),
    },
    {
      icon: ListPlus,
      label: "Add to queue",
      onClick: () => {
        if (!p.currentTrack) p.playTrackAt([track]);
        else p.addToQueue(track);
        toast({ title: "Added to queue" });
      },
    },
    {
      icon: inLib ? Check : Plus,
      label: inLib ? "Remove from library" : "Add to library",
      active: inLib,
      onClick: async () => {
        if (!requireAuth()) return;
        await toggle(track);
        toast({ title: inLib ? "Removed from library" : "Added to library" });
      },
    },
    { icon: ListMusic, label: "Add to playlist", onClick: () => requireAuth() && ui.openPicker() },
    {
      icon: savingOffline ? Loader2 : offline ? Trash2 : Download,
      label: savingOffline ? "Downloading…" : offline ? "Remove offline" : "Download",
      spin: savingOffline,
      disabled: savingOffline,
      onClick: toggleOffline,
    },
    {
      icon: Heart,
      label: liked ? "Unlike" : "Like",
      active: liked,
      fill: liked,
      onClick: toggleLike,
    },
    { icon: Music2, label: "Go to track", onClick: () => nav(`/track/${track.id}`) },
    { icon: User, label: "Go to artist", onClick: () => nav(artistPath) },
    canFollow && {
      icon: following ? UserCheck : UserPlus,
      label: following ? `Unfollow ${artistName}` : `Follow ${artistName}`,
      active: following,
      onClick: toggleFollow,
    },
    { icon: Radio, label: "Mix", onClick: startMix },
    { icon: Smartphone, label: "Lounge", onClick: () => requireAuth() && ui.openLounge() },
    { icon: Share2, label: "Share", onClick: share },
    !isOwner && {
      icon: Flag,
      label: "Report",
      danger: true,
      onClick: () => (ui.onReport ? ui.onReport(track) : requireAuth() && ui.openReport()),
    },
  ].filter(Boolean);

  // Visual dividers: playback | your stuff | navigate/follow | extras | report
  const GROUPS = [
    [Play, Pause, ListPlus],
    [Check, Plus, ListMusic, Download, Trash2, Loader2, Heart],
    [Music2, User, UserPlus, UserCheck],
    [Radio, Smartphone, Share2],
    [Flag],
  ];
  standard.forEach((item) => {
    item.group = GROUPS.findIndex((g) => g.includes(item.icon));
  });

  const manage = [];
  if (user?.role === "admin" && track.is_published) {
    manage.push({ icon: EyeOff, label: "Remove from PUBLIC", danger: true, onClick: takedown });
  }

  return { standard, manage };
}