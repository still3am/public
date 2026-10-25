import { base44 } from "@/api/base44Client";
import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getTopTracks } from "@/lib/catalogCache";
import TrackRow from "@/components/TrackRow";
import CollectionSpotlight from "@/components/CollectionSpotlight";
import IncrementalList from "@/components/IncrementalList";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import { Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function TopCharts() {
  const [period, setPeriod] = useState("all"),[rising, setRising] = useState(false),[positions, setPositions] = useState([]);
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
      const rows = await getTopTracks(true);
      let chart = [];
      if (period !== "all") {
        const response = await base44.functions.invoke("musicInsights", { action: "charts", period });
        if (!Array.isArray(response?.data?.rows)) throw Error("Invalid chart");chart = response.data.rows;
      }
      if (request === loadVersion.current) {
        const map = new Map(rows.map((track) => [track.id, track]));
        setTracks(period === "all" ? rows : chart.map((row) => map.get(row.track_id)).filter(Boolean));setPositions(chart);
      }
    } catch {
      if (request === loadVersion.current) setLoadError(true);
    } finally {
      if (request === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    const refresh=()=>{setTracks([]);setPositions([]);load();};
    load();window.addEventListener('catalog:invalidate',refresh);
    return () => {loadVersion.current++;window.removeEventListener('catalog:invalidate',refresh);};
  }, [period]);

  if (loading && !tracks.length)
  return (
    <div role="status" aria-label="Loading page" className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);




  const filtering = !!query.trim() || !!genre;
  const ranks = new Map(tracks.map((track, index) => [track.id, index + 1]));
  const movements = new Map(positions.map((row) => [row.track_id, row]));
  const shown = rising && period !== "all" ? visible.filter((track) => (movements.get(track.id)?.growth || 0) > 0).sort((a, b) => movements.get(b.id).growth - movements.get(a.id).growth) : visible;

  return (
    <PullToRefresh onRefresh={load}>
      <div className="collection-page collection-refined charts-refined">
        <div className="view-switch mb-5" aria-label="Chart period" role="group">{[["all", "All time"], ["week", "Last 7 days"], ["month", "Last 30 days"]].map(([id, label]) => <button key={id} aria-pressed={period === id} onClick={() => {if (period === id) return;setTracks([]);setPositions([]);setPeriod(id);setRising(false);setGenre("");}}>{label}</button>)}</div>
        {loading && <p role="status" className="text-sm mb-3">Updating chart…</p>}
        <CollectionSpotlight title="Top Charts" eyebrow="On repeat" description={period === "all" ? "Ranked by total plays on PUBLIC." : "Recorded plays over the last " + (period === "week" ? "7" : "30") + " days. Movement compares with the preceding period."} tracks={visible} />
        
        {period !== "all" && <button className="playlist-action mb-4" aria-pressed={rising} onClick={() => setRising((value) => !value)}>{rising ? "Show full chart" : "Rising songs"}</button>}
        {loadError && <LoadError onRetry={load} />}
        {!tracks.length && !loadError && <p className="py-8 text-muted-foreground" role="status">No recorded plays for this period yet. Try another period.</p>}
        {!!tracks.length && !shown.length && <div className="collection-empty"><h2>No matching songs</h2><p>Try another title, artist, or genre.</p></div>}

        <div className="collection-results-heading"><h2>{filtering ? "Matching tracks" : "The chart"}</h2><span>{shown.length} songs</span></div>
        <IncrementalList resetKey={JSON.stringify([query, genre, period, rising])} items={shown} className="chart-ranked-list" renderItem={(track, index) => <div key={track.id} className="chart-ranked-row"><span className="chart-position">{ranks.get(track.id)}{period !== "all" && <small className="block text-[10px] leading-tight" aria-label={movements.get(track.id)?.movement === null ? "New this period" : "Position change " + movements.get(track.id)?.movement}>{movements.get(track.id)?.movement === null ? "NEW" : movements.get(track.id)?.movement > 0 ? "↑" + movements.get(track.id).movement : movements.get(track.id)?.movement < 0 ? "↓" + Math.abs(movements.get(track.id).movement) : "—"}</small>}</span><div className="min-w-0 flex-1"><TrackRow track={track} queue={shown} queueIndex={index} showArt /></div></div>} />

      </div>
    </PullToRefresh>);

}