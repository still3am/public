import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Disc3} from 'lucide-react';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import {groupAlbums,albumUrl} from '@/lib/albumModel';
import {linkedAlbumRecords} from '@/lib/albumData';
import ScrollShelf from '@/components/ScrollShelf';
function AlbumCard({album}){
 const cover=useCoverUrl(album.cover_art_url),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[cover]);
 return <Link to={albumUrl(album)} className="artist-album-card" aria-label={'Open '+album.title+' by '+album.artist}><span className="artist-album-cover">{cover&&!failed?<img src={cover} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<Disc3 size={38}/>}</span><strong>{album.title}</strong><span>{[album.year||null,album.tracks.length+' '+(album.tracks.length===1?'song':'songs')].filter(Boolean).join(' · ')}</span></Link>;
}
export default function ArtistAlbums({tracks}){
 const [records,setRecords]=useState([]),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setRecords([]);setError(false);linkedAlbumRecords(tracks).then(rows=>{if(alive)setRecords(rows);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[tracks,revision]);
 const albums=useMemo(()=>groupAlbums(tracks,records),[tracks,records]);
 if(!albums.length&&!error)return null;
 return <section className="artist-albums"><div className="artist-section-heading flex items-center justify-between gap-3"><h2>Albums</h2></div>{error&&<p className="text-xs text-muted-foreground mb-4">Some linked albums could not load. <button className="underline" onClick={()=>setRevision(n=>n+1)}>Retry</button></p>}<ScrollShelf label="Artist albums" className="artist-album-shelf">{albums.map(album=><AlbumCard key={album.key} album={album}/>)}</ScrollShelf></section>;
}
