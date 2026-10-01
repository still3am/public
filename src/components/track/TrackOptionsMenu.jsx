import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  EyeOff,
  Flag,
  ListMusic,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

const MENU_WIDTH = 220;

/**
 * The one track options menu, shared by every surface that lists a track.
 *
 * Base actions are derived from the track itself: library, playlist, offline,
 * download, share, report and the admin takedown. Surfaces add what only they
 * know about through `items` (edit, detect genre, generate lyrics, …) and can
 * override the report flow with `onReport`.
 */
export default function TrackOptionsMenu({
  track,
  items = [],
  onReport,
  variant = "icon",
  buttonClassName,
  align = "right",
  size = 16,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const btnRef = useRef(null);

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

  if (!track) return null;

  const inLib = isInLibrary(track.id);
  const savedOffline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isOwner = track.uploader_id === user?.id;
  const isAdmin = user?.role === "admin";

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const maxLeft = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      const left =
        align === "right"
          ? Math.max(8, Math.min(rect.right - MENU_WIDTH, maxLeft))
          : Math.max(8, Math.min(rect.left, maxLeft));
      setPos({ top: rect.bottom + 6, left });
    }
    setOpen(true);
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

  const base = [
    {
      icon: busy ? Loader2 : inLib ? Check : Plus,
      label: busy ? "Saving…" : inLib ? "Remove from library" : "Add to library",
      danger: !busy && inLib,
      onClick: async () => {
        setBusy(true);
        try {
          await toggle(track);
        } finally {
          setBusy(false);
        }
      },
    },
    {
      icon: ListMusic,
      label: "Add to playlist",
      onClick: () => setPickerOpen(true),
    },
    {
      icon: savingOffline ? Loader2 : savedOffline ? Trash2 : Download,
      label: savingOffline ? "Saving…" : savedOffline ? "Remove offline" : "Save offline",
      onClick: async () => {
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
      },
    },
  ];

  if (track.is_downloadable) {
    base.push({
      icon: Download,
      label: "Download",
      onClick: () => {
        if (track.audio_url && /^https?:\/\//i.test(track.audio_url)) {
          window.open(track.audio_url, "_blank");
        }
      },
    });
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    base.push({
      icon: Share2,
      label: "Share",
      onClick: () =>
        navigator
          .share({ title: `${track.title} on PUBLIC.`, url: `${window.location.origin}/track/${track.id}` })
          .catch(() => {}),
    });
  }

  if (!isOwner) {
    base.push({
      icon: Flag,
      label: "Report",
      danger: true,
      onClick: () => (onReport ? onReport(track) : report()),
    });
  }

  if (isAdmin && track.is_published) {
    base.push({
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
          await base44.entities.Track.update(track.id, {
            is_published: false,
            approval_status: "rejected",
          });
          toast({ title: "Removed from PUBLIC" });
        } catch {
          toast({ title: "Couldn't remove track", variant: "destructive" });
        }
      },
    });
  }

  const menuItems = [...base, ...items];

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={buttonClassName || "p-2 rounded-full hover:bg-accent"}
        aria-label="Track options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {variant === "plus" ? (
          <Plus size={size} className={open ? "rotate-45 transition-transform" : "transition-transform"} />
        ) : (
          <MoreHorizontal size={size} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed z-50 bg-popover border border-border rounded-xl shadow-2xl py-1"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH }}
          >
            {menuItems.map((m, i) => {
              const Icon = m.icon;
              return (
                <button
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    m.onClick?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left ${
                    m.danger ? "text-destructive" : ""
                  }`}
                >
                  <Icon size={15} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {pickerOpen && <PlaylistPickerModal track={track} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}