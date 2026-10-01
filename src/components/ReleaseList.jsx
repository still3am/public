import { Link } from "react-router-dom";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import TrackOptionsMenu from "@/components/TrackOptionsMenu";

function ReleaseRow({ track, tracks, index }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;

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
        <span className="absolute inset-0 grid place-items-center bg-media/35 opacity-0 group-hover:opacity-100 transition">
          {isPlayingHere ? (
            <Pause size={18} className="text-media-foreground" />
          ) : (
            <Play size={18} className="text-media-foreground" fill="currentColor" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <Link to={`/track/${track.id}`} className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] md:text-[15px] font-bold truncate text-foreground">
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

      <TrackOptionsMenu track={track} onPlay={playHere} showGoToTrack />
    </div>
  );
}

export default function ReleaseList({ tracks }) {
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
            />
          ))}
        </div>
      ))}
    </div>
  );
}