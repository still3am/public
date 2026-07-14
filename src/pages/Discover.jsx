import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { GENRES } from "@/lib/audio-utils";
import TrackCard from "@/components/TrackCard";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";

export default function Discover() {
  const loc = useLocation();
  const [genre, setGenre] = useState(loc.state?.initialGenre || null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

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
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Discover</h1>
      <p className="text-sm text-foreground/50 mb-5">Browse PUBLIC by genre.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setGenre(null)}
          className={`chip ${!genre ? "active" : ""}`}
        >
          All
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`chip ${genre === g ? "active" : ""}`}
          >
            {g}
          </button>
        ))}
      </div>
      {loading ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {tracks.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      )}
    </div>
  );
}