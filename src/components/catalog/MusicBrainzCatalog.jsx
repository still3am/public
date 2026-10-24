import {useEffect,useRef,useState} from 'react';
import {searchUploadMetadata,uploadMusicBrainzMetadata} from '@/lib/uploadMusicBrainz';
/** @param {any} props */
export default function MusicBrainzCatalog({query,active=true,onSelect,disabled=false,duration=0}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(false),[searched,setSearched]=useState(false),[error,setError]=useState('');const version=useRef(0);
 useEffect(()=>{version.current++;setRows([]);setSearched(false);setError('');setLoading(false);return()=>{version.current++;};},[query,active]);
 async function search(){
  const request=++version.current;setLoading(true);setError('');
  try{const result=await searchUploadMetadata(query);if(request===version.current){setRows(result);setSearched(true);}}
  catch{if(request===version.current)setError('MusicBrainz could not load. Please try again.');}
  finally{if(request===version.current)setLoading(false);}
 }
 if(!active)return null;
 return <div className="mt-3"><button type="button" className="playlist-action" disabled={disabled||loading||query.trim().length<2} onClick={search}>{loading?'Searching MusicBrainz…':'Search MusicBrainz'}</button>
 {error&&<p role="alert" className="text-xs mt-3">{error}</p>}
 {searched&&!rows.length&&<p role="status" className="text-xs text-muted-foreground mt-3">No matches found. Try the song title and artist name.</p>}
 <ul className="grid gap-2 mt-3 max-h-80 overflow-y-auto" aria-label="MusicBrainz recordings">{rows.map(row=><li key={row.id} className="rounded-xl border border-border p-3"><strong className="block text-sm">{row.title}</strong><span className="block text-xs text-muted-foreground">{row.artist}{row.album?' · '+row.album:''}{row.date?' · '+row.date:''}{row.duration?' · '+Math.floor(row.duration/60)+':'+String(Math.floor(row.duration%60)).padStart(2,'0'):''}</span>{row.version&&<p className="text-xs mt-1">{row.version}</p>}{duration>0&&row.duration>0&&Math.abs(duration-row.duration)>4&&<p className="text-xs mt-1">Different duration—check this recording.</p>}<div className="flex gap-4 mt-2 items-center">{onSelect&&<button type="button" className="playlist-action" disabled={disabled} onClick={()=>onSelect(uploadMusicBrainzMetadata(row))}>Use these details</button>}<a href={'https://musicbrainz.org/recording/'+row.recordingId} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline">MusicBrainz</a></div></li>)}</ul></div>;
}
