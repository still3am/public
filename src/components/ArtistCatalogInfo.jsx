import {useEffect,useState} from 'react';
import {findArtistInfo} from '@/lib/artistInfo';
/** @param {{artist:any}} props */
export default function ArtistCatalogInfo({artist}){
 const [info,setInfo]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setInfo(null);setLoading(true);setError(false);
 findArtistInfo(artist).then(value=>{if(alive)setInfo(value);}).catch(()=>{if(alive)setError(true);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
 },[artist.name,artist.location,artist.musicbrainz_id,retry]);
 if(loading)return <p role="status" className="text-xs text-muted-foreground mt-4">Finding artist details…</p>;
 if(error)return <button type="button" className="text-xs text-muted-foreground mt-4" onClick={()=>setRetry(v=>v+1)}>Retry artist details</button>;
 if(!info)return null;
 const rows=[['Artist type',info.type],['From',!artist.location&&(info.origin||info.area)],[info.type==='Person'?'Born':'Formed',!artist.formed_year&&info.begin],['Ended',info.end],['Genres',info.genres]].filter(row=>row[1]);
 return <div className="mt-5"><dl className="artist-facts">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">{info.website&&<a href={info.website} target="_blank" rel="noopener noreferrer" className="underline">Official website</a>}<a href={'https://musicbrainz.org/artist/'+info.id} target="_blank" rel="noopener noreferrer" className="underline">Artist details from MusicBrainz</a></div></div>;
}
