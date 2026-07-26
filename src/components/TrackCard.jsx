import { useEffect, useState } from "react";
import { Play, Pause, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { base44 } from "@/api/base44Client";

const albumCoverCache = new Map();

export default function TrackCard({ track }) {
  const p = usePlayer();
  const isCurrent = p.currentTrack?.id === track.id;
  const [albumCover, setAlbumCover] = useState(
    track.album_id ? albumCoverCache.get(track.album_id) : undefined
  );

  useEffect(() => {
    if (track.cover_art_url || !track.album_id) return;
    const cached = albumCoverCache.get(track.album_id);
    if (cached !== undefined) {
      setAlbumCover(cached);
      return;
    }
    let alive = true;
    base44.entities.Album
      .get(track.album_id)
      .then((al) => {
        if (!alive) return;
        const url = al?.cover_art_url || "";
        albumCoverCache.set(track.album_id, url);
        setAlbumCover(url);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [track.album_id, track.cover_art_url]);

  const coverUrl = track.cover_art_url || albumCover;
  const isRecent =
  track.created_date &&
  Date.now() - new Date(track.created_date).getTime() < 7 * 86400 * 1000;
  const isTrending = (track.play_count || 0) > 30;
  return (
    <div
      className="group rounded-xl p-3 hover:bg-foreground/[0.03] transition cursor-pointer relative"
      onClick={() => p.playTrackAt([track])}>
      
      <div className="relative aspect-square rounded-lg overflow-hidden bg-foreground/10 mb-3">
        {coverUrl ?
        <img
          src={coverUrl}
          alt=""
          className={`w-full h-full object-cover transition ${
          isCurrent ? "" : "group-hover:scale-[1.03]"}`
          } /> :


        <div className="w-full h-full grid place-items-center text-foreground/30 text-xs font-medium">
            {track.genre}
          </div>
        }
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrent) p.togglePlay();else
            p.playTrackAt([track]);
          }}
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
          aria-label="Play track">
          
          {isCurrent && p.isPlaying ?
          <Pause size={18} /> :

          <Play size={18} />
          }
        </button>
      </div>
      <Link
        to={`/track/${track.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block">
        
        <div className="font-semibold truncate text-sm flex items-center gap-1.5">
          <span className="truncate">{track.title}</span>
          {track.explicit &&
          <span className="shrink-0 text-[9px] font-extrabold px-1 py-0.5 rounded bg-foreground/15 text-foreground/70">
              E
            </span>
          }
        </div>
        <div className="text-xs text-foreground/50 truncate flex items-center gap-1.5">
          <span className="truncate">{track.artist || track.uploader_name || "Unknown"}</span>
          



          
          {!isTrending && isRecent &&
          <span className="shrink-0 inline-flex text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-700">NEW</span>
          }
        </div>
      </Link>
    </div>);

}