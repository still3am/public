import {findSongInfo} from '@/lib/songInfo';
import {unknownAlbum,rememberAlbumInfo} from '@/lib/albumEnrichment';
import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Disc3} from 'lucide-react';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import {groupAlbums,albumUrl} from '@/lib/albumModel';
import {artistKey} from '@/lib/artistReleaseModel';
import {getPublishedTracks} from '@/lib/catalogCache';
import {useSafety} from '@/context/SafetyContext';
import {linkedAlbumRecords} from '@/lib/albumData';
import ScrollShelf from '@/components/ScrollShelf';
function AlbumCard({album}){
 const cover=useCoverUrl(album.cover_art_url),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[cover]);
 return <Link to={albumUrl(album)} className="artist-album-card" aria-label={'Open '+album.title+' by '+album.artist}><span className="artist-album-cover">{cover&&!failed?<img src={cover} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<Disc3 size={38}/>}</span><strong>{album.title}</strong><span>{[album.year||null,album.tracks.length+' '+(album.tracks.length===1?'song':'songs')].filter(Boolean).join(' · ')}</span></Link>;
}
export default function ArtistAlbums({tracks,artistName}){
 const {blocked}=useSafety();
 const [records,setRecords]=useState([]),[catalog,setCatalog]=useState(tracks),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setRecords([]);setCatalog(tracks);setError(false);getPublishedTracks(revision>0).then(async rows=>{const visible=rows.filter(t=>!blocked.has(t.uploader_id)),linked=await linkedAlbumRecords(visible);if(alive){setCatalog(visible);setRecords(linked);}}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[tracks,revision,blocked]);
 const [recoveredRevision,setRecoveredRevision]=useState(0),[identifying,setIdentifying]=useState(false);
 useEffect(()=>{let active=true;
 const missing=tracks.filter(t=>unknownAlbum(t.album_name||t.album_title||t.album));
 if(!missing.length)return;
 setIdentifying(true);
 (async()=>{for(const track of missing){if(!active)break;try{const info=await findSongInfo(track);if(active&&rememberAlbumInfo(track,info))setRecoveredRevision(n=>n+1);}catch{break;}}if(active)setIdentifying(false);})();
 return()=>{active=false;};
 },[tracks]);
 const albums=useMemo(()=>{const ids=new Set(tracks.map(t=>t.id));return groupAlbums(catalog,records).filter(album=>artistKey(album.artist)===artistKey(artistName)||album.tracks.some(t=>ids.has(t.id)));},[catalog,records,tracks,artistName,recoveredRevision]);
 if(!albums.length&&!error&&!identifying)return null;
 return <section className="artist-albums"><div className="artist-section-heading flex items-center justify-between gap-3"><h2>Albums</h2></div>{identifying&&<p role="status" className="text-xs text-muted-foreground mb-4">Identifying missing album details…</p>}{error&&<p className="text-xs text-muted-foreground mb-4">Some album tracks could not load. <button className="underline" onClick={()=>setRevision(n=>n+1)}>Retry</button></p>}<ScrollShelf label="Artist albums" className="artist-album-shelf">{albums.map(album=><AlbumCard key={album.key} album={album}/>)}</ScrollShelf></section>;
}
