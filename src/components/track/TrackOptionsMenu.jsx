import {reportActionError} from "@/lib/actionError";
import ArtistReleaseFollow from "@/components/ArtistReleaseFollow";
import {splitArtistNames} from "@/lib/artistTracks";
import {artistKey} from "@/lib/artistReleaseModel";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Plus, Music2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { useTrackMenuState } from "@/hooks/useTrackMenuState";
import { useTrackActions } from "@/components/track/useTrackActions";
import TrackMenuList from "@/components/track/TrackMenuList";
import ReportTrackDialog from "@/components/track/ReportTrackDialog";
import TrackLoungeAction from "@/components/track/TrackLoungeAction";
import SendTrackModal from "@/components/track/SendTrackModal";
import PlaylistPickerModal from "@/components/playlist/PlaylistPickerModal";

const MENU_WIDTH = 240;

/** @param {any} props */
function SheetHeader({ track }) {
  const cover = useCoverUrl(track.cover_art_url);
  return (
    <div className="flex items-center gap-3 px-4 pb-3 border-b border-border">
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
        {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <Music2 size={16} />}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{track.title}</div>
        <div className="text-xs text-muted-foreground truncate">{track.artist || track.uploader_name || "Unknown"}</div>
      </div>
    </div>
  );
}

/**
 * The one track options menu used on every surface. The action set, order and
 * state-awareness live in useTrackActions; surfaces can only add `items`
 * (owner/admin tools, player extras) below the standard list.
 * Phones get a bottom sheet, larger screens a popover.
 */
/** @param {any} props */
export default function TrackOptionsMenu({
  track,
  items = [],
  onReport,
  variant = "icon",
  buttonClassName,
  align = "right",
  size = 16,
  className = "",
  openSignal = 0,
  anchorRef,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, maxH: 400 });
  const [modal, setModal] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const menuState = useTrackMenuState(track, open);
  const { standard, manage } = useTrackActions(
    track || {},
    menuState,
    {
      openPicker: () => setModal("picker"),
      openReport: () => setModal("report"),
      openLounge: () => setModal("lounge"),
      openSend: () => setModal("send"),
      onReport,
    }
  );

  const place = (rect) => {
    const left = align === "right" ? rect.right - MENU_WIDTH : rect.left;
    const below = window.innerHeight - rect.bottom - 12;
    const flip = below < 320 && rect.top > below;
    setPos({
      left: Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8)),
      top: flip ? Math.max(8, rect.top - 6 - Math.min(520, rect.top - 14)) : rect.bottom + 6,
      maxH: Math.min(520, flip ? rect.top - 14 : below),
    });
  };

  useEffect(() => {
    if (!open || isMobile) return;
    const close = () => setOpen(false);
    // Scrolling inside the menu itself must not dismiss it.
    const onScroll = (e) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!openSignal) return;
    const rect = (anchorRef?.current || btnRef.current)?.getBoundingClientRect();
    if (rect) place(rect);
    setOpen(true);
  }, [openSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(!open)return;
    const key=event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();setOpen(false);btnRef.current?.focus();}};
    window.addEventListener("keydown",key,true);return()=>window.removeEventListener("keydown",key,true);
  },[open]);

  if (!track) return null;

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (open) return setOpen(false);
    place(btnRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const pick = async (item) => {
    if(item.disabled)return;
    if(!item.keepOpen)setOpen(false);
    try{await item.onClick?.();}catch(error){reportActionError(error,"Couldn’t complete this song action. Please try again.");}
  };

  const artistNames=[...new Map(splitArtistNames(String(track.artist||"").replace(/\s+[\[(]?(?:feat(?:uring)?\.?|ft\.?)\s+/gi,", "),false).map(name=>[artistKey(name),name])).values()];
  const list = (
    <TrackMenuList standard={standard} manage={manage} extras={items} onPick={pick} roomy={isMobile}>
      {artistNames.length>0&&artistNames.map(name=><ArtistReleaseFollow key={artistKey(name)} name={name} variant="menu"/>)}
    </TrackMenuList>
  );

  return (
    <div className={`relative shrink-0 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        data-song-menu-trigger
        style={{width:36,height:36,minWidth:36,minHeight:36,padding:0,borderRadius:"50%",display:"grid",placeItems:"center",flexShrink:0}}
        ref={btnRef}
        onClick={toggleOpen}
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

      {open &&
        createPortal(
          <div data-public-menu data-public-dialog role="dialog" aria-modal="true" aria-label="Song options" tabIndex={-1} className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
            {isMobile ? (
              <>
                <div className="absolute inset-0 bg-black/60" />
                <div
                  className="absolute inset-x-0 bottom-0 bg-popover text-popover-foreground rounded-t-3xl pt-3 max-h-[85dvh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom duration-200"
                  style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/20" />
                  <SheetHeader track={track} />
                  {list}
                </div>
              </>
            ) : (
              <div
                ref={menuRef}
                className="absolute bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl overflow-y-auto overscroll-contain"
                style={{ top: pos.top, left: pos.left, width: MENU_WIDTH, maxHeight: pos.maxH }}
                onClick={(e) => e.stopPropagation()}
              >
                {list}
              </div>
            )}
          </div>,
          document.body
        )}

      {modal === "picker" && <PlaylistPickerModal track={track} onClose={() => setModal(null)} />}
      {modal === "report" && <ReportTrackDialog track={track} onClose={() => setModal(null)} />}
      {modal === "lounge" && <TrackLoungeAction track={track} onClose={() => setModal(null)} />}
      {modal === "send" && <SendTrackModal track={track} onClose={() => setModal(null)} />}
    </div>
  );
}