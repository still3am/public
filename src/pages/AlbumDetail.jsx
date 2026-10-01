import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, Disc3, Loader2, Play, Plus } from "lucide-react";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import { Image } from "@/components/ui/image";
import AddTracksToAlbumSheet from "@/components/album/AddTracksToAlbumSheet";
import { albumYear } from "@/lib/albums";
import { formatTime } from "@/lib/audio-utils";

export default function AlbumDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const p = usePlayer();
  const { user } = useAuth();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const a = await base44.entities.Album.get(id).catch(() => null);
      setAlbum(a);
      if (!a) return;
      const rows = await base44.entities.Track
        .filter({ album_id: id }, "track_number", 200)
        .catch(() => []);
      const list = (rows || []).slice().sort(
        (x, y) =>
          (x.track_number || 0) - (y.track_number || 0) ||
          String(x.created_date || "").localeCompare(String(y.created_date || ""))
      );
      setTracks(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!album) return <EmptyState title="Album not found" />;

  const isOwner = album.creator_id === user?.id;
  const cover = album.cover_art_url || tracks.find((t) => t.cover_art_url)?.cover_art_url || "";
  const artistName = album.artisan || tracks[0]?.artist || tracks[0]?.uploader_name || "";
  const year = albumYear(album, tracks);
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
  const meta = [
    artistName || null,
    year || null,
    `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`,
    totalSeconds ? formatTime(totalSeconds) : null,
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-0 pb-10">
      <button
        onClick={() => nav(-1)}
        className="hidden md:inline-flex items-center gap-1.5 mb-4 text-sm font-semibold text-foreground/60 hover:text-foreground transition"
      >
        <ChevronLeft size={18} /> Back
      </button>

      <div className="flex flex-col md:flex-row gap-5 md:gap-6 mb-8">
        <div className="relative w-40 h-40 md:w-52 md:h-52 shrink-0 mx-auto md:mx-0">
          <div className="w-full h-full rounded-2xl overflow-hidden bg-foreground/[0.06] shadow-lg ring-1 ring-inset ring-foreground/10">
            {cover ? (
              <Image src={cover} fittingType="fill" alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.03]">
                <Disc3 size={40} className="text-foreground/25" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-end text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
            {tracks.length > 6 ? "Album" : "EP"}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2">{album.title}</h1>
          {artistName && (
            <Link
              to={`/artist?name=${encodeURIComponent(artistName)}`}
              className="text-sm font-semibold text-foreground/70 hover:text-foreground transition w-fit mx-auto md:mx-0 mb-3"
            >
              {artistName}
            </Link>
          )}
          <div className="text-sm text-foreground/50 mb-4">{meta.join(" · ")}</div>
          {album.description && (
            <p className="selectable-content text-sm text-foreground/60 max-w-xl mb-4">{album.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            {tracks.length > 0 && (
              <button
                onClick={() => p.playTrackAt(tracks, 0)}
                className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 active:scale-95 transition"
              >
                <Play size={16} fill="currentColor" /> Play
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setAdding(true)}
                className="h-11 px-5 rounded-full border border-border text-sm font-semibold flex items-center gap-2 hover:bg-foreground/[0.04] transition"
              >
                <Plus size={16} /> Add tracks
              </button>
            )}
          </div>
        </div>
      </div>

      {!tracks.length ? (
        <EmptyState
          icon={Disc3}
          title="No tracks in this release yet"
          description={isOwner ? "Add your uploads to build the tracklist." : undefined}
        />
      ) : (
        <div>
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} showArt />
          ))}
        </div>
      )}

      {adding && (
        <AddTracksToAlbumSheet
          album={album}
          existingIds={new Set(tracks.map((t) => t.id))}
          onAdded={() => load()}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}