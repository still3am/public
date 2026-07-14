import { Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";

export default function TrackCard({ track }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  return (
    <div
      className="group rounded-xl p-3 hover:bg-foreground/[0.03] transition cursor-pointer relative"
      onClick={() => p.playTrackAt([track])}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3">
        {track.cover_art_url ? (
          <img
            src={track.cover_art_url}
            alt=""
            className={`w-full h-full object-cover transition ${
              isCurrent ? "" : "group-hover:scale-[1.03]"
            }`}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-foreground/30 text-xs font-medium">
            {track.genre}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrent) p.togglePlay();
            else p.playTrackAt([track]);
          }}
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
          aria-label="Play track"
        >
          {isCurrent && p.isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </button>
      </div>
      <Link
        to={`/track/${track.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <div className="font-semibold truncate text-sm">{track.title}</div>
        <div className="text-xs text-foreground/50 truncate">
          {track.uploader_name || "Unknown"}
        </div>
      </Link>
    </div>
  );
}