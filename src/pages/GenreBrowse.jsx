import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import TrackRow from "@/components/TrackRow";
import { Loader2, Music2 } from "lucide-react";

export default function GenreBrowse() {
  const { genre } = useParams();
  const [tracks, setTracks] = useState(null);

  useEffect(() => {
    if (!genre) return;
    setTracks(null);
    base44.entities.Track
      .filter({ genre, is_published: true }, "-created_date", 200)
      .then((r) => setTracks(Array.isArray(r) ? r : []))
      .catch(() => setTracks([]));
  }, [genre]);

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 pb-24">
      <BackHeader title={genre} />
      {tracks === null ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-foreground/40" size={24} />
        </div>
      ) : tracks.length === 0 ? (
        <div className="py-16 text-center text-foreground/50">
          <Music2 size={26} className="inline mb-2 opacity-40" />
          <div className="text-sm font-medium">No new tracks in {genre} yet</div>
          <div className="text-xs mt-1">Check back soon or be the first to upload.</div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}