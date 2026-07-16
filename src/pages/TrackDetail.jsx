import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import { usePlayer } from "@/context/PlayerContext";
import EmptyState from "@/components/EmptyState";
import EditTrackModal from "@/components/EditTrackModal";
import AddToAlbumModal from "@/components/AddToAlbumModal";
import BackHeader from "@/components/BackHeader";
import {
  Loader2,
  Play,
  Pause,
  Heart,
  Download,
  Flag,
  Pencil,
  Music2,
  Share2,
  Disc,
  Music,
  Plus,
  ListPlus,
  ListMusic,
  Link2,
} from "lucide-react";
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
  const [addToAlbum, setAddToAlbum] = useState(false);
  const [album, setAlbum] = useState(null);
  const [moreTracks, setMoreTracks] = useState([]);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        const all = await base44.entities.Track.list("-play_count", 50).catch(
          () => []
        );
        const lc = t.artist.toLowerCase();
        setMoreTracks(
          all
            .filter(
              (x) =>
                x.id !== t.id &&
                (x.artist || "").toLowerCase() === lc &&
                x.is_published !== false
            )
            .slice(0, 6)
        );
      } else {
        setMoreTracks([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function shareLink() {
    if (!track) return;
    navigator.clipboard
      ?.writeText(`${window.location.origin}/track/${track.id}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        setMenuOpen(false);
      });
  }

  async function nativeShare() {
    if (!track) return;
    const url = `${window.location.origin}/track/${track.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} on PUBLIC.`, url });
      } catch {}
    } else {
      shareLink();
    }
    setMenuOpen(false);
  }

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
      setMenuOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!track) return <EmptyState title="Track not found" />;

  const liked = likes.likedIds.has(track.id);
  const isCurrent = p.currentTrack?.id === track.id;
  const isOwner = track.uploader_id === user?.id;
  const isPlaying = isCurrent && p.isPlaying;

  const menuItems = [
    {
      icon: ListPlus,
      label: "Play next",
      onClick: () => {
        p.playNext?.(track);
        setMenuOpen(false);
      },
    },
    {
      icon: ListMusic,
      label: "Add to queue",
      onClick: () => {
        p.addToQueue?.(track);
        setMenuOpen(false);
      },
    },
    {
      icon: ListPlus,
      label: "Add to playlist",
      onClick: () => {
        ap.addToPlaylist(track.id);
        setMenuOpen(false);
      },
    },
  ];
  if (isOwner)
    menuItems.push({
      icon: Disc,
      label: "Add to album",
      onClick: () => {
        setAddToAlbum(true);
        setMenuOpen(false);
      },
    });
  menuItems.push({
    icon: Link2,
    label: copied ? "Link copied" : "Copy link",
    onClick: shareLink,
  });
  if (navigator.share)
    menuItems.push({ icon: Share2, label: "Share", onClick: nativeShare });
  if (track.is_downloadable)
    menuItems.push({
      icon: Download,
      label: "Download",
      onClick: () => {
        if (track.audio_url) window.open(track.audio_url, "_blank");
        setMenuOpen(false);
      },
    });
  if (isOwner)
    menuItems.push({
      icon: Pencil,
      label: "Edit track",
      onClick: () => {
        setEditing(true);
        setMenuOpen(false);
      },
    });
  if (!isOwner)
    menuItems.push({
      icon: Flag,
      label: "Report",
      danger: true,
      onClick: report,
    });

  return (
    <div className="max-w-3xl mx-auto">
      <BackHeader title="Track" />

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-border mb-6">
        {track.cover_art_url && (
          <div className="absolute inset-0">
            <img
              src={track.cover_art_url}
              alt=""
              className="w-full h-full object-cover blur-2xl scale-125 opacity-30"
            />
            <div className="absolute inset-0 bg-background/70" />
          </div>
        )}
        <div className="relative p-5 md:p-8 flex flex-col md:flex-row gap-5 md:gap-7">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-foreground/10 shrink-0 shadow-lg ring-1 ring-foreground/10">
            {track.cover_art_url && (
              <img
                src={track.cover_art_url}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <Link
              to="/discover"
              state={{ initialGenre: track.genre }}
              className="self-start text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-semibold mb-2 hover:text-foreground border border-border rounded-full px-3 py-1"
            >
              {track.genre}
            </Link>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                {track.title}
              </h1>
              {track.explicit && (
                <span className="px-1.5 py-0.5 rounded bg-foreground/15 text-[10px] font-extrabold">
                  E
                </span>
              )}
            </div>
            {(track.artist || uploader) && (
              <div className="text-sm text-foreground/60 mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {track.artist && (
                  <span className="font-semibold text-foreground/80">
                    {track.artist}
                  </span>
                )}
                {track.artist && uploader && (
                  <span className="text-foreground/40">· uploaded by</span>
                )}
                {uploader && (
                  <Link
                    to={`/profile/${uploader.id}`}
                    className="hover:underline inline-flex items-center gap-1.5"
                  >
                    {uploader.avatar_url ? (
                      <img
                        src={uploader.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-foreground/10 grid place-items-center text-[9px] font-semibold">
                        {(uploader.display_name || uploader.email || "?").charAt(0)}
                      </div>
                    )}
                    {uploader.display_name || uploader.full_name || "Unknown"}
                  </Link>
                )}
              </div>
            )}
            <div className="text-xs text-foreground/40 mb-3">
              {track.play_count || 0} plays · {track.like_count || 0} likes
            </div>
            {track.description && (
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {track.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => (isCurrent ? p.togglePlay() : p.playTrackAt([track]))}
          className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause" : "Play"}
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
          onClick={shareLink}
          className="p-2.5 rounded-full border border-border"
          aria-label="Share link"
        >
          {copied ? (
            <Link2 size={18} className="text-green-600" />
          ) : (
            <Link2 size={18} />
          )}
        </button>
        <div className="relative shrink-0 ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center hover:scale-105 transition"
            aria-label="More actions"
          >
            <Plus
              size={18}
              className={menuOpen ? "rotate-45 transition-transform" : "transition-transform"}
            />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 bg-popover border border-border rounded-xl shadow-2xl py-1 min-w-[210px]">
                {menuItems.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={i}
                      onClick={m.onClick}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-foreground/[0.04] text-left ${
                        m.danger ? "text-red-600" : ""
                      }`}
                    >
                      <Icon size={15} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {track.lyrics_text && track.lyrics_text.trim() && (
        <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Music2 size={18} /> Lyrics
          </h2>
          <div className="whitespace-pre-line text-sm text-foreground/70 leading-relaxed max-h-96 overflow-y-auto px-1">
            {track.lyrics_text}
          </div>
        </div>
      )}

      {album && (
        <Link
          to={`/album/${album.id}`}
          className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition mb-6"
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 grid place-items-center text-foreground/40 shrink-0">
            {album.cover_art_url ? (
              <img src={album.cover_art_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Disc size={20} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-foreground/50 font-semibold mb-0.5">
              Part of album
            </div>
            <div className="text-sm font-semibold truncate">{album.title}</div>
          </div>
        </Link>
      )}

      {moreTracks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
            <Music size={18} /> More from {track.artist}
          </h2>
          <div className="space-y-0.5">
            {moreTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                liked={likes.likedIds.has(t.id)}
                onLikeToggle={likes.toggleLike}
                onAddToPlaylist={(tk) => ap.addToPlaylist(tk.id)}
              />
            ))}
          </div>
        </div>
      )}

      {editing && (
        <EditTrackModal
          track={track}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setTrack((prev) => ({ ...prev, ...updated }))}
          onDeleted={() => nav("/profile", { replace: true })}
        />
      )}
      {addToAlbum && (
        <AddToAlbumModal
          trackId={track.id}
          currentAlbumId={track.album_id}
          onClose={() => setAddToAlbum(false)}
          onAdded={(alb) => setAlbum(alb)}
        />
      )}
      {ap.modal}
    </div>
  );
}