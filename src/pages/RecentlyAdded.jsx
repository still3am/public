import CollectionSpotlight from "@/components/CollectionSpotlight";
import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getPublishedTracks } from "@/lib/catalogCache";
import TrackCard from "@/components/TrackCard";
import IncrementalList from "@/components/IncrementalList";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function RecentlyAdded() {
  const [tracks, setTracks] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""),[genre, setGenre] = useState("");
  const loadVersion = useRef(0);
  const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [tracks]);
  const visible = useMemo(() => tracks.filter((track) => (!genre || track.genre === genre) && (!query.trim() || [track.title, track.artist, track.uploader_name].some((value) => (value || "").toLowerCase().includes(query.trim().toLowerCase())))), [tracks, genre, query]);

  const onUnpublished = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

  async function load() {
    const request = ++loadVersion.current;setLoading(true);setLoadError(false);
    try {
      const rows = await getPublishedTracks(true);if (request === loadVersion.current) setTracks(rows);
    } catch {
      if (request === loadVersion.current) setLoadError(true);
    } finally {
      if (request === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    const refresh=()=>{setTracks([]);load();};
    load();window.addEventListener('catalog:invalidate',refresh);
    return () => {loadVersion.current++;window.removeEventListener('catalog:invalidate',refresh);};
  }, []);

  if (loading && !tracks.length)
  return (
    <div role="status" aria-label="Loading page" className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  if (loadError && !tracks.length) return <LoadError onRetry={load} />;
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  return (
    <PullToRefresh onRefresh={load}>
    <div className="collection-page collection-refined recent-refined">
        <CollectionSpotlight title="Recently Added" eyebrow="Fresh on PUBLIC" description="The latest music added by the PUBLIC community." tracks={visible} />
        
        {!visible.length && <div className="collection-empty"><h2>No matching songs</h2><p>Try another title, artist, or genre.</p></div>}
      <div className="collection-results-heading"><h2>{query || genre ? "Matching songs" : "Explore the latest"}</h2><span>{visible.length} songs</span></div>
      <IncrementalList
          resetKey={JSON.stringify([query, genre])}
          items={visible}
          className="collection-art-grid"
          renderItem={(track) => <TrackCard key={track.id} track={track} queue={visible} />} />
        
    </div>
    </PullToRefresh>);

}