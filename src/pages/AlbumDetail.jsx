import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import { Image } from "@/components/ui/image";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import { formatTime } from "@/lib/audio-utils";
import { ChevronLeft, Loader2, Play, Disc3 } from "lucide-react";

// Filed under the artist's own running order first, then by upload order for
// anything that never got a track number.
const orderTracks = (list) =>
  [...list].sort((a, b) => {
    const an = a.track_number || 0;
    const bn = b.track_number || 0;
    if (an && bn && an !== bn) return an - bn;
    if (an && !bn) return -1;
    if (!an && bn) return 1;
    return new Date(a.created_date || 0) - new Date(b.created_date || 0);
  });

export default function AlbumDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const p = usePlayer();
  const [album, setAlbum] = useState(undefined); // undefined = loading, null = missing
  const [tracks, setTracks] = useState([]);

  const dropTrack = (trackId) =>
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  useUnpublishedSync(dropTrack);

  async function load() {
    try {
      const a = await base44.entities.Album.get(id).catch(() => null);
      setAlbum(a);
      if (!a) {
        setTracks([]);
        return;
      }
      const rows = await base44.entities.Track
        .filter({ album_id: id, is_published: true }, "created_date", 200)
        .catch(() => []);
      setTracks(orderTracks(Array.isArray(rows) ? rows : []));
    } catch {
      setAlbum(null);
    }
  }

  useEffect(() => {
    setAlbum(undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (album === undefined) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
          <Disc3 size={28} className="text-foreground/40" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mb-1">Release not found</h2>
        <p className="text-sm text-foreground/50">
          This album doesn’t exist or was removed.
        </p>
        <Link
          to="/records"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold mt-5"
        >
          Browse Public Records
        </Link>
      </div>
    );
  }

  const artistHref = album.artist_id
    ? `/records/${album.artist_id}`
    : album.artist_name
      ? `/artist?name=${encodeURIComponent(album.artist_name)}`
      : null;
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-3xl mx-auto pb-10">
        <button
          onClick={() => nav(-1)}
          className="hidden md:inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-foreground/60 hover:text-foreground transition"
        >
          <ChevronLeft size={18} /> Back
        </button>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 md:gap-7 mb-7">
          <div className="w-44 h-44 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-foreground/[0.06] shrink-0 shadow-lg ring-1 ring-foreground/10">
            {album.cover_art_url ? (
              <Image
                src={album.cover_art_url}
                fittingType="fill"
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-foreground/25">
                <Disc3 size={34} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            {album.artist_name &&
              (artistHref ? (
                <Link
                  to={artistHref}
                  className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/55 hover:text-foreground transition"
                >
                  {album.artist_name}
                </Link>
              ) : (
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/55">
                  {album.artist_name}
                </span>
              ))}
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05] mt-1.5">
              {album.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-3">
              <span className="chip">{album.genre}</span>
              <span className="chip">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
              {totalSeconds > 0 && <span className="chip">{formatTime(totalSeconds)}</span>}
            </div>

            {album.description && (
              <p className="selectable-content text-sm text-foreground/65 leading-relaxed mt-3.5">
                {album.description}
              </p>
            )}

            {tracks.length > 0 && (
              <button
                onClick={() => p.playTrackAt(tracks)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold mt-4 active:scale-95 transition shadow-sm"
              >
                <Play size={15} className="fill-current" /> Play all
              </button>
            )}
          </div>
        </div>

        {tracks.length === 0 ? (
          <EmptyState
            icon={Disc3}
            title="No published tracks yet"
            description="Nothing from this release is live on PUBLIC right now."
          />
        ) : (
          <div className="space-y-0.5">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} showArt={false} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}