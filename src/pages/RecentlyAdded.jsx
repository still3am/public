import { useEffect, useState, useCallback } from "react";
import { getPublishedTracks } from "@/lib/catalogCache";
import TrackCard from "@/components/TrackCard";
import IncrementalList from "@/components/IncrementalList";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

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
      setTracks(await getPublishedTracks());
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
      <IncrementalList
        items={tracks}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1"
        renderItem={(t) => <TrackCard key={t.id} track={t} />}
      />
    </div>
    </PullToRefresh>
  );
}