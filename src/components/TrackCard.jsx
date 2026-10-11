import { useRef, useState } from "react";
import { Play, Check } from "lucide-react";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";

function EqualizerBars({ active }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-0.5 h-4 px-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-current"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animation: `songbar ${0.6 + i * 0.18}s ease-in-out ${i * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function TrackCard({ track, selectable = false, selected = false, onToggleSelect }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingNow = isCurrent && p.isPlaying;

  const coverUrl = useCoverUrl(track.cover_art_url);

  const [menuSignal, setMenuSignal] = useState(0);
  const cardRef = useRef(null);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);

  const cancelPress = () => clearTimeout(pressTimer.current);
  const startPress = (e) => {
    if (selectable || e.pointerType === "mouse") return;
    longPressed.current = false;
    cancelPress();
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(15);
      setMenuSignal((n) => n + 1);
    }, 450);
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (isCurrent) p.togglePlay();
    else p.playTrackAt([track]);
  };

  return (
    <div
      ref={cardRef}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerMove={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={selectable ? () => onToggleSelect?.(track) : handlePlay}
      className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 cursor-pointer
        hover:bg-foreground/[0.04] active:scale-[0.98]
        ${selectable && selected ? "bg-accent ring-1 ring-foreground/40" : ""}
        ${isCurrent ? "bg-foreground/[0.03]" : ""}`}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm">
        {coverUrl ? (
          <Image
            src={coverUrl}
            fittingType="fill"
            alt=""
            className={`w-full h-full object-cover transition-transform duration-500 ease-out
              ${isCurrent ? "" : "group-hover:scale-[1.06]"}`}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-foreground/25 text-[10px] font-semibold uppercase tracking-wider px-2 text-center">
            {track.genre}
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {selectable &&
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded-full grid place-items-center border transition ${
          selected ? "bg-foreground text-background border-foreground" : "bg-black/35 border-white/70 text-transparent"}`
          }>
          
            <Check size={13} />
          </div>
        }

        {!selectable && !isPlayingNow && (
          <button
            onClick={handlePlay}
            aria-label="Play"
            className="absolute bottom-2.5 right-2.5 w-11 h-11 md:w-12 md:h-12 rounded-full grid place-items-center shadow-xl
              transition-all duration-300 active:scale-90 bg-foreground text-background
              opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105"
          >
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </button>
        )}

        {!selectable && isPlayingNow && (
          <div className="absolute bottom-2.5 right-2.5 w-11 h-11 md:w-12 md:h-12 rounded-full bg-background/85 backdrop-blur grid place-items-center text-foreground shadow-xl">
            <EqualizerBars active={isPlayingNow} />
          </div>
        )}

        {!selectable && (
          <div
            className="hidden md:block absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}>
            <TrackOptionsMenu
              track={track}
              size={17}
              openSignal={menuSignal}
              anchorRef={cardRef}
              buttonClassName="grid w-8 h-8 md:w-9 md:h-9 rounded-full place-items-center bg-background/85 backdrop-blur text-foreground shadow-sm hover:bg-background active:scale-90 transition" />
          </div>
        )}
      </div>

      {selectable ? (
        <div className="block">
          <TrackCardMeta track={track} isCurrent={isCurrent} />
        </div>
      ) : (
        <Link
          to={`/track/${track.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          <TrackCardMeta track={track} isCurrent={isCurrent} />
        </Link>
      )}
    </div>
  );
}

function TrackCardMeta({ track, isCurrent }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className={`truncate text-sm font-semibold ${isCurrent ? "text-foreground" : ""}`}>
          {track.title}
        </span>
        {track.explicit && (
          <span className="shrink-0 text-[8px] font-extrabold rounded bg-foreground/15 text-foreground/60 px-1 leading-none py-[1px]">
            E
          </span>
        )}
      </div>
      <div className="text-xs text-foreground/55 truncate mt-0.5">
        {track.artist || track.uploader_name || "Unknown"}
      </div>
    </>
  );
}