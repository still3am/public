import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { GENRES } from "@/lib/audio-utils";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2, Plus } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";

export default function Discover() {
  const loc = useLocation();
  const [genre, setGenre] = useState(loc.state?.initialGenre || null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenres, setShowGenres] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const filter = genre
        ? { is_published: true, genre }
        : { is_published: true };
      const t = await base44.entities.Track.filter(filter, "-play_count", 50);
      setTracks(t);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  return (
    <PullToRefresh onRefresh={load}>
    <div>
      <PageHeader eyebrow="Browse" title="Discover" subtitle="Browse PUBLIC by genre." />
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setGenre(null)}
          className={`chip ${!genre ? "active" : ""}`}
        >
          All
        </button>
        {genre && (
          <button
            onClick={() => setGenre(null)}
            className="chip active flex items-center gap-1.5"
          >
            {genre}
            <span className="text-foreground/60 text-base leading-none">×</span>
          </button>
        )}
        <button
          onClick={() => setShowGenres((v) => !v)}
          className="chip flex items-center gap-1.5"
        >
          {showGenres ? "Hide" : "More genres"}
          <Plus
            size={14}
            className={`transition-transform ${showGenres ? "rotate-45" : ""}`}
          />
        </button>
      </div>
      {showGenres && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => {
                setGenre(g);
                setShowGenres(false);
              }}
              className={`chip w-full justify-center ${genre === g ? "active" : ""}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
      {loading && !tracks.length ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={Music}
          title="No tracks here yet"
          description="Try another genre or upload the first track in this genre."
        />
      ) : (
        <div>
          <p className="text-xs text-foreground/45 mb-3">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
            {genre ? ` in ${genre}` : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}