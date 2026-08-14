import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  MoreHorizontal,
  Plus,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { Image } from "@/components/ui/image";

function MenuBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-foreground/[0.04] active:bg-foreground/[0.08] text-left ${
      danger ? "text-destructive" : ""
    }`}>
    <Icon size={15} /> {label}
    </button>
  );
}

function ReleaseRow({ track, tracks, index, openMenuId, setOpenMenuId }) {
  const p = usePlayer();
  const nav = useNavigate();
  const { isInLibrary, toggle } = useLibrary();
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const moreBtnRef = useRef(null);
  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const menuOpen = openMenuId === track.id;

  const setMenuOpen = (v) => setOpenMenuId(v ? track.id : null);

  const openMenu = () => {
    if (moreBtnRef.current) {
      const r = moreBtnRef.current.getBoundingClientRect();
      const menuW = window.innerWidth < 640 ? 180 : 200;
      const menuH = 150;
      const gap = 4;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Prefer opening below the button; flip above if it would overflow the bottom.
      const top = r.bottom + gap + menuH > vh
        ? Math.max(8, r.top - gap - menuH)
        : r.bottom + gap;
      // Keep the menu fully on-screen horizontally.
      let left = r.right - menuW;
      left = Math.max(8, Math.min(left, vw - menuW - 8));
      setMenuPos({ top, left });
    }
    setOpenMenuId(track.id);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [menuOpen, setOpenMenuId]);

  const playHere = () => p.playTrackAt(tracks.slice(index), 0);

  const artistName = track.artist || track.uploader_name || "Unknown";

  return (
    <div className="group flex items-center gap-2 md:gap-3 px-2 py-1.5 md:py-2.5 rounded-lg hover:bg-foreground/[0.04] active:scale-[0.99] transition">
      <button onClick={playHere} className="relative shrink-0" aria-label="Play">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-foreground/10">
          {track.cover_art_url ? (
            <Image
              src={track.cover_art_url}
              fittingType="fill"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/30 text-[9px] font-bold text-center px-1">
              {track.genre}
            </div>
          )}
        </div>
        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 group-hover:opacity-100 transition">
          {isPlayingHere ? (
            <Pause size={18} className="text-white" />
          ) : (
            <Play size={18} className="text-white" fill="currentColor" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <Link to={`/track/${track.id}`} className="flex items-center gap-1.5 min-w-0">
          <span
            className={`text-[13px] md:text-[15px] font-bold truncate ${
              isCurrent ? "text-foreground" : "text-foreground"
            }`}>
            {track.title}
          </span>
          {track.explicit && (
            <span className="text-[8px] md:text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 leading-none px-1 py-0.5 shrink-0">
              E
            </span>
          )}
        </Link>
        <div className="text-[11px] md:text-[13px] text-muted-foreground truncate mt-0.5">
          {artistName}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          ref={moreBtnRef}
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className="p-1.5 md:p-2.5 rounded-full hover:bg-foreground/5 active:bg-foreground/10"
          aria-label="More">
          <MoreHorizontal size={16} className="text-foreground" />
        </button>
        {menuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="fixed z-[70] bg-popover border border-border rounded-xl shadow-xl py-1 w-[180px] sm:w-[200px] max-w-[calc(100vw-1rem)]"
                style={{ top: menuPos.top, left: menuPos.left }}>
                <MenuBtn
                  icon={isPlayingHere ? Pause : Play}
                  label={isPlayingHere ? "Pause" : "Play"}
                  onClick={() => {
                    setMenuOpen(false);
                    if (isCurrent) p.togglePlay();
                    else playHere();
                  }}
                />
                <MenuBtn
                  icon={busy ? Loader2 : inLib ? Check : Plus}
                  label={busy ? "Saving…" : inLib ? "Remove from library" : "Add to library"}
                  danger={!busy && inLib}
                  onClick={async () => {
                    setMenuOpen(false);
                    setBusy(true);
                    try {
                      await toggle(track);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <MenuBtn
                  icon={ChevronRight}
                  label="Go to track"
                  onClick={() => {
                    setMenuOpen(false);
                    nav(`/track/${track.id}`);
                  }}
                />
              </div>
            </>,
            document.body
          )}
      </div>
    </div>
  );
}

export default function ReleaseList({ tracks }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  if (!tracks?.length) return null;
  const chunks = [];
  for (let i = 0; i < tracks.length; i += 4) {
    chunks.push(tracks.slice(i, i + 4));
  }
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0">
      {chunks.map((group, gi) => (
        <div
          key={gi}
          className="snap-start shrink-0 w-[88%] sm:w-[calc(50%-0.375rem)] md:w-full divide-y divide-foreground/[0.05]">
          {group.map((t, i) => (
            <ReleaseRow
              key={t.id}
              track={t}
              tracks={tracks}
              index={gi * 4 + i}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}