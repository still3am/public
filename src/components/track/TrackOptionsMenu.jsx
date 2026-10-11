import { useRef, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import TrackOptionsPanel from "@/components/track/TrackOptionsPanel";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * The one track options menu, shared by every surface that shows a track:
 * cards, rows, the queue, the track page and the player. It always reflects
 * the listener's live state (library, offline, liked, following) and opens as
 * a compact bottom sheet on phones, an anchored list on desktop.
 *
 * Surfaces add what only they know about through `items` (edit, detect genre,
 * generate lyrics, admin tools) and can override the report flow with
 * `onReport`.
 */
export default function TrackOptionsMenu({
  track,
  items = [],
  onReport,
  variant = "icon",
  buttonClassName,
  align = "right",
  size = 16,
  className = "",
  dark = false,
}) {
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);
  const isMobile = useIsMobile();

  if (!track) return null;
  const open = !!anchor;

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    setAnchor(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : null);
    if (!rect) setAnchor({ top: 0, bottom: 0, left: 0, right: 0 });
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setAnchor(null);
          else openMenu();
        }}
        className={
          buttonClassName ||
          `p-2 rounded-full transition ${dark ? "hover:bg-white/15 text-white/80" : "hover:bg-accent"}`
        }
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
        <TrackOptionsPanel
          track={track}
          anchor={anchor}
          align={align}
          dark={dark}
          sheet={isMobile}
          items={items}
          onReport={onReport}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  );
}