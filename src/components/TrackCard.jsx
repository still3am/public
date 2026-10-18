import OverflowText from "@/components/OverflowText";
import {useLongPressMenu} from "@/hooks/useLongPressMenu";
import { Play, Check } from "lucide-react";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";

/** @param {any} props */
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

/** @param {any} props */
export default function TrackCard({ track, selectable = false, selected = false, onToggleSelect, queue, queueIndex }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingNow = isCurrent && p.isPlaying;

  const coverUrl = useCoverUrl(track.cover_art_url);

  const lp=useLongPressMenu(selectable,{allowButtons:true});

  const handlePlay = (e) => {
    e.stopPropagation();
    if (lp.consumeLongPress()) {
      return;
    }
    if (isCurrent) p.togglePlay();
    else{const list=queue?.length?queue:[track],index=Number.isInteger(queueIndex)&&list[queueIndex]?.id===track.id?queueIndex:list.findIndex(row=>row.id===track.id);p.playTrackAt(list,Math.max(0,index));}
  };

  return (
    <div
      ref={lp.ref} {...lp.handlers}
      role={selectable?"checkbox":"group"} tabIndex={selectable?0:undefined} aria-checked={selectable?selected:undefined} aria-label={selectable?`Select ${track.title||"song"}`:undefined}
      onKeyDown={event=>{if(selectable&&event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();onToggleSelect?.(track);}}}
      onClick={selectable ? () => onToggleSelect?.(track) : handlePlay}
      className={`music-card song-menu-surface group relative rounded-2xl p-2 sm:p-2.5 transition-all duration-300 cursor-pointer
        hover:bg-foreground/[0.04] active:scale-[0.98]
        ${selectable && selected ? "bg-accent ring-1 ring-foreground/40" : ""}
        ${isCurrent ? "bg-foreground/[0.03]" : ""}`}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-3 shadow-sm ring-1 ring-inset ring-foreground/5">
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
            aria-label={`Play ${track.title || "song"}`}
            style={{minHeight:0}}
            className={`absolute bottom-2 right-2 w-8 h-8 md:bottom-2.5 md:right-2.5 md:w-12 md:h-12 min-h-0 rounded-full grid place-items-center shadow-xl
              transition-all duration-300 active:scale-90 bg-foreground text-background
              opacity-0 pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 hover:scale-105 motion-reduce:transition-none`}
          >
            <Play size={18} fill="currentColor" className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] ml-0.5" />
          </button>
        )}

        {!selectable && isPlayingNow && (
          <div className="absolute bottom-2 right-2 w-8 h-8 md:bottom-2.5 md:right-2.5 md:w-12 md:h-12 rounded-full bg-background/85 backdrop-blur grid place-items-center text-foreground shadow-xl">
            <EqualizerBars active={isPlayingNow} />
          </div>
        )}

        {!selectable && (
          <div
            className="song-menu-reveal absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}>
            <TrackOptionsMenu
              track={track}
              size={17}
              openSignal={lp.signal}
              anchorRef={lp.ref}
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
          onClick={event=>{event.stopPropagation();if(lp.consumeLongPress())event.preventDefault();}}
          className="block"
        >
          <TrackCardMeta track={track} isCurrent={isCurrent} />
        </Link>
      )}
    </div>
  );
}

/** @param {any} props */
function TrackCardMeta({ track, isCurrent }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className={`truncate text-[13px] sm:text-sm font-semibold leading-5 ${isCurrent ? "text-foreground" : ""}`}>
          <OverflowText text={track.title}/>
        </span>
        {track.explicit && (
          <span className="shrink-0 text-[8px] font-extrabold rounded bg-foreground/15 text-foreground/60 px-1 leading-none py-[1px]">
            E
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-1">
        <OverflowText text={track.artist || track.uploader_name || "Unknown"}/>
      </div>
    </>
  );
}