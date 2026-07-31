import { Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";

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

export default function TrackCard({ track }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingNow = isCurrent && p.isPlaying;

  const coverUrl = track.cover_art_url;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isCurrent) p.togglePlay();
    else p.playTrackAt([track]);
  };

  return (
    <div
      onClick={handlePlay}
      className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 cursor-pointer
        hover:bg-foreground/[0.04] active:scale-[0.98]
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

        <button
          onClick={handlePlay}
          aria-label={isPlayingNow ? "Pause" : "Play"}
          className={`absolute bottom-2.5 right-2.5 w-11 h-11 md:w-12 md:h-12 rounded-full grid place-items-center shadow-xl
            transition-all duration-300 active:scale-90
            ${isPlayingNow
              ? "bg-foreground text-background opacity-100 translate-y-0"
              : "bg-foreground text-background opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}
            hover:scale-105`}
        >
          {isPlayingNow ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        {isPlayingNow && (
          <div className="absolute top-2 right-2 h-7 px-1.5 rounded-full bg-background/85 backdrop-blur grid place-items-center text-foreground shadow-md">
            <EqualizerBars active={isPlayingNow} />
          </div>
        )}
      </div>

      <Link
        to={`/track/${track.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
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
      </Link>
    </div>
  );
}