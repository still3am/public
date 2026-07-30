import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import TrackCard from "@/components/TrackCard";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";

export default function RecentlyAdded() {
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
        "-created_date",
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
      <PageHeader eyebrow="Newest" title="Recently Added" subtitle="Fresh uploads from across the network." />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}