import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Play,Pause,ChevronLeft,ChevronRight,Music} from 'lucide-react';
import {Image} from '@/components/ui/image';
import {useCoverUrl} from '@/hooks/useCoverUrl';
import './home-spotlight.css';

function DiscoveryCover({track,offset,selected,playing,onChoose}) {
 const cover=useCoverUrl(track.cover_art_url);
 const distance=Math.abs(offset);
 const style={zIndex:10-distance,'--offset':offset,'--distance':distance,'--cover-scale':1-distance*.07};
 return <li className={'home-discovery-cover'+(selected?' is-selected':'')} style={style}>
  <button type="button" className="home-discovery-art" onClick={onChoose} aria-label={(selected&&playing?'Pause ':'Play ')+track.title+' by '+(track.artist||'Unknown artist')} aria-current={selected?'true':undefined}>
   {cover?<Image src={cover} alt="" fittingType="fill" className="w-full h-full"/>:<Music size={48}/>}
   <span className="home-discovery-play" aria-hidden="true">{selected&&playing?<Pause size={22} fill="currentColor"/>:<Play size={22} fill="currentColor"/>}</span>
  </button>
  <div className="home-discovery-label"><Link to={'/track/'+track.id} tabIndex={selected?0:-1}>{track.title}</Link><p>{track.artist||track.uploader_name||'PUBLIC artist'}</p></div>
 </li>;
}

export default function HomeSpotlight({track,tracks=[],currentTrackId,isPlaying,onSelect}) {
 const unique=new Map();for(const item of tracks.length?tracks:track?[track]:[])if(item?.id&&!unique.has(item.id))unique.set(item.id,item);
 const queue=[...unique.values()].slice(0,24),[selectedId,setSelectedId]=useState(null);
 if(!queue.length)return null;
 const found=queue.findIndex(item=>item.id===selectedId),active=found>=0?found:0,selected=queue[active];
 const move=direction=>setSelectedId(queue[(active+direction+queue.length)%queue.length].id);
 const visible=queue.map((item,index)=>{let offset=(index-active+queue.length)%queue.length;if(offset>queue.length/2)offset-=queue.length;return {item,index,offset};}).filter(item=>Math.abs(item.offset)<=3);
 return <section className="home-discovery" aria-labelledby="home-discovery-title">
  <div className="home-discovery-intro"><p>DISCOVER FEED</p><h2 id="home-discovery-title">Curated soundscapes<br/>for your mind.</h2><span>Something for your mood. A little beyond your usual.</span></div>
  <div className={'home-discovery-stage'+(queue.length<3?' is-small':'')} role="region" aria-label="Discover music carousel" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}}}>
   <ol className="home-discovery-covers">{visible.map(({item,index,offset})=><DiscoveryCover key={item.id} track={item} offset={offset} selected={index===active} playing={currentTrackId===item.id&&isPlaying} onChoose={()=>{setSelectedId(item.id);onSelect(queue,index);}}/>)}</ol>
  </div>
  <footer className="home-discovery-controls"><div className="home-discovery-arrows"><button type="button" aria-label="Previous discovery" disabled={queue.length<2} onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button type="button" aria-label="Next discovery" disabled={queue.length<2} onClick={()=>move(1)}><ChevronRight size={19}/></button></div><p aria-live="polite" aria-atomic="true">{selected.title}<span>{active+1} / {queue.length}</span></p><Link to="/search">Explore music</Link></footer>
 </section>;
}
