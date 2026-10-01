import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  MoreHorizontal,
  Plus,
  Check,
  Loader2,
  Trash2,
  Download,
  ListMusic,
  ChevronRight,
  Share2,
  Flag,
  EyeOff,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

// One menu for every track in the app. Item order, wording, icons and behavior
// live here only — screens pass capabilities (play, go-to-track, extra owner
// actions) rather than inventing their own list.
const MENU_W = 200;
const MENU_H = 320;

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-foreground/[0.04] active:bg-foreground/[0.08] ${
        danger ? "text-danger" : ""
      }`}
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function TrackOptionsMenu({
  track,
  onPlay,
  showGoToTrack = false,
  extraItems = [],
  className = "",
  iconSize = 16,
}) {
  const p = usePlayer();
  const nav = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [libBusy, setLibBusy] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const btnRef = useRef(null);

  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const savedOffline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isOwner = track.uploader_id === user?.id;
  const isAdmin = user?.role === "admin";

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const gap = 6;
      const top =
        r.bottom + gap + MENU_H > window.innerHeight
          ? Math.max(8, r.top - gap - MENU_H)
          : r.bottom + gap;
      let left = r.right - MENU_W;
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
      setPos({ top, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Every action closes the menu first, so the menu never lingers over the
  // next step (a picker, a prompt, a page change).
  const act = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  const toggleLibrary = async () => {
    if (libBusy) return;
    setLibBusy(true);
    try {
      await toggle(track);
    } finally {
      setLibBusy(false);
    }
  };

  const toggleOffline = async () => {
    if (savedOffline) {
      await cache.removeTrack(track.id);
      toast({ title: "Removed from downloads" });
    } else {
      const ok = await cache.downloadTrack(track);
      toast(
        ok
          ? { title: "Saved for offline" }
          : { title: "Couldn't save offline", variant: "destructive" }
      );
    }
  };

  const download = () => {
    if (track.audio_url && /^https?:\/\//i.test(track.audio_url)) {
      window.open(track.audio_url, "_blank");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/track/${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} on PUBLIC.`, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    }
  };

  const report = async () => {
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
  };

  const removeFromPublic = async () => {
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
  };

  const items = [];
  if (onPlay) {
    items.push({
      icon: isPlayingHere ? Pause : Play,
      label: isPlayingHere ? "Pause" : "Play",
      onClick: act(() => (isCurrent ? p.togglePlay() : onPlay())),
    });
  }
  items.push({
    icon: libBusy ? Loader2 : inLib ? Check : Plus,
    label: libBusy ? "Saving…" : inLib ? "Remove from library" : "Add to library",
    danger: !libBusy && inLib,
    onClick: act(toggleLibrary),
  });
  items.push({
    icon: ListMusic,
    label: "Add to playlist",
    onClick: act(() => setShowPlaylistPicker(true)),
  });
  items.push({
    icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
    label: savingOffline ? "Saving…" : savedOffline ? "Remove offline" : "Save offline",
    onClick: act(toggleOffline),
  });
  if (track.is_downloadable) {
    items.push({ icon: Download, label: "Download", onClick: act(download) });
  }
  if (showGoToTrack) {
    items.push({
      icon: ChevronRight,
      label: "Go to track",
      onClick: act(() => nav(`/track/${track.id}`)),
    });
  }
  items.push({ icon: Share2, label: "Share", onClick: act(share) });
  extraItems.forEach((item) => items.push({ ...item, onClick: act(item.onClick) }));
  if (!isOwner) {
    items.push({ icon: Flag, label: "Report", danger: true, onClick: act(report) });
  }
  if (isAdmin && track.is_published) {
    items.push({
      icon: EyeOff,
      label: "Remove from PUBLIC",
      danger: true,
      onClick: act(removeFromPublic),
    });
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="p-2 rounded-full hover:bg-foreground/5 active:bg-foreground/10 transition"
        aria-label="Track options"
      >
        <MoreHorizontal size={iconSize} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[70] w-[200px] max-w-[calc(100vw-1rem)] bg-popover border border-border rounded-xl shadow-xl py-1"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((item, i) => (
                <MenuItem key={i} {...item} />
              ))}
            </div>
          </>,
          document.body
        )}
      {showPlaylistPicker && (
        <PlaylistPickerModal track={track} onClose={() => setShowPlaylistPicker(false)} />
      )}
    </div>
  );
}