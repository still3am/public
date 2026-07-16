import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useAddToPlaylist } from "@/hooks/useAddToPlaylist";
import TrackRow from "@/components/TrackRow";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function TopCharts() {
  const { user } = useAuth();
  const likes = useLikes(user);
  const ap = useAddToPlaylist();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.Track.filter(
        { is_published: true },
        "-play_count",
        100
      );
      setTracks(t);
    } catch {
      // ignore on refresh
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !tracks.length)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  return (
    <PullToRefresh onRefresh={load}>
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
    </PullToRefresh>
  );
}