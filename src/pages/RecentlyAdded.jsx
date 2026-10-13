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
      const rows=await getPublishedTracks(true);if(request===loadVersion.current)setTracks(rows);
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

  return (
    <PullToRefresh onRefresh={load}>
    <div className="collection-page">
        <header className="page-intro"><h1>Fresh on PUBLIC</h1><p>New music, ready to discover.</p></header>
        <div className="collection-tools"><input aria-label="Search this music collection" placeholder="Find a song or artist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Filter music genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">All genres</option>{genres.map(name=><option key={name} value={name}>{name}</option>)}</select>{(query||genre)&&<button className="playlist-action" onClick={()=>{setQuery("");setGenre("");}}>Reset</button>}</div>
        {!visible.length&&<div className="collection-empty"><h2>No matching songs</h2><p>Try another title, artist, or genre.</p></div>}
      <IncrementalList
          items={visible}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
          renderItem={track=><TrackCard key={track.id} track={track} queue={visible}/>} />
        
    </div>
    </PullToRefresh>);

}