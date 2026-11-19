import {useLongPressMenu} from "@/hooks/useLongPressMenu";
import { Play, Pause, Check, Music2 } from "lucide-react";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";

/** @param {any} props */
export default function TrackCard({ track, selectable = false, selected = false, onToggleSelect, queue, queueIndex }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingNow = isCurrent && p.isPlaying;
  const coverUrl = useCoverUrl(track.cover_art_url);
  const lp = useLongPressMenu(selectable, {allowButtons:true});
  const handlePlay = event => {
    event.stopPropagation();
    if (lp.consumeLongPress()) return;
    if (isCurrent) p.togglePlay();
    else {
      const list = queue?.length ? queue : [track];
      const index = Number.isInteger(queueIndex) && list[queueIndex]?.id === track.id ? queueIndex : list.findIndex(row => row.id === track.id);
      p.playTrackAt(list, Math.max(0,index));
    }
  };
  return <div ref={lp.ref} {...lp.handlers}
    role={selectable ? "checkbox" : "group"} tabIndex={selectable ? 0 : undefined}
    aria-checked={selectable ? selected : undefined}
    aria-label={selectable ? `Select ${track.title || "song"}` : undefined}
    data-current={isCurrent} data-selected={selectable && selected}
    onKeyDown={event => {if (selectable && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {event.preventDefault();onToggleSelect?.(track);}}}
    onClick={selectable ? () => onToggleSelect?.(track) : handlePlay}
    className="music-card public-song-card song-menu-surface group">
    <div className="public-song-art">
      {coverUrl ? <Image src={coverUrl} fittingType="fill" alt="" className="public-song-image" /> :
        <div className="public-song-art-fallback"><Music2 size={32} />{track.genre && <span>{track.genre}</span>}</div>}
      <div className="public-song-art-shade" aria-hidden="true" />
      {selectable ? <span className="public-song-selection" data-selected={selected} aria-hidden="true">{selected && <Check size={16} />}</span> : <>
        {isPlayingNow && <span className="public-song-playing" aria-label="Playing"><i /><i /><i /></span>}
        <button type="button" className="public-song-play" onClick={handlePlay} aria-label={`${isPlayingNow ? "Pause" : "Play"} ${track.title || "song"}`}>
          {isPlayingNow ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <div className="public-song-menu" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
          <TrackOptionsMenu track={track} size={18} openSignal={lp.signal} anchorRef={lp.ref} buttonClassName="public-song-menu-button" />
        </div>
      </>}
    </div>
    {selectable ? <div className="public-song-copy"><CardMeta track={track} /></div> :
      <Link to={`/track/${track.id}`} className="public-song-copy" onClick={event => {event.stopPropagation();if (lp.consumeLongPress()) event.preventDefault();}}><CardMeta track={track} /></Link>}
  </div>;
}

function CardMeta({track}) {
  return <>
    <div className="public-song-title-line"><span className="public-song-title">{track.title || "Untitled song"}</span>
      {track.explicit && <span className="public-song-explicit" aria-label="Explicit">E</span>}
    </div>
    <span className="public-song-artist">{track.artist || track.uploader_name || "Unknown artist"}</span>
  </>;
}
