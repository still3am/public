import { Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime, timeAgo } from "@/lib/audio-utils";
import ArtistLinks from "@/components/ArtistLinks";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";

export default function TrackRow({
  track,
  index,
  showArt = true,
  albumArtist,
  albumCover
}) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const coverUrl = useCoverUrl(track.cover_art_url || albumCover);

  return (
    <div
      className="group flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-foreground/[0.04] transition"
      onDoubleClick={() => p.playTrackAt([track])}>
      
      <div className="w-6 text-center text-sm font-medium text-foreground/40 shrink-0">
        {isCurrent && p.isPlaying ?
        <Pause
          size={14}
          className="inline-block cursor-pointer text-foreground"
          onClick={() => p.togglePlay()} /> :

        isCurrent ?
        <Play
          size={14}
          className="inline-block cursor-pointer text-foreground"
          onClick={() => p.togglePlay()} /> :


        <>
            <span className="group-hover:hidden text-foreground/40">
              {index != null ? index + 1 : ""}
            </span>
            <Play
            size={14}
            className="hidden group-hover:inline-block cursor-pointer"
            onClick={() => p.playTrackAt([track])} />
          
          </>
        }
      </div>
      {showArt &&
      <div className="w-10 h-10 rounded-md overflow-hidden bg-foreground/10 shrink-0">
          {(track.cover_art_url || albumCover) &&
        <img
          src={coverUrl}
          alt=""
          className="w-full h-full object-cover" />

        }
        </div>
      }
      <div className="min-w-0 flex-1">
        <Link
          to={`/track/${track.id}`}
          className={`text-sm font-medium truncate block ${
          isCurrent ? "text-foreground" : ""}`
          }>
          
          {track.title}
        </Link>
        {(() => {
          const artist = albumArtist || track.artist;
          if (artist) {
            return (
              <ArtistLinks
                artist={artist}
                linkClassName="text-foreground/50 hover:underline" />);

          }
          return (
            <Link
              to={`/profile/${track.uploader_id}`}
              className="text-xs text-foreground/50 truncate hover:underline">
              {track.uploader_name || "Unknown"}
            </Link>);

        })()}
      </div>
      {track.explicit &&
      <span className="text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 shrink-0 px-1">E

      </span>
      }
      {track.genre &&
      <span className="hidden md:block text-xs text-foreground/45 px-2.5 py-1 rounded-full bg-foreground/[0.05] shrink-0">
          {track.genre}
        </span>
      }
      {track.created_date &&
      <div className="hidden lg:block text-[11px] text-foreground/40 w-16 text-right shrink-0">
          {timeAgo(track.created_date)}
        </div>
      }
      <div className="hidden md:block text-xs text-foreground/40 w-12 text-right tabular-nums shrink-0">
        {formatTime(track.duration_seconds)}
      </div>
      <TrackOptionsMenu track={track} />
    </div>);

}