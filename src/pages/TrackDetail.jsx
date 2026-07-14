import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import {
  Loader2,
  Play,
  Pause,
  Heart,
  Download,
  Flag,
  Shield,
  ArrowLeft,
} from "lucide-react";

export default function TrackDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploader, setUploader] = useState(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const t = await base44.entities.Track.get(id).catch(() => null);
        setTrack(t);
        if (t?.uploader_id) {
          const u = await base44.entities.User.get(t.uploader_id).catch(() => null);
          setUploader(u);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function report() {
    const reason = window.prompt("What's wrong with this track?");
    if (!reason || !track) return;
    setReporting(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        track_id: track.id,
        reason,
      });
      alert("Thanks — a report was sent to the PUBLIC admin team.");
    } catch {
      alert("Could not submit report. Try again later.");
    } finally {
      setReporting(false);
    }
  }

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!track) return <EmptyState title="Track not found" />;

  const liked = likes.likedIds.has(track.id);
  const isCurrent = p.currentTrack?.id === track.id;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-6"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-foreground/10 shrink-0">
          {track.cover_art_url && (
            <img
              src={track.cover_art_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-1">
            {track.genre}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            {track.title}
          </h1>
          {uploader && (
            <Link
              to={`/profile/${uploader.id}`}
              className="text-sm text-foreground/70 hover:underline flex items-center gap-2"
            >
              {uploader.avatar_url ? (
                <img
                  src={uploader.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-foreground/10 grid place-items-center text-[10px] font-semibold">
                  {(uploader.display_name || uploader.email || "?").charAt(0)}
                </div>
              )}
              {uploader.display_name || uploader.full_name || "Unknown"}
              {uploader.is_verified && <Shield size={12} />}
            </Link>
          )}
          <div className="text-xs text-foreground/40 mt-2">
            {track.play_count || 0} plays · {track.like_count || 0} likes
          </div>
          {track.description && (
            <p className="text-sm text-foreground/70 mt-3">{track.description}</p>
          )}

          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => {
                if (isCurrent) p.togglePlay();
                else p.playTrackAt([track]);
              }}
              className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition"
            >
              {isCurrent && p.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isCurrent && p.isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => likes.toggleLike(track)}
              className="p-2.5 rounded-full border border-border"
              aria-label="Like"
            >
              <Heart
                size={18}
                className={liked ? "fill-red-500 text-red-500" : ""}
              />
            </button>
            <button
              onClick={() => ap.addToPlaylist(track.id)}
              className="px-3 py-2.5 rounded-full border border-border text-sm font-semibold"
            >
              Add to playlist
            </button>
            {track.is_downloadable && (
              <a
                href={track.audio_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-full border border-border"
                aria-label="Download"
              >
                <Download size={18} />
              </a>
            )}
            {track.uploader_id !== user?.id && (
              <button
                onClick={report}
                disabled={reporting}
                className="p-2.5 rounded-full border border-border text-foreground/50 hover:text-red-500"
                aria-label="Report"
              >
                {reporting ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
      {ap.modal}
    </div>
  );
}