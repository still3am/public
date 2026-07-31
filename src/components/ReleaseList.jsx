import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Plus, Check, Loader2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { Image } from "@/components/ui/image";

const BATCH = 4;

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

function ReleaseCard({ track, tracks, index }) {
  const p = usePlayer();
  const { isInLibrary, toggle } = useLibrary();
  const [busy, setBusy] = useState(false);
  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const artistName = track.artist || track.uploader_name || "Unknown";
  const ago = timeAgo(track.created_date);

  const onPlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrent) p.togglePlay();
    else p.playTrackAt(tracks.slice(index), 0);
  };

  const onToggleLib = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await toggle(track);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="snap-start shrink-0 w-[68vw] max-w-[190px] sm:w-[185px] md:w-[208px]">
      <div className="group relative rounded-2xl p-2 md:p-2.5 hover:bg-foreground/[0.035] active:scale-[0.99] transition">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/10 ring-1 ring-foreground/[0.06] mb-2.5">
          {track.cover_art_url ? (
            <Image src={track.cover_art_url} fittingType="fill" className="w-full h-full" />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/30 text-[10px] font-bold uppercase tracking-tight text-center px-1">
              {track.genre}
            </div>
          )}
          <span className="absolute top-2 left-2 text-[11px] font-extrabold tabular-nums bg-background/70 backdrop-blur-md px-1.5 py-0.5 rounded-md text-foreground/80">
            {index + 1}
          </span>
          <button
            onClick={onToggleLib}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/70 backdrop-blur-md grid place-items-center text-foreground/80 hover:bg-background active:scale-90 transition"
            aria-label={inLib ? "Remove from library" : "Add to library"}>
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : inLib ? (
              <Check size={14} />
            ) : (
              <Plus size={14} />
            )}
          </button>
          <button
            onClick={onPlay}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
            aria-label="Play track">
            {isPlayingHere ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
          </button>
        </div>
        <Link to={`/track/${track.id}`} className="block">
          <div className="flex items-center gap-1.5 mb-1 px-0.5">
            {ago && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/45 shrink-0">
                {ago}
              </span>
            )}
            <span className="text-foreground/20">·</span>
            <span className="text-[10px] text-foreground/40 truncate">{track.genre}</span>
          </div>
          <div className="font-semibold truncate text-[15px] leading-tight flex items-center gap-1.5 px-0.5">
            <span
              className={`truncate ${
                isCurrent ? "text-foreground" : "text-foreground"
              }`}>
              {track.title}
            </span>
            {track.explicit && (
              <span className="text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 leading-none px-1 py-0.5 shrink-0">
                E
              </span>
            )}
          </div>
          <div className="text-[13px] text-muted-foreground truncate px-0.5 mt-0.5">
            {artistName}
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function ReleaseList({ tracks }) {
  const [visible, setVisible] = useState(BATCH);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisible(BATCH);
  }, [tracks]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || !tracks?.length) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + BATCH, tracks.length));
        }
      },
      { root, rootMargin: "0px 160px 0px 0px", threshold: 0.01 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [tracks, visible]);

  if (!tracks?.length) return null;
  const shown = tracks.slice(0, visible);
  const hasMore = visible < tracks.length;

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 pb-2">
      {shown.map((t, i) => (
        <ReleaseCard key={t.id} track={t} tracks={tracks} index={i} />
      ))}
      {hasMore && <div ref={sentinelRef} className="shrink-0 w-px" aria-hidden />}
    </div>
  );
}