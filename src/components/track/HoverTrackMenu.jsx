import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";

/**
 * Options menu button for cards: hidden on phones (opened by long-press via the
 * `lp` handle from useLongPressMenu), shown on desktop only while the parent
 * `.group` is hovered. The parent card must have the `group` class.
 */
/** @param {any} props */
export default function HoverTrackMenu({ track, lp, size = 18, className = "", buttonClassName }) {
  return (
    <div
      className={`song-menu-reveal transition-opacity ${className}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TrackOptionsMenu
        track={track}
        size={size}
        openSignal={lp.signal}
        anchorRef={lp.ref}
        buttonClassName={buttonClassName}
      />
    </div>
  );
}