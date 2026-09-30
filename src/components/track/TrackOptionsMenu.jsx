import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Check,
  CheckCheck,
  Heart,
  ListPlus,
  ListMusic,
  Mic2,
  Disc3,
  SlidersHorizontal,
  Smile,
  Download,
  Trash2,
  Share2,
  Flag,
  Loader2,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrackActions } from "@/hooks/useTrackActions";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";
import ReportModal from "@/components/track/ReportModal";

const MENU_WIDTH = 240;

function MenuItem({ icon: Icon, label, onClick, danger, active, spinner }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-left transition-colors hover:bg-accent hover:text-accent-foreground ${
        danger ? "text-destructive" : "text-popover-foreground"
      }`}
    >
      {spinner ? (
        <Loader2 size={15} className="animate-spin opacity-80" />
      ) : (
        <Icon size={15} className={active ? "opacity-100" : "opacity-75"} />
      )}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

/**
 * The one Track Options menu used everywhere a track appears — Home, Library,
 * Search, artist pages, track pages, playlists, the queue and the player.
 * Options are state-dependent: the label follows whether the track is already
 * saved, downloaded or liked, so there is never an Add/Remove pair.
 */
export default function TrackOptionsMenu({
  track,
  variant = "icon",
  className = "",
  extraActions = [],
  hideActions = [],
  align = "right",
}) {
  const { user } = useAuth();
  const a = useTrackActions(track);
  const [pos, setPos] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const triggerRef = useRef(null);

  const items = useMemo(() => {
    if (!track) return [];
    const hide = (key) => hideActions.includes(key);
    const list = [];

    if (!hide("play")) {
      list.push({
        key: "play",
        icon: a.isPlaying ? Pause : Play,
        label: a.isPlaying ? "Pause" : "Play",
        onClick: a.play,
      });
    }
    if (!hide("library")) {
      list.push({
        key: "library",
        icon: a.busy === "library" ? Loader2 : a.inLibrary ? CheckCheck : Plus,
        spinner: a.busy === "library",
        label: a.inLibrary ? "Remove from Library" : "Add to Library",
        onClick: a.toggleLibrary,
      });
    }
    if (user && !hide("like")) {
      list.push({
        key: "like",
        icon: Heart,
        label: a.liked ? "Unlike" : "Like",
        active: a.liked,
        onClick: a.toggleLike,
        spinner: a.busy === "like",
      });
    }
    if (!hide("queue")) {
      list.push({
        key: "queue",
        icon: ListPlus,
        label: "Add to Queue",
        onClick: a.addToQueue,
      });
    }
    if (!hide("playlist")) {
      list.push({
        key: "playlist",
        icon: ListMusic,
        label: "Add to Playlist",
        onClick: () => setShowPlaylists(true),
      });
    }
    if (!hide("track")) {
      list.push({ key: "track", icon: Disc3, label: "Go to Track", onClick: a.goToTrack });
    }
    if (!hide("artist") && a.artistName) {
      list.push({ key: "artist", icon: Mic2, label: "Go to Artist", onClick: a.goToArtist });
    }
    if (!hide("mix")) {
      list.push({ key: "mix", icon: SlidersHorizontal, label: "Mix", onClick: a.mix });
    }
    if (!hide("lounge")) {
      list.push({ key: "lounge", icon: Smile, label: "Lounge", onClick: a.lounge });
    }
    if (!hide("offline")) {
      list.push({
        key: "offline",
        icon: a.busy === "offline" || a.savingOffline ? Loader2 : a.savedOffline ? Trash2 : Download,
        spinner: a.busy === "offline" || a.savingOffline,
        label: a.savedOffline ? "Remove Offline" : "Download",
        onClick: a.toggleOffline,
        active: a.savedOffline,
      });
    }
    if (!hide("share")) {
      list.push({ key: "share", icon: Share2, label: "Share", onClick: a.share });
    }
    if (!hide("report") && track.uploader_id && track.uploader_id !== user?.id) {
      list.push({
        key: "report",
        icon: Flag,
        label: "Report",
        danger: true,
        onClick: () => setShowReport(true),
      });
    }

    for (const extra of extraActions) {
      if (!extra) continue;
      list.push({ key: extra.key || extra.label, ...extra });
    }
    return list;
  }, [track, user, a, extraActions, hideActions]);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function openMenu() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const height = Math.min(items.length * 41 + 12, window.innerHeight * 0.7);
    const up = r.bottom + height + 8 > window.innerHeight && r.top - height - 8 > 0;
    const left =
      align === "left"
        ? Math.max(8, r.left)
        : Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setPos({ top: up ? r.top - height - 6 : r.bottom + 6, left, height });
  }

  if (!track) return null;
  const triggerCls =
    variant === "plus"
      ? `w-9 h-9 rounded-full grid place-items-center transition active:scale-90 ${
          pos ? "bg-foreground/15" : "bg-foreground/10 hover:bg-foreground/20"
        }`
      : `p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/10 active:scale-90 transition ${
          pos ? "bg-foreground/10 text-foreground" : ""
        }`;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          pos ? setPos(null) : openMenu();
        }}
        className={triggerCls}
        aria-label="Track options"
        aria-haspopup="menu"
      >
        {variant === "plus" ? pos ? <X size={19} /> : <Plus size={19} /> : <MoreHorizontal size={17} />}
      </button>

      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div
            role="menu"
            className="fixed z-50 overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl py-1.5 backdrop-blur-xl"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH, maxHeight: pos.height }}
          >
            {items.map((item, i) => (
              <MenuItem
                key={item.key || i}
                icon={item.icon}
                label={item.label}
                danger={item.danger}
                active={item.active}
                spinner={item.spinner}
                onClick={(e) => {
                  e.stopPropagation();
                  setPos(null);
                  item.onClick?.();
                }}
              />
            ))}
          </div>
        </>
      )}

      {showPlaylists && (
        <PlaylistPickerModal track={track} onClose={() => setShowPlaylists(false)} />
      )}
      {showReport && <ReportModal track={track} onClose={() => setShowReport(false)} />}
    </div>
  );
}