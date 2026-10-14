import {useLongPressMenu} from '@/hooks/useLongPressMenu';
import { Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime, timeAgo } from "@/lib/audio-utils";
import ArtistLinks from "@/components/ArtistLinks";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";

/** @param {any} props */
export default function TrackRow({
  track,
  index,
  showArt = true,
  albumArtist,
  albumCover,
  queue,
  queueIndex,
}) {
  const p = usePlayer();
  const lp=useLongPressMenu(false,{allowButtons:true});
  const play=()=>{
    const list=queue?.length?queue:[track];
    const position=Number.isInteger(queueIndex)&&list[queueIndex]?.id===track.id?queueIndex:list.findIndex(row=>row.id===track.id);
    p.playTrackAt(list,Math.max(0,position));
  };
  const isCurrent = p.currentTrack?.id === track.id;
  const coverUrl = useCoverUrl(track.cover_art_url || albumCover);

  return (
    <div
      ref={lp.ref} {...lp.handlers} onClickCapture={event=>{if(lp.consumeLongPress()){event.preventDefault();event.stopPropagation();}}}
      className="song-row song-menu-surface group flex items-center gap-3 sm:gap-4 px-2.5 sm:px-3 py-3 rounded-xl hover:bg-foreground/[0.04] transition"
      onDoubleClick={event=>{if(event.target instanceof Element&&event.target.closest("a,button,input,select,textarea"))return;play();}}
    >
      <button type="button"
        className={`${showArt?"hidden md:grid":"grid"} place-items-center w-8 h-11 text-sm font-medium text-muted-foreground shrink-0`}
        aria-label={isCurrent&&p.isPlaying?`Pause ${track.title}`:`Play ${track.title}`}
        onClick={()=>isCurrent?p.togglePlay():play()} onDoubleClick={e=>e.stopPropagation()}>
        {isCurrent ? (p.isPlaying?<Pause size={15}/>:<Play size={15}/>) :
          <><span className="hidden md:block md:group-hover:hidden">{index!=null?index+1:""}</span><Play size={15} className="md:hidden md:group-hover:block"/></>}
      </button>

      {showArt && (
        <button type="button"
          onClick={()=>isCurrent?p.togglePlay():play()} onDoubleClick={e=>e.stopPropagation()}
          aria-label={isCurrent&&p.isPlaying?`Pause ${track.title}`:`Play ${track.title}`}
          className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 grid place-items-center">
          {coverUrl&&<img src={coverUrl} alt="" loading="lazy" className="w-full h-full object-cover"/>}
          <span className="absolute bottom-1 right-1 rounded-full bg-black/75 text-white p-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            {isCurrent&&p.isPlaying?<Pause size={12}/>:<Play size={12} fill="currentColor"/>}
          </span>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <Link
          title={track.title}
          to={`/track/${track.id}`}
          className={`text-sm font-medium truncate block ${isCurrent ? "text-foreground" : ""}`}
        >
          {track.title}
        </Link>
        {(() => {
          const artist = albumArtist || track.artist;
          if (artist) {
            return (
              <ArtistLinks artist={artist} linkClassName="text-foreground/50 hover:underline" />
            );
          }
          return (
            <Link
              to={`/profile/${track.uploader_id}`}
              className="text-xs text-foreground/50 truncate hover:underline"
            >
              {track.uploader_name || "Unknown"}
            </Link>
          );
        })()}
      </div>

      {track.explicit && (
        <span className="text-[9px] font-extrabold rounded bg-foreground/15 text-foreground/70 shrink-0 px-1">
          E
        </span>
      )}

      {track.genre && (
        <span title={track.genre} className="hidden md:block max-w-[9rem] truncate text-xs text-foreground/45 px-2.5 py-1 rounded-full bg-foreground/[0.05] shrink-0">
          {track.genre}
        </span>
      )}

      {track.created_date && (
        <div className="hidden lg:block text-[11px] text-foreground/40 w-16 text-right shrink-0">
          {timeAgo(track.created_date)}
        </div>
      )}

      <div className="hidden md:block text-xs text-foreground/40 w-12 text-right tabular-nums shrink-0">
        {formatTime(track.duration_seconds)}
      </div>

      <TrackOptionsMenu track={track} className="song-menu-reveal" openSignal={lp.signal} anchorRef={lp.ref}/>
    </div>
  );
}