import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import TrackOptionsPanel from "@/components/track/TrackOptionsPanel";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

const MENU_WIDTH = 232;

/**
 * The single options trigger used by every surface that lists a track. It owns
 * only the button and the menu positioning — the action list lives in
 * TrackOptionsPanel and is identical everywhere.
 */
export default function TrackOptionsMenu({
  track,
  items = [],
  onReport,
  onShare,
  onMix,
  mixerActive = false,
  onLounge,
  hideGoToTrack = false,
  variant = "icon",
  buttonClassName,
  align = "right",
  size = 16,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
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

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const maxLeft = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      const left =
        align === "right"
          ? Math.max(8, Math.min(rect.right - MENU_WIDTH, maxLeft))
          : Math.max(8, Math.min(rect.left, maxLeft));
      const maxTop = Math.max(8, window.innerHeight - 320);
      setPos({ top: Math.min(rect.bottom + 6, maxTop), left });
    }
    setOpen(true);
  };

  return (
    <div
      className={`shrink-0 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
        className={buttonClassName || "p-2 rounded-full hover:bg-accent"}
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
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="menu"
            className="fixed z-50 bg-popover border border-border rounded-xl shadow-2xl py-1 max-h-[70vh] overflow-y-auto"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_WIDTH }}
          >
            <TrackOptionsPanel
              track={track}
              items={items}
              onReport={onReport}
              onShare={onShare}
              onMix={onMix}
              mixerActive={mixerActive}
              onLounge={onLounge}
              hideGoToTrack={hideGoToTrack}
              onAddToPlaylist={() => setPickerOpen(true)}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}

      {pickerOpen && <PlaylistPickerModal track={track} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}