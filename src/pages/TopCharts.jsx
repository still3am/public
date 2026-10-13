import LoadError from '@/components/LoadError';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  const top5=filtering?[]:tracks.slice(0,5),rest=filtering?visible:tracks.slice(5);
  const ranks=new Map(tracks.map((track,index)=>[track.id,index+1]));

  return (
    <PullToRefresh onRefresh={load}>
      <div className="collection-page">
        <header className="page-intro"><h1>Top tracks</h1><p>The music PUBLIC is listening to.</p></header>
        <div className="collection-tools"><input aria-label="Search this music collection" placeholder="Find a song or artist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Filter music genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">All genres</option>{genres.map(name=><option key={name} value={name}>{name}</option>)}</select>{(query||genre)&&<button className="playlist-action" onClick={()=>{setQuery("");setGenre("");}}>Reset</button>}</div>
        {!visible.length&&<div className="collection-empty"><h2>No matching songs</h2><p>Try another title, artist, or genre.</p></div>}

        {top5.length > 0 && <Podium tracks={top5} queue={tracks}/>}
        {rest.length > 0 &&
        <>
            <h2 className="text-lg font-extrabold tracking-tight px-1 mb-3 mt-5">
              {filtering?"Matching tracks":"More top tracks"}
            </h2>
            <IncrementalList
            items={rest}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
            renderItem={track=><div key={track.id} className="relative"><TrackCard track={track} queue={filtering?visible:tracks}/><span className="absolute top-3 left-3 pointer-events-none z-10 bg-background/95 text-foreground border rounded-full px-2 py-1 text-[10px] font-bold tabular-nums">#{ranks.get(track.id)}</span></div>} />
          
          </>
        }
      </div>
    </PullToRefresh>);

}