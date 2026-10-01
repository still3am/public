import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Disc3,
  Download,
  EyeOff,
  Flag,
  Heart,
  ListMusic,
  ListPlus,
  Loader2,
  Mic2,
  Pause,
  Play,
  Plus,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useFollow } from "@/context/FollowContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useTrackLikes } from "@/hooks/useTrackLikes";
import { useToast } from "@/components/ui/use-toast";
import { ensureArtistRecord, findArtistRecord } from "@/lib/artistTracks";

/**
 * The one track options list, in the standard order:
 * Play · Add to Queue · Library · Add to Playlist · Download/Offline · Like ·
 * Go to Track · Go to Artist · Follow Artist · Mix · Lounge · [surface extras] ·
 * Share · Report.
 *
 * Every entry is derived from the user's real state, and only mounts while the
 * menu is open so its state is read fresh each time.
 */
export default function TrackOptionsPanel({
  track,
  items = [],
  onReport,
  onShare,
  onMix,
  mixerActive = false,
  onLounge,
  hideGoToTrack = false,
  onAddToPlaylist,
  onClose,
}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const p = usePlayer();
  const { isInLibrary, toggle: toggleLibrary } = useLibrary();
  const { isFollowing, toggle: toggleFollow } = useFollow();
  const { isLiked, toggle: toggleLike, canLike } = useTrackLikes();
  const cache = useOfflineCache();
  const [followId, setFollowId] = useState("");

  // The artist credit is a name, not an account — resolve it to its Artist
  // record so this menu shows the real follow state (and can create the record
  // on first follow).
  const followTarget = track?.artist ?
  { type: "artist", name: track.artist } :
  track?.uploader_id && track.uploader_name && track.uploader_id !== user?.id ?
  { type: "user", id: track.uploader_id, name: track.uploader_name } :
  null;

  useEffect(() => {
    let active = true;
    setFollowId(followTarget?.type === "user" ? followTarget.id : "");
    if (followTarget?.type === "artist") {
      findArtistRecord(followTarget.name).
      then((rec) => {
        if (active && rec) setFollowId(rec.id);
      }).
      catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [followTarget?.type, followTarget?.id, followTarget?.name]);

  const inLib = isInLibrary(track.id);
  const liked = canLike && isLiked(track.id);
  const savedOffline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isOwner = track.uploader_id === user?.id;
  const isAdmin = user?.role === "admin";
  const isCurrent = p.currentTrack?.id === track.id;
  const playingNow = isCurrent && p.isPlaying;

  // Everything closes the menu as it runs, except a download in flight so the
  // "Saving…" state stays visible.
  const item = (fn, options = {}) => ({
    ...options,
    onClick: () => {
      if (!options.keepOpen) onClose();
      fn?.();
    },
  });

  const list = [];

  list.push(
    item(() => (isCurrent ? p.togglePlay() : p.playTrackAt([track])), {
      icon: playingNow ? Pause : Play,
      label: playingNow ? "Pause" : "Play",
    })
  );

  list.push(
    item(() => {
      p.addToQueue(track);
      toast({ title: "Added to Queue" });
    }, { icon: ListMusic, label: "Add to Queue" })
  );

  list.push(
    item(() => toggleLibrary(track), {
      icon: inLib ? Check : Plus,
      label: inLib ? "Remove from Library" : "Add to Library",
      danger: inLib,
    })
  );

  list.push(
    item(() => onAddToPlaylist?.(), { icon: ListPlus, label: "Add to Playlist" })
  );

  list.push(
    item(async () => {
      if (savedOffline) {
        await cache.removeTrack(track.id);
        toast({ title: "Removed from Downloads" });
        return;
      }
      const ok = await cache.downloadTrack(track);
      toast(
        ok ?
        { title: "Saved for offline" } :
        { title: "Couldn't save offline", variant: "destructive" }
      );
    }, {
      icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
      label: savingOffline ? "Saving…" : savedOffline ? "Remove Offline" : "Download",
      danger: savedOffline && !savingOffline,
      keepOpen: savingOffline,
    })
  );

  if (canLike) {
    list.push(
      item(async () => {
        try {
          const nowLiked = await toggleLike(track);
          if (nowLiked != null) {
            toast({ title: nowLiked ? "Added to Likes" : "Removed from Likes" });
          }
        } catch {
          toast({ title: "Couldn't update like", variant: "destructive" });
        }
      }, {
        icon: Heart,
        label: liked ? "Unlike" : "Like",
        filled: liked,
        active: liked,
      })
    );
  }

  if (!hideGoToTrack) {
    list.push(
      item(() => nav(`/track/${track.id}`), { icon: Disc3, label: "Go to Track" })
    );
  }

  if (track.artist) {
    list.push(
      item(() => nav(`/artist?name=${encodeURIComponent(track.artist)}`), {
        icon: Mic2,
        label: "Go to Artist",
      })
    );
  }

  if (followTarget) {
    const followed = !!followId && isFollowing(followId, followTarget.type);
    list.push(
      item(async () => {
        try {
          let targetId = followId;
          if (!targetId && followTarget.type === "artist") {
            const rec = await ensureArtistRecord(followTarget.name);
            targetId = rec?.id || "";
            if (targetId) setFollowId(targetId);
          }
          if (!targetId) return;
          await toggleFollow({ id: targetId, type: followTarget.type, name: followTarget.name });
        } catch {
          toast({ title: "Couldn't update follow", variant: "destructive" });
        }
      }, {
        icon: followed ? UserCheck : UserPlus,
        label: `${followed ? "Unfollow" : "Follow"} ${followTarget.name}`,
        active: followed,
      })
    );
  }

  if (onMix) {
    list.push(
      item(() => onMix(), {
        icon: SlidersHorizontal,
        label: "Mix",
        active: mixerActive,
      })
    );
  }

  if (onLounge) {
    list.push(item(() => onLounge(), { icon: Smartphone, label: "Lounge" }));
  }

  items.forEach((extra) => list.push(item(() => extra.onClick?.(), extra)));

  list.push(
    item(() => {
      const url = `${window.location.origin}/track/${track.id}`;
      if (onShare) return onShare();
      if (navigator.share) {
        navigator.
        share({ title: `${track.title} on PUBLIC.`, url }).
        catch(() => {});
        return;
      }
      navigator.clipboard?.writeText(url);
      toast({ title: "Link copied" });
    }, { icon: Share2, label: "Share" })
  );

  if (!isOwner) {
    list.push(
      item(async () => {
        if (onReport) return onReport(track);
        const reason = window.prompt("What's wrong with this track?");
        if (!reason) return;
        try {
          await base44.entities.Report.create({
            reporter_id: user.id,
            track_id: track.id,
            reason,
          });
          alert("Thanks — a report was sent to the PUBLIC admin team.");
        } catch {
          alert("Could not submit report. Try again later.");
        }
      }, { icon: Flag, label: "Report", danger: true })
    );
  }

  if (isAdmin && track.is_published) {
    list.push(
      item(async () => {
        if (
          !window.confirm(
            "Remove this track from PUBLIC? It stays in the uploader's library and profile."
          )
        )
          return;
        try {
          await base44.entities.Track.update(track.id, {
            is_published: false,
            approval_status: "rejected",
          });
          toast({ title: "Removed from PUBLIC" });
        } catch {
          toast({ title: "Couldn't remove track", variant: "destructive" });
        }
      }, { icon: EyeOff, label: "Remove from PUBLIC", danger: true })
    );
  }

  return (
    <div>
      {list.map((m, i) => {
        const Icon = m.icon;
        return (
          <button
            key={i}
            role="menuitem"
            onClick={m.onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left ${
            m.danger ? "text-destructive" : m.active ? "font-semibold" : ""}`
            }>
            <Icon size={15} fill={m.filled ? "currentColor" : "none"} className="shrink-0" />
            <span className="truncate">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}