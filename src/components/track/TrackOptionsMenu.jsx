import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useTrackActions } from "@/hooks/useTrackActions";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

const MENU_WIDTH = 240;

/**
 * THE track options menu. Every surface that shows a track renders this — the
 * action set, its order and each item's state (in library, downloaded, liked,
 * following) come from useTrackActions, so no surface can drift out of sync.
 *
 * `items` appends things only a particular surface knows about (owner tools on
 * the track page, the player's queue/pulse switches). `onPlay` lets a list play
 * its own slice of the queue. `tone="overlay"` matches the always-dark player
 * and queue surfaces.
 */
export default function TrackOptionsMenu({
  track,
  items: extraItems = [],
  onPlay,
  onReport,
  variant = "icon",
  tone = "default",
  buttonClassName,
  align = "right",
  size = 16,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const { items, pickerOpen, setPickerOpen } = useTrackActions(track, { onPlay, onReport });

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

  const menuItems = [...items, ...extraItems];
  const overlay = tone === "overlay";

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

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (open) setOpen(false);
          else openMenu();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className={
          buttonClassName ||
          (overlay
            ? "w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 active:scale-90 transition text-white"
            : "p-2 rounded-full hover:bg-accent")
        }
        aria-label="Track options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {variant === "plus" ? (
          <Plus
            size={size}
            className={open ? "rotate-45 transition-transform" : "transition-transform"}
          />
        ) : (
          <MoreHorizontal size={size} />
        )}
      </button>

      {open && (
        <>
          <div
            className={`fixed inset-0 ${overlay ? "z-[75]" : "z-40"}`}
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className={`fixed rounded-xl shadow-2xl py-1 ${
              overlay
                ? "z-[80] bg-black/85 backdrop-blur-xl border border-white/15 text-white"
                : "z-50 bg-popover border border-border text-popover-foreground"
            }`}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH }}
          >
            {menuItems.map((m, i) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id || i}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    m.onClick?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition ${
                    overlay ? "hover:bg-white/10" : "hover:bg-accent"
                  } ${m.danger ? (overlay ? "text-red-400" : "text-destructive") : ""}`}
                >
                  <Icon size={15} fill={m.filled ? "currentColor" : "none"} />
                  <span className="truncate">{m.label}</span>
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