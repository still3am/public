import { Link } from "react-router-dom";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

function PodiumCard({ track, rank, height, accent }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const play = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrent) p.togglePlay();
    else p.playTrackAt([track]);
  };
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1 w-full">
      <Link
        to={`/track/${track.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block w-full text-center min-w-0">
        <div
          className="group relative aspect-square w-full rounded-lg overflow-hidden bg-foreground/10"
          style={{ height }}>
          {track.cover_art_url ? (
            <img
              src={track.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/30 text-[10px] font-bold px-1 text-center">
              {track.genre}
            </div>
          )}
          <span
            className="absolute top-1.5 left-1.5 grid place-items-center font-extrabold rounded-full tabular-nums tracking-tight ring-1 ring-white/40 ring-inset backdrop-blur-md"
            style={{
              width: rank <= 3 ? 26 : 22,
              height: rank <= 3 ? 26 : 22,
              fontSize: rank <= 3 ? 13 : 11,
              background: `linear-gradient(150deg, rgba(255,255,255,0.45), ${accent.replace(/[\d.]+\)$/, "0.35)")} 55%, rgba(255,255,255,0.12))`,
              color: "rgba(255,255,255,0.95)",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.12)",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}>
            {rank}
          </span>
          <button
            onClick={play}
            className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center shadow-lg active:scale-95 transition-opacity duration-200 group-hover:opacity-100 focus:opacity-100 ${
              isCurrent && p.isPlaying ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Play track">
            {isCurrent && p.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
        <div className="font-semibold text-sm truncate mt-2">{track.title}</div>
        <div className="text-xs text-foreground/50 truncate">
          {track.artist || track.uploader_name || "Unknown"}
        </div>
      </Link>
    </div>
  );
}

export default function Podium({ tracks }) {
  const top = tracks.slice(0, 5);
  if (top.length < 5) {
    // not enough for a full podium yet — still render in order
  }
  const [second, first, third, fourth, fifth] = [
    top[1], top[0], top[2], top[3], top[4],
  ];
  return (
    <div className="space-y-3 mb-2">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {second && (
          <PodiumCard
            track={second}
            rank={2}
            accent="rgba(180,180,180,0.9)"
          />
        )}
        {first && (
          <div className="flex flex-col min-w-0 flex-[1.12]">
            <PodiumCard
              track={first}
              rank={1}
              accent="rgba(250,204,80,0.95)"
            />
          </div>
        )}
        {third && (
          <PodiumCard
            track={third}
            rank={3}
            accent="rgba(200,130,60,0.85)"
          />
        )}
      </div>
      {fourth && fifth && (
        <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-6">
          <PodiumCard
            track={fourth}
            rank={4}
            accent="rgba(120,120,120,0.8)"
          />
          <PodiumCard
            track={fifth}
            rank={5}
            accent="rgba(120,120,120,0.8)"
          />
        </div>
      )}
    </div>
  );
}