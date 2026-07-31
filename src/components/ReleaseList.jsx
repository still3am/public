import { useState } from "react";
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

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

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

function ReleaseRow({ track, tracks, index }) {
  const p = usePlayer();
  const nav = useNavigate();
  const { isInLibrary, toggle } = useLibrary();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;

  const playHere = () => p.playTrackAt(tracks.slice(index), 0);
  const artistName = track.artist || track.uploader_name || "Unknown";
  const ago = timeAgo(track.created_date);

  return (
    <div
      className={`group flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-xl transition ${
        isCurrent
          ? "bg-foreground/[0.05]"
          : "hover:bg-foreground/[0.035] active:scale-[0.99]"
      }`}>
      <div className="flex items-center justify-center w-5 shrink-0">
        <span
          className={`text-xs font-bold tabular-nums ${
            isCurrent ? "text-foreground" : "text-foreground/35 group-hover:text-foreground/60"
          } transition`}>
          {isPlayingHere ? (
            <span className="flex items-end gap-[2px] h-3.5">
              <span className="w-[2px] bg-foreground rounded-full animate-[songbar_0.9s_ease-in-out_infinite]" />
              <span className="w-[2px] bg-foreground rounded-full animate-[songbar_0.9s_ease-in-out_infinite_0.2s]" />
              <span className="w-[2px] bg-foreground rounded-full animate-[songbar_0.9s_ease-in-out_infinite_0.4s]" />
            </span>
          ) : (
            index + 1
          )}
        </span>
      </div>

      <button onClick={playHere} className="relative shrink-0" aria-label="Play">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 ring-1 ring-foreground/[0.06]">
          {track.cover_art_url ? (
            <Image src={track.cover_art_url} fittingType="fill" className="w-full h-full" />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/30 text-[9px] font-bold text-center px-1 uppercase tracking-tight">
              {track.genre}
            </div>
          )}
        </div>
        <span
          className={`absolute inset-0 grid place-items-center bg-black/40 transition rounded-lg ${
            isPlayingHere ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
          {isPlayingHere ? (
            <Pause size={17} className="text-white" />
          ) : (
            <Play size={17} className="text-white" fill="currentColor" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <Link to={`/track/${track.id}`} className="flex items-center gap-1.5 min-w-0">
          <span
            className={`text-[15px] font-semibold truncate ${
              isCurrent ? "text-foreground" : "text-foreground"
            }`}>
            {track.title}
          </span>
          {track.explicit && (
            <span className="text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 leading-none px-1 py-0.5 shrink-0">
              E
            </span>
          )}
          {ago && (
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-foreground/35 shrink-0">
              {ago}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[13px] text-muted-foreground truncate">{artistName}</span>
          <span className="text-foreground/20">·</span>
          <span className="text-[11px] text-foreground/40 truncate shrink-0">{track.genre}</span>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-full hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition"
          aria-label="More">
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px]">
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
  if (!tracks?.length) return null;
  return (
    <div className="divide-y divide-foreground/[0.04]">
      {tracks.map((t, i) => (
        <ReleaseRow key={t.id} track={t} tracks={tracks} index={i} />
      ))}
    </div>
  );
}