import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import EditTrackModal from "@/components/EditTrackModal";
import BackHeader from "@/components/BackHeader";
import {
  Loader2,
  Play,
  Pause,
  Heart,
  Download,
  Flag,
  Shield,
  Pencil,
  Music2,
  Share2,
  Disc,
  Music } from
"lucide-react";
import TrackRow from "@/components/TrackRow";

export default function TrackDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploader, setUploader] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [album, setAlbum] = useState(null);
  const [moreTracks, setMoreTracks] = useState([]);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Track.get(id).catch(() => null);
      setTrack(t);
      if (t?.uploader_id) {
        const u = await base44.entities.User
          .get(t.uploader_id)
          .catch(() => null);
        setUploader(u);
      }
      if (t?.album_id) {
        base44.entities.Album
          .get(t.album_id)
          .then(setAlbum)
          .catch(() => setAlbum(null));
      } else {
        setAlbum(null);
      }
      if (t?.artist) {
        const all = await base44.entities.Track
          .list("-play_count", 50)
          .catch(() => []);
        const lc = t.artist.toLowerCase();
        setMoreTracks(
          all.filter(
            (x) =>
              x.id !== t.id &&
              (x.artist || "").toLowerCase() === lc &&
              x.is_published !== false
          ).slice(0, 6)
        );
      } else {
        setMoreTracks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function shareLink() {
    if (!track) return;
    navigator.clipboard
      ?.writeText(`${window.location.origin}/track/${track.id}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function report() {
    const reason = window.prompt("What's wrong with this track?");
    if (!reason || !track) return;
    setReporting(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        track_id: track.id,
        reason
      });
      alert("Thanks — a report was sent to the PUBLIC admin team.");
    } catch {
      alert("Could not submit report. Try again later.");
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }
  if (!track) return <EmptyState title="Track not found" />;

  const liked = likes.likedIds.has(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isOwner = track.uploader_id === user?.id;

  return (
    <div className="max-w-2xl mx-auto">
      <BackHeader title="Track" />

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-foreground/10 shrink-0">
          {track.cover_art_url &&
          <img
            src={track.cover_art_url}
            alt=""
            className="w-full h-full object-cover" />

          }
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to="/discover"
            state={{ initialGenre: track.genre }}
            className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-1 hover:underline inline-block"
          >
            {track.genre}
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {track.title}
            </h1>
            {track.explicit &&
            <span className="px-1.5 py-0.5 rounded bg-foreground/15 text-xs font-extrabold">
                E
              </span>
            }
          </div>
          {(track.artist || uploader) &&
          <div className="text-sm text-foreground/60 mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {track.artist &&
            <span className="font-semibold text-foreground/80">{track.artist}</span>
            }
              {track.artist && uploader &&
            <span className="text-foreground/40">· uploaded by</span>
            }
              {uploader &&
            <Link
              to={`/profile/${uploader.id}`}
              className="hover:underline inline-flex items-center gap-1.5">
              
                  {uploader.avatar_url ?
              <img
                src={uploader.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full object-cover" /> :


              <div className="w-5 h-5 rounded-full bg-foreground/10 grid place-items-center text-[9px] font-semibold">
                      {(uploader.display_name || uploader.email || "?").charAt(0)}
                    </div>
              }
                  {uploader.display_name || uploader.full_name || "Unknown"}
                  
                </Link>
            }
            </div>
          }
          <div className="text-xs text-foreground/40 mt-2">
            {track.play_count || 0} plays · {track.like_count || 0} likes
          </div>
          {track.description &&
          <p className="text-sm text-foreground/70 mt-3">
              {track.description}
            </p>
          }

          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button
              onClick={() => {
                if (isCurrent) p.togglePlay();else
                p.playTrackAt([track]);
              }}
              className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition">
              
              {isCurrent && p.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isCurrent && p.isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => likes.toggleLike(track)}
              className="p-2.5 rounded-full border border-border"
              aria-label="Like">
              
              <Heart
                size={18}
                className={liked ? "fill-red-500 text-red-500" : ""} />
              
            </button>
            <button
              onClick={() => ap.addToPlaylist(track.id)}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold">
              
              Add to playlist
            </button>
            <button
              onClick={() => p.playNext(track)}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold">
              
              Play next
            </button>
            <button
              onClick={() => p.addToQueue(track)}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold">
              
              Add to queue
            </button>
            <button
              onClick={shareLink}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold flex items-center gap-1.5">
              
              <Share2 size={14} /> {copied ? "Copied!" : "Share"}
            </button>
            {track.is_downloadable &&
            <a
              href={track.audio_url}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full border border-border"
              aria-label="Download">
              
                <Download size={18} />
              </a>
            }
            {isOwner &&
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold flex items-center gap-1.5"
              aria-label="Edit">
              
                <Pencil size={14} /> Edit
              </button>
            }
            {track.uploader_id !== user?.id &&
            <button
              onClick={report}
              disabled={reporting}
              className="p-2.5 rounded-full border border-border text-foreground/50 hover:text-red-500"
              aria-label="Report">
              
                {reporting ?
              <Loader2 size={18} className="animate-spin" /> :

              <Flag size={18} />
              }
              </button>
            }
          </div>
        </div>
      </div>

      {track.lyrics_text && track.lyrics_text.trim() &&
      <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Music2 size={18} /> Lyrics
          </h2>
          <div className="whitespace-pre-line text-sm text-foreground/70 leading-relaxed max-h-96 overflow-y-auto px-1">
            {track.lyrics_text}
          </div>
        </div>
      }

      {album &&
      <Link
        to={`/album/${album.id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition mb-6">
        
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 grid place-items-center text-foreground/40 shrink-0">
            {album.cover_art_url ?
            <img src={album.cover_art_url} alt="" className="w-full h-full object-cover" /> :

            <Disc size={20} />
            }
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-0.5">
              Part of album
            </div>
            <div className="text-sm font-semibold truncate">{album.title}</div>
          </div>
        </Link>
      }

      {moreTracks.length > 0 &&
      <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Music size={18} /> More from {track.artist}
          </h2>
          <div className="space-y-0.5">
            {moreTracks.map((t, i) =>
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            liked={likes.likedIds.has(t.id)}
            onLikeToggle={likes.toggleLike}
            onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)} />

          )}
          </div>
        </div>
      }

      {editing &&
      <EditTrackModal
        track={track}
        onClose={() => setEditing(false)}
        onSaved={(updated) => setTrack((prev) => ({ ...prev, ...updated }))}
        onDeleted={() => nav("/profile", { replace: true })} />

      }
      {ap.modal}
    </div>);

}