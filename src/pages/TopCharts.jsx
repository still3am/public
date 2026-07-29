import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import TrackRow from "@/components/TrackRow";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";

export default function TopCharts() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const onUnpublished = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

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
      <PageHeader eyebrow="Charts" title="Top Charts" subtitle="The most-played tracks on PUBLIC right now." />
      <div className="space-y-0.5">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
          />
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}