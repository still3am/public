import { useEffect, useState } from "react";
import TrackOptionsList from "@/components/track/TrackOptionsList";
import TrackLoungeSheet from "@/components/track/TrackLoungeSheet";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";
import useTrackMenuItems from "@/hooks/useTrackMenuItems";

const MENU_WIDTH = 220;

export default function TrackOptionsPanel({
  track,
  anchor,
  align = "right",
  dark = false,
  sheet = false,
  items = [],
  onReport,
  onClose,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loungeOpen, setLoungeOpen] = useState(false);

  const groups = useTrackMenuItems({
    track,
    items,
    onReport,
    onAddToPlaylist: () => setPickerOpen(true),
    onLounge: () => setLoungeOpen(true),
  });

  useEffect(() => {
    if (sheet) return;
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [sheet, onClose]);

  const surface = dark
    ? "bg-black/95 backdrop-blur-xl border-white/10 text-white"
    : "bg-popover border-border text-popover-foreground";

  const style = sheet
    ? undefined
    : {
        top: (anchor?.bottom ?? 0) + 6,
        left:
          align === "right"
            ? Math.max(8, Math.min((anchor?.right ?? 0) - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
            : Math.max(8, Math.min(anchor?.left ?? 0, window.innerWidth - MENU_WIDTH - 8)),
        width: MENU_WIDTH,
      };

  return (
    <>
      <div className={`fixed inset-0 z-40 ${sheet ? "bg-black/50" : ""}`} onClick={onClose} />
      <div
        role="menu"
        style={style}
        className={`fixed z-50 overflow-y-auto ${
          sheet
            ? "inset-x-0 bottom-0 max-h-[74vh] rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)]"
            : "rounded-xl border py-1 shadow-2xl max-h-[70vh]"
        } ${surface}`}
      >
        {sheet && (
          <div className={`sticky top-0 z-10 px-4 pt-3 pb-2 ${dark ? "bg-black/95" : "bg-popover"}`}>
            <div className={`mx-auto h-1 w-10 rounded-full ${dark ? "bg-white/25" : "bg-foreground/15"}`} />
            <div className="mt-2 truncate text-[13px] font-bold">{track?.title}</div>
          </div>
        )}
        <TrackOptionsList groups={groups} dark={dark} sheet={sheet} onClose={onClose} />
      </div>

      {pickerOpen && <PlaylistPickerModal track={track} onClose={() => setPickerOpen(false)} />}
      {loungeOpen && (
        <TrackLoungeSheet
          track={track}
          onClose={() => {
            setLoungeOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}