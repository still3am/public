import { useState } from "react";
import {
  Play,
  Pause,
  MoreHorizontal,
  Flag,
  Download,
  Flame,
  Loader2,
  Trash2,
  EyeOff,
  Plus,
  Check } from
"lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime, timeAgo } from "@/lib/audio-utils";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import ArtistLinks from "@/components/ArtistLinks";

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
  showArt = true,
  albumArtist,
  albumCover
}) {
  const p = usePlayer();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();
  const [menuOpen, setMenuOpen] = useState(false);
  const [libBusy, setLibBusy] = useState(false);
  const inLib = isInLibrary(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isPlayingHere = isCurrent && p.isPlaying;
  const savedOffline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isAdmin = user?.role === "admin";
  const isRecent =
  track.created_date &&
  Date.now() - new Date(track.created_date).getTime() < 7 * 86400 * 1000;
  const isTrending = (track.play_count || 0) > 30;

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
          src={track.cover_art_url || albumCover}
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
          
            <div className="absolute right-0 top-full z-20 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px]">
              <MenuBtn
              icon={libBusy ? Loader2 : inLib ? Check : Plus}
              label={libBusy ? "Saving…" : inLib ? "Remove from library" : "Add to library"}
              danger={!libBusy && inLib}
              onClick={async () => {
                setMenuOpen(false);
                setLibBusy(true);
                try {
                  await toggle(track);
                } finally {
                  setLibBusy(false);
                }
              }} />

              <MenuBtn
              icon={savingOffline ? Loader2 : savedOffline ? Trash2 : Download}
              label={savingOffline ? "Saving…" : savedOffline ? "Remove offline" : "Save offline"}
              onClick={async () => {
                setMenuOpen(false);
                if (savedOffline) {
                  await cache.removeTrack(track.id);
                  toast({ title: "Removed from downloads" });
                } else {
                  const ok = await cache.downloadTrack(track);
                  toast(
                    ok ?
                    { title: "Saved for offline" } :
                    { title: "Couldn't save offline", variant: "destructive" }
                  );
                }
              }} />

              {track.is_downloadable &&
            <MenuBtn
              icon={Download}
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
              {isAdmin && track.is_published &&
            <MenuBtn
              icon={EyeOff}
              label="Remove from PUBLIC"
              danger
              onClick={async () => {
                if (!window.confirm("Remove this track from PUBLIC? It stays in the uploader's library and profile.")) return;
                setMenuOpen(false);
                try {
                  await base44.entities.Track.update(track.id, {
                    is_published: false,
                    approval_status: "rejected"
                  });
                  toast({ title: "Removed from PUBLIC" });
                } catch {
                  toast({ title: "Couldn't remove track", variant: "destructive" });
                }
              }} />

            }
            </div>
          </>
        }
      </div>
    </div>);

}