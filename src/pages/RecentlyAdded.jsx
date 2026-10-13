import LoadError from '@/components/LoadError';
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
  const [loadError,setLoadError]=useState(false);
  const [loading, setLoading] = useState(true);

  const onUnpublished = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

  async function load() {
    setLoading(true);setLoadError(false);
    try {
      setTracks(await getPublishedTracks(true));
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
      </div>
    );
  if(loadError&&!tracks.length)return <LoadError onRetry={load}/>;
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  return (
    <PullToRefresh onRefresh={load}>
    <div className="collection-page">
        <header className="page-intro"><p className="eyebrow">PUBLIC</p><h1>Fresh on PUBLIC</h1><p>New music, ready to discover.</p></header>
      <IncrementalList
        items={tracks}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
        renderItem={(t) => <TrackCard key={t.id} track={t} />}
      />
    </div>
    </PullToRefresh>
  );
}