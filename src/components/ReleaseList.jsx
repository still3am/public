import { useState, useRef, useEffect } from "react";
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
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/[0.04] text-left ${
        danger ? "text-red-600" : ""
      }`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function ReleaseRow({ track, tracks, index, openMenuId, setOpenMenuId }) {
  const p = usePlayer();
  const nav = useNavigate();
  const { isInLibrary, toggle } = useLibrary();
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const moreBtnRef = useRef(null);
  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const menuOpen = openMenuId === track.id;

  const setMenuOpen = (v) => setOpenMenuId(v ? track.id : null);

  const openMenu = () => {
    if (moreBtnRef.current) {
      const r = moreBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
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
    <div className="group flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-foreground/[0.04] active:scale-[0.99] transition">
      <button onClick={playHere} className="relative shrink-0" aria-label="Play">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10">
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
            className={`text-[15px] font-bold truncate ${
              isCurrent ? "text-foreground" : "text-foreground"
            }`}>
            {track.title}
          </span>
          {track.explicit && (
            <span className="text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 leading-none px-1 py-0.5 shrink-0">
              E
            </span>
          )}
        </Link>
        <div className="text-[13px] text-muted-foreground truncate mt-0.5">
          {artistName}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          ref={moreBtnRef}
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className="p-2 rounded-full hover:bg-foreground/5"
          aria-label="More">
          <MoreHorizontal size={18} className="text-foreground" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
              style={{ top: menuPos.top, right: menuPos.right }}>
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
          </>
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