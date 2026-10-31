import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {CalendarDays,ExternalLink,Loader2} from 'lucide-react';
import {findRelatedArtists,findArtistShows} from '@/lib/artistDiscovery';
import './artist-discovery.css';
function useLookup(load){
 const [state,setState]=useState({rows:[],loaded:false,busy:false,error:''}),version=useRef(0),locked=useRef(false);
 useEffect(()=>()=>{version.current++;},[]);
 const run=async()=>{if(locked.current)return;locked.current=true;const request=++version.current;setState(old=>({...old,busy:true,error:''}));try{const rows=await load();if(request===version.current)setState({rows,loaded:true,busy:false,error:''});}catch{if(request===version.current)setState(old=>({...old,busy:false,error:'The catalog is temporarily unavailable. Please retry.'}));}finally{locked.current=false;}};
 return {...state,run};
}
/** @param {{artist:any,existingNames?:string[]}} props */
export default function ArtistDiscovery({artist,existingNames=[]}){
 const state=useLookup(()=>findRelatedArtists(artist));
 const known=new Set(existingNames.map(name=>name.toLowerCase().trim()));
 const rows=state.rows.filter(row=>!known.has(row.name.toLowerCase().trim()));
 return <div className="artist-discovery">
  {!state.loaded&&<button type="button" className="playlist-action artist-discovery-button" onClick={state.run} disabled={state.busy}>{state.busy?<><Loader2 size={15} className="animate-spin"/>Finding artists…</>:'Explore more artists'}</button>}
  {state.error&&<p role="status" className="text-xs text-muted-foreground mt-3">{state.error}</p>}
  {state.loaded&&!rows.length&&<p className="text-xs text-muted-foreground">No additional catalog suggestions are listed yet.</p>}
  {rows.length>0&&<><p className="text-xs text-muted-foreground mb-3">More artists with shared genres. Their music may not be on PUBLIC yet.</p><div className="artist-discovery-grid">{rows.map(row=><Link key={row.id} to={'/artist?name='+encodeURIComponent(row.name)} className="artist-discovery-card"><strong>{row.name}</strong>{row.detail&&<span>{row.detail}</span>}<small>Explore artist</small></Link>)}</div><a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="artist-discovery-source">Catalog suggestions from MusicBrainz</a></>}
 </div>;
}
/** @param {{artist:any}} props */
export function ArtistShows({artist}){
 const state=useLookup(()=>findArtistShows(artist));
 return <section className="artist-shows"><h2 className="flex items-center gap-2 text-lg font-bold mb-3"><CalendarDays size={20}/>Upcoming shows</h2><p className="text-xs text-muted-foreground mb-4">Community-listed concerts and festivals. Availability varies by artist.</p>
 {!state.loaded&&<button type="button" className="playlist-action artist-discovery-button" onClick={state.run} disabled={state.busy}>{state.busy?<><Loader2 size={15} className="animate-spin"/>Checking shows…</>:'Check upcoming shows'}</button>}
 {state.error&&<p role="status" className="text-xs text-muted-foreground mt-3">{state.error}</p>}
 {state.loaded&&!state.rows.length&&<p className="text-sm text-muted-foreground">No upcoming shows are listed in this catalog. Check the artist’s official website for announcements.</p>}
 {state.rows.length>0&&<><div className="artist-discovery-grid">{state.rows.map(row=><a key={row.id} href={row.url} target="_blank" rel="noopener noreferrer" className="artist-discovery-card"><time dateTime={row.date}>{new Date(row.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time><strong>{row.name}</strong>{row.place&&<span>{row.place}</span>}<small>Event details <ExternalLink size={12}/></small></a>)}</div><a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="artist-discovery-source">Event listings from MusicBrainz</a></>}
 </section>;
}
