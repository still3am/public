import { useState } from "react";
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  Plus,
  ListPlus,
  ListMusic,
  Flag,
  Link2,
  Flame } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime, timeAgo } from "@/lib/audio-utils";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

function MenuBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/[0.04] text-left ${
      danger ? "text-red-600" : ""}`
      }>
      
      <Icon size={14} /> {label}
    </button>);

}

export default function TrackRow({
  track,
  index,
  liked,
  onLikeToggle,
  onAddToPlaylist,
  onReport,
  showArt = true
}) {
  const p = usePlayer();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const isRecent =
  track.created_date &&
  Date.now() - new Date(track.created_date).getTime() < 7 * 86400 * 1000;
  const isTrending = (track.play_count || 0) > 30;

  return (
    <div
      className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.03] transition"
      onDoubleClick={() => p.playTrackAt([track])}>
      
      <div className="w-6 text-center text-sm shrink-0">
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
      <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0">
          {track.cover_art_url &&
        <img
          src={track.cover_art_url}
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
        {track.artist ? (
          <span className="text-xs text-foreground/50 truncate">{track.artist}</span>
        ) : (
          <Link
            to={`/profile/${track.uploader_id}`}
            className="text-xs text-foreground/50 truncate hover:underline">
            {track.uploader_name || "Unknown"}
          </Link>
        )}
      </div>
      {track.explicit &&
      <span className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-foreground/15 text-foreground/70 shrink-0">
          E
        </span>
      }
      {isTrending &&
      <span className="hidden md:inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 shrink-0">
          <Flame size={10} /> Top
        </span>
      }
      

      
      {track.genre &&
      <Link
        to="/discover"
        state={{ initialGenre: track.genre }}
        className="hidden md:block text-xs text-foreground/40 px-2 py-0.5 rounded-full bg-foreground/[0.04] hover:bg-foreground/10 hover:text-foreground/70 transition">
        
          {track.genre}
        </Link>
      }
      <button
        onClick={() => onLikeToggle?.(track)}
        className="p-2 rounded-full hover:bg-foreground/5"
        aria-label="Like">
        
        <Heart
          size={16}
          className={liked ? "fill-red-500 text-red-500" : "text-foreground/50"} />
        
      </button>
      {track.created_date &&
      <div className="hidden lg:block text-[11px] text-foreground/40 w-14 text-right">
          {timeAgo(track.created_date)}
        </div>
      }
      <div className="hidden md:block text-xs text-foreground/40 w-10 text-right">
        {formatTime(track.duration_seconds)}
      </div>
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-full hover:bg-foreground/5"
          aria-label="More">
          
          <MoreHorizontal size={16} />
        </button>
        {menuOpen &&
        <>
            <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)} />
          
            <div className="absolute right-0 top-full z-20 mt-1 bg-white border border-border rounded-lg shadow-xl py-1 min-w-[200px]">
              <MenuBtn
              icon={Link2}
              label="Copy link"
              onClick={() => {
                const url = `${window.location.origin}/track/${track.id}`;
                navigator.clipboard?.writeText(url);
                setMenuOpen(false);
              }} />
            
              {onAddToPlaylist &&
            <MenuBtn
              icon={Plus}
              label="Add to playlist"
              onClick={() => {
                onAddToPlaylist(track);
                setMenuOpen(false);
              }} />

            }
              <MenuBtn
              icon={ListPlus}
              label="Play next"
              onClick={() => {
                p.playNext?.(track);
                setMenuOpen(false);
              }} />

              <MenuBtn
              icon={ListMusic}
              label="Add to queue"
              onClick={() => {
                p.addToQueue?.(track);
                setMenuOpen(false);
              }} />
              <MenuBtn
              icon={Heart}
              label={liked ? "Remove from liked" : "Like"}
              onClick={() => {
                onLikeToggle?.(track);
                setMenuOpen(false);
              }} />
            
              {track.is_downloadable &&
            <MenuBtn
              icon={ListPlus}
              label="Download"
              onClick={() => {
                window.open(track.audio_url, "_blank");
                setMenuOpen(false);
              }} />

            }
              {onReport && track.uploader_id !== user?.id &&
            <MenuBtn
              icon={Flag}
              label="Report"
              danger
              onClick={() => {
                onReport(track);
                setMenuOpen(false);
              }} />

            }
            </div>
          </>
        }
      </div>
    </div>);

}