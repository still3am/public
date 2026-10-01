import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  ListMusic,
  Plus,
  Check,
  Heart,
  Download,
  Trash2,
  Loader2,
  Music2,
  User,
  Share2,
  Flag,
  EyeOff,
  MoreHorizontal } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useLikes } from "@/context/LikesContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";
import { isFollowingUser, toggleFollowUser } from "@/lib/follows";
import { reportTrack } from "@/lib/reportTrack";

// The single track action menu for the whole app: every track surface renders
// this component, so the actions, their order and their state are identical
// everywhere. State comes from the shared player/library/likes/offline sources,
// which is what keeps every open menu in sync.
const PANEL_WIDTH = 236;

function MenuItem({ icon: Icon, label, onClick, danger, disabled, accent }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition disabled:opacity-50 ${
      danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-foreground/[0.06]"}`
      }>
      
      <Icon size={15} className={accent ? "text-foreground" : "shrink-0"} />
      <span className="flex-1 truncate">{label}</span>
    </button>);

}

export default function TrackOptionsMenu({
  track,
  triggerClassName = "",
  extraActions = [],
  onShare,
  showGoToArtist = true
}) {
  const p = usePlayer();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle: toggleLibrary } = useLibrary();
  const likes = useLikes();
  const cache = useOfflineCache();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState("");
  const [following, setFollowing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const triggerRef = useRef(null);

  const trackId = track?.id;
  const isCurrent = p.currentTrack?.id === trackId;
  const inLib = isInLibrary(trackId);
  const liked = likes.isLiked(trackId);
  const savedOffline = cache.isCached(trackId);
  const savingOffline = !!cache.downloading[trackId];
  const isAdmin = user?.role === "admin";
  const isOwner = !!user?.id && track?.uploader_id === user?.id;
  const followTarget = !isOwner && track?.uploader_id ? track.uploader_id : "";

  const close = () => setOpen(false);

  // Positioned against the trigger and flipped/clamped so it always fits on
  // screen — including at the bottom of a mobile viewport.
  useEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 16;
      const above = r.top - 16;
      const placeAbove = below < 260 && above > below;
      setPos({
        right: Math.max(8, window.innerWidth - r.right),
        top: placeAbove ? undefined : r.bottom + 4,
        bottom: placeAbove ? window.innerHeight - r.top + 4 : undefined,
        maxHeight: Math.max(160, placeAbove ? above : below)
      });
    }
    const onScroll = () => close();
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Read fresh when opening so the follow label is never stale.
  useEffect(() => {
    if (!open || !followTarget) return;
    let alive = true;
    isFollowingUser(user?.id, followTarget).then((v) => alive && setFollowing(v));
    return () => {
      alive = false;
    };
  }, [open, followTarget, user?.id]);

  if (!trackId) return null;

  const needsAccount = (what) => {
    if (user?.id) return false;
    toast({ title: `Sign in to ${what}` });
    close();
    return true;
  };

  async function toggleLib() {
    if (needsAccount("save to your library")) return;
    setBusy("lib");
    const adding = !inLib;
    const ok = await toggleLibrary(track);
    setBusy("");
    toast(
      ok ?
      { title: adding ? "Added to your library" : "Removed from your library" } :
      { title: "Couldn't update your library", variant: "destructive" }
    );
    close();
  }

  async function toggleLike() {
    if (needsAccount("like tracks")) return;
    setBusy("like");
    const adding = !liked;
    const ok = await likes.toggle(track);
    setBusy("");
    toast(
      ok ?
      { title: adding ? "Liked" : "Removed from liked" } :
      { title: "Couldn't update like", variant: "destructive" }
    );
    close();
  }

  async function toggleOffline() {
    setBusy("offline");
    if (savedOffline) {
      await cache.removeTrack(trackId);
      toast({ title: "Removed from downloads" });
    } else {
      const ok = await cache.downloadTrack(track);
      toast(
        ok ?
        { title: "Saved for offline" } :
        { title: "Couldn't save offline", variant: "destructive" }
      );
    }
    setBusy("");
    close();
  }

  async function toggleFollow() {
    if (needsAccount("follow artists")) return;
    setBusy("follow");
    try {
      const next = await toggleFollowUser(user.id, followTarget);
      if (next !== null) {
        setFollowing(next);
        toast({ title: next ? "Following" : "Unfollowed" });
      }
    } catch {
      toast({ title: "Couldn't update follow", variant: "destructive" });
    }
    setBusy("");
    close();
  }

  async function share() {
    if (onShare) {
      onShare();
      close();
      return;
    }
    const url = `${window.location.origin}/track/${trackId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} on PUBLIC.`, url });
        close();
        return;
      } catch {
        close();
        return;
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
    close();
  }

  async function adminUnpublish() {
    if (!window.confirm("Remove this track from PUBLIC? It stays in the uploader's library and profile.")) return;
    setBusy("admin");
    try {
      await base44.entities.Track.update(trackId, {
        is_published: false,
        approval_status: "rejected"
      });
      toast({ title: "Removed from PUBLIC" });
    } catch {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    }
    setBusy("");
    close();
  }

  const artistName = (track.artist || "").split(/\s*(?:,|&| feat\.| ft\.| x |;|\/)\s*/i)[0].trim();

  const options = [
  {
    key: "play",
    icon: isCurrent && p.isPlaying ? Pause : Play,
    label: isCurrent && p.isPlaying ? "Pause" : "Play",
    onClick: () => {
      if (isCurrent) p.togglePlay();else p.playTrackAt([track]);
      close();
    }
  },
  {
    key: "queue",
    icon: ListMusic,
    label: "Add to queue",
    onClick: () => {
      p.addToQueue(track);
      toast({ title: "Added to queue" });
      close();
    }
  },
  {
    key: "lib",
    icon: busy === "lib" ? Loader2 : inLib ? Trash2 : Check,
    label: busy === "lib" ? "Saving…" : inLib ? "Remove from library" : "Add to library",
    danger: inLib,
    disabled: busy === "lib",
    onClick: toggleLib
  },
  {
    key: "playlist",
    icon: Plus,
    label: "Add to playlist",
    onClick: () => {
      if (needsAccount("use playlists")) return;
      setShowPicker(true);
      close();
    }
  },
  {
    key: "like",
    icon: busy === "like" ? Loader2 : Heart,
    label: busy === "like" ? "Saving…" : liked ? "Unlike" : "Like",
    accent: liked,
    disabled: busy === "like",
    onClick: toggleLike
  },
  {
    key: "offline",
    icon: busy === "offline" ? Loader2 : savedOffline ? Trash2 : Download,
    label: busy === "offline" ? "Saving…" : savedOffline ? "Remove offline" : "Download",
    danger: savedOffline,
    disabled: busy === "offline",
    onClick: toggleOffline
  },
  track.is_downloadable && {
    key: "file",
    icon: Download,
    label: "Download file",
    onClick: () => {
      if (track.audio_url && /^https?:\/\//i.test(track.audio_url)) window.open(track.audio_url, "_blank");
      close();
    }
  },
  {
    key: "track",
    icon: Music2,
    label: "Go to track",
    onClick: () => {
      nav(`/track/${trackId}`);
      close();
    }
  },
  showGoToArtist && (artistName || track.uploader_id) && {
    key: "artist",
    icon: User,
    label: "Go to artist",
    onClick: () => {
      nav(artistName ? `/artist?name=${encodeURIComponent(artistName)}` : `/profile/${track.uploader_id}`);
      close();
    }
  },
  followTarget && {
    key: "follow",
    icon: busy === "follow" ? Loader2 : User,
    label: busy === "follow" ? "Saving…" : following ? "Unfollow artist" : "Follow artist",
    accent: following,
    disabled: busy === "follow",
    onClick: toggleFollow
  },
  {
    key: "share",
    icon: Share2,
    label: "Share",
    onClick: share
  },
  !isOwner && user?.id && {
    key: "report",
    icon: Flag,
    label: "Report",
    danger: true,
    onClick: () => {
      reportTrack({ trackId, reporterId: user.id });
      close();
    }
  },
  ...extraActions,
  isAdmin && track.is_published && {
    key: "admin",
    icon: busy === "admin" ? Loader2 : EyeOff,
    label: busy === "admin" ? "Removing…" : "Remove from PUBLIC",
    danger: true,
    disabled: busy === "admin",
    onClick: adminUnpublish
  }].
  filter(Boolean);

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={open ? "Close track options" : "Track options"}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName ||
        "w-9 h-9 rounded-full grid place-items-center text-foreground/60 hover:text-foreground hover:bg-foreground/[0.07] active:scale-90 transition"}>

        <MoreHorizontal size={18} />
      </button>

      {open && pos &&
      <>
          <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }} />
        
          <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: PANEL_WIDTH,
            right: pos.right,
            top: pos.top,
            bottom: pos.bottom,
            maxHeight: pos.maxHeight
          }}
          className="fixed z-50 py-1 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-[fadeIn_.15s_ease-out]">
          
            {options.map((o) =>
          <MenuItem
            key={o.key}
            icon={o.icon}
            label={o.label}
            onClick={o.onClick}
            danger={o.danger}
            disabled={o.disabled}
            accent={o.accent} />

          )}
          </div>
        </>
      }

      {showPicker &&
      <PlaylistPickerModal track={track} onClose={() => setShowPicker(false)} />
      }
    </div>);

}