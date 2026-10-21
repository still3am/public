import ScrollShelf from "@/components/ScrollShelf";
import {useLongPressMenu} from '@/hooks/useLongPressMenu';
import { Link } from "react-router-dom";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";

/** @param {any} props */
function ReleaseRow({ track, tracks, index }) {
  const p = usePlayer();
  const lp=useLongPressMenu(false,{allowButtons:true});
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const playHere = () => p.playTrackAt(tracks, index);
  const artistName = track.artist || track.uploader_name || "Unknown";

  return (
    <div ref={lp.ref} {...lp.handlers} onClickCapture={event=>{if(!event.currentTarget.contains(event.target instanceof Node ? event.target : null))return;if(lp.consumeLongPress()){event.preventDefault();event.stopPropagation();}}} className="song-menu-surface group flex items-center gap-3 md:gap-4 px-3 py-3 rounded-xl hover:bg-foreground/[0.04] active:scale-[0.99] transition">
      <button
        onClick={() => (isCurrent ? p.togglePlay() : playHere())}
        className="relative shrink-0"
        aria-label={isPlayingHere ? "Pause "+track.title : "Play "+track.title}>
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden bg-foreground/10">
          {track.cover_art_url ? (
            <Image src={track.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
          ) : (
            <div className="w-full h-full grid place-items-center text-foreground/30 text-[9px] font-bold text-center px-1">
              {track.genre}
            </div>
          )}
        </div>
        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
          {isPlayingHere ? (
            <Pause size={18} className="text-white" />
          ) : (
            <Play size={18} className="text-white" fill="currentColor" />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <Link to={`/track/${track.id}`} className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm md:text-[15px] font-semibold truncate text-foreground">
            {track.title}
          </span>
          {track.explicit && (
            <span className="text-[8px] md:text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 leading-none px-1 py-0.5 shrink-0">
              E
            </span>
          )}
        </Link>
        <div className="text-xs md:text-[13px] text-muted-foreground truncate mt-0.5">
          {artistName}
        </div>
      </div>

      <TrackOptionsMenu track={track} size={17} className="song-menu-reveal" openSignal={lp.signal} anchorRef={lp.ref}/>
    </div>
  );
}

/** @param {any} props */
export default function ReleaseList({ tracks }) {
  if (!tracks?.length) return null;
  const chunks = [];
  for (let i = 0; i < tracks.length; i += 4) {
    chunks.push(tracks.slice(i, i + 4));
  }
  return (
    <ScrollShelf label="New releases" className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory overscroll-x-contain pb-2 -mx-4 px-4 sm:-mx-5 sm:px-5 md:mx-0 md:px-0">
      {chunks.map((group, gi) => (
        <div
          key={gi}
          className="snap-start shrink-0 w-[88%] sm:w-[calc(50%-0.375rem)] md:w-[340px] lg:w-[360px] rounded-2xl border border-border/60 bg-card/60 p-1 divide-y divide-foreground/[0.05]">
          {group.map((t, i) => (
            <ReleaseRow key={t.id} track={t} tracks={tracks} index={gi * 4 + i} />
          ))}
        </div>
      ))}
    </ScrollShelf>
  );
}