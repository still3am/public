import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getTopTracks } from "@/lib/catalogCache";
import TrackRow from "@/components/TrackRow";
import CollectionSpotlight from "@/components/CollectionSpotlight";
import IncrementalList from "@/components/IncrementalList";
import { useUnpublishedSync } from "@/hooks/useUnpublishedSync";
import EmptyState from "@/components/EmptyState";
import { Music, Loader2 } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

export default function TopCharts() {
  const [tracks, setTracks] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query,setQuery]=useState(""),[genre,setGenre]=useState("");
  const loadVersion=useRef(0);
  const genres=useMemo(()=>[...new Set(tracks.map(track=>track.genre).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[tracks]);
  const visible=useMemo(()=>tracks.filter(track=>(!genre||track.genre===genre)&&(!query.trim()||[track.title,track.artist,track.uploader_name].some(value=>(value||"").toLowerCase().includes(query.trim().toLowerCase())))),[tracks,genre,query]);

  const onUnpublished = useCallback((id) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  useUnpublishedSync(onUnpublished);

  async function load() {
    const request=++loadVersion.current;setLoading(true);setLoadError(false);
    try {
      const rows=await getTopTracks(true);if(request===loadVersion.current)setTracks(rows);
    } catch {
      if(request===loadVersion.current)setLoadError(true);
    } finally {
      if(request===loadVersion.current)setLoading(false);
    }
  }

  useEffect(() => {
    load();return()=>{loadVersion.current++;};
  }, []);

  if (loading && !tracks.length)
  return (
    <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  if (loadError && !tracks.length) return <LoadError onRetry={load} />;
  if (!tracks.length) return <EmptyState icon={Music} title="No tracks yet" />;

  const filtering=!!query.trim()||!!genre;
  const ranks=new Map(tracks.map((track,index)=>[track.id,index+1]));

  return (
    <PullToRefresh onRefresh={load}>
      <div className="collection-page collection-refined charts-refined">
        <CollectionSpotlight title="Top Charts" eyebrow="On repeat" description="Ranked by the music people play on PUBLIC." tracks={visible}/>
        <div className="collection-tools"><input aria-label="Search this music collection" placeholder="Find a song or artist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Filter music genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">All genres</option>{genres.map(name=><option key={name} value={name}>{name}</option>)}</select>{(query||genre)&&<button className="playlist-action" onClick={()=>{setQuery("");setGenre("");}}>Reset</button>}</div>
        {!visible.length&&<div className="collection-empty"><h2>No matching songs</h2><p>Try another title, artist, or genre.</p></div>}

        <div className="collection-results-heading"><h2>{filtering?"Matching tracks":"The chart"}</h2><span>{visible.length} songs</span></div>
        <IncrementalList resetKey={JSON.stringify([query,genre])} items={visible} className="chart-ranked-list" renderItem={(track,index)=><div key={track.id} className="chart-ranked-row"><span className="chart-position">{ranks.get(track.id)}</span><div className="min-w-0 flex-1"><TrackRow track={track} queue={visible} queueIndex={index} showArt/></div></div>}/>

      </div>
    </PullToRefresh>);

}