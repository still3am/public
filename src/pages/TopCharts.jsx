import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";

export default function TopCharts() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Track
      .filter({ is_published: true }, "-play_count", 100)
      .then(setTracks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Top Charts</h1>
      <p className="text-sm text-foreground/50 mb-5">
        The 100 most-played tracks on PUBLIC right now.
      </p>
      <div className="space-y-0.5">
        {tracks.map((t, i) => (
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
  );
}