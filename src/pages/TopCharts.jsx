import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback } from "react";
import { getTopTracks } from "@/lib/catalogCache";
import TrackCard from "@/components/TrackCard";
import IncrementalList from "@/components/IncrementalList";
import Podium from "@/components/Podium";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function TopCharts() {
  const [tracks, setTracks] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const onUnpublished = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

  async function load() {
    setLoading(true);setLoadError(false);
    try {
      setTracks(await getTopTracks(true));
    } catch {
      setLoadError(true);
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
      </div>);

  if (loadError && !tracks.length) return <LoadError onRetry={load} />;
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  const top5 = tracks.slice(0, 5);
  const rest = tracks.slice(5);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="collection-page">
        <header className="page-intro"><p className="eyebrow hidden">PUBLIC</p><h1>Top tracks</h1><p>The music PUBLIC is listening to.</p></header>
        {loadError && <LoadError onRetry={load} />} 
        {top5.length > 0 && <Podium tracks={top5} />}
        {rest.length > 0 &&
        <>
            <h2 className="text-lg font-extrabold tracking-tight px-1 mb-3 mt-5">
              More top tracks
            </h2>
            <IncrementalList
            items={rest}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
            renderItem={(t) => <TrackCard key={t.id} track={t} />} />
          
          </>
        }
      </div>
    </PullToRefresh>);

}