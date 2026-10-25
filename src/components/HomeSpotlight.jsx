import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import './home-spotlight.css';

function DiscoveryCover({ track, offset, selected, playing, onChoose }) {
  const cover = useCoverUrl(track.cover_art_url);
  const distance = Math.abs(offset);
  const style = { zIndex: 10 - distance, '--offset': offset, '--distance': distance, '--cover-scale': 1 - distance * .07 };
  return <li className={'home-discovery-cover' + (selected ? ' is-selected' : '')} style={style}>
  <button type="button" className="home-discovery-art" onClick={onChoose} aria-label={(selected && playing ? 'Pause ' : 'Play ') + track.title + ' by ' + (track.artist || 'Unknown artist')} aria-current={selected ? 'true' : undefined}>
   {cover ? <Image src={cover} alt="" fittingType="fill" className="w-full h-full" /> : <Music size={48} />}
   <span className="home-discovery-play" aria-hidden="true">{selected && playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</span>
  </button>
  <div className="home-discovery-label"><Link to={'/track/' + track.id} tabIndex={selected ? 0 : -1}>{track.title}</Link><p>{track.artist || track.uploader_name || 'PUBLIC artist'}</p></div>
 </li>;
}

export default function HomeSpotlight({ track, tracks = [], currentTrackId, isPlaying, onSelect }) {
  const unique = new Map();for (const item of tracks.length ? tracks : track ? [track] : []) if (item?.id && !unique.has(item.id)) unique.set(item.id, item);
  const queue = [...unique.values()].slice(0, 24),[selectedId, setSelectedId] = useState(null);
  const gesture = useRef(null),suppressClickUntil = useRef(0);
  if (!queue.length) return null;
  const found = queue.findIndex((item) => item.id === selectedId),active = found >= 0 ? found : 0,selected = queue[active];
  const move = (direction) => setSelectedId(queue[(active + direction + queue.length) % queue.length].id);
  const finishGesture = (event, cancelled = false) => {
    const start = gesture.current;if (!start || start.id !== event.pointerId) return;gesture.current = null;
    const dx = event.clientX - start.x,dy = event.clientY - start.y,horizontal = start.axis === 'horizontal' || (!start.axis && Math.abs(dx) > Math.abs(dy) * 1.25);
    if (start.axis === 'horizontal' || horizontal && Math.abs(dx) > 10) suppressClickUntil.current = Date.now() + 500;
    if (!cancelled && queue.length > 1 && horizontal && Math.abs(dx) >= 40) move(dx < 0 ? 1 : -1);
  };
  const visible = queue.map((item, index) => {let offset = (index - active + queue.length) % queue.length;if (offset > queue.length / 2) offset -= queue.length;return { item, index, offset };}).filter((item) => Math.abs(item.offset) <= 3);
  return <section className="home-discovery" aria-labelledby="home-discovery-title">
  <div className="home-discovery-intro"><span>Something for your mood. A little beyond your usual.</span></div>
  <div className={'home-discovery-stage' + (queue.length < 3 ? ' is-small' : '')} role="region" aria-label="Discover music carousel" tabIndex={0}
    onPointerDown={(event) => {if (event.isPrimary === false || event.button !== 0) return;suppressClickUntil.current = 0;gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: '' };}}
    onPointerMove={(event) => {const start = gesture.current;if (!start || start.id !== event.pointerId) return;const dx = Math.abs(event.clientX - start.x),dy = Math.abs(event.clientY - start.y);if (!start.axis && Math.max(dx, dy) > 10) {if (dx > dy * 1.25) {start.axis = 'horizontal';event.currentTarget.setPointerCapture?.(event.pointerId);} else if (dy > dx * 1.25) start.axis = 'vertical';}if (start.axis === 'horizontal' && event.cancelable) event.preventDefault();}}
    onPointerUp={(event) => finishGesture(event)} onPointerCancel={(event) => finishGesture(event, true)} onLostPointerCapture={(event) => {if (event.target === event.currentTarget && gesture.current?.id === event.pointerId) gesture.current = null;}}
    onClickCapture={(event) => {if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {event.preventDefault();event.stopPropagation();}}}
    onDragStart={(event) => event.preventDefault()} onKeyDown={(event) => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);}}}>
   <ol className="home-discovery-covers">{visible.map(({ item, index, offset }) => <DiscoveryCover key={item.id} track={item} offset={offset} selected={index === active} playing={currentTrackId === item.id && isPlaying} onChoose={() => {setSelectedId(item.id);onSelect(queue, index);}} />)}</ol>
  </div>
  <footer className="home-discovery-controls"><div className="home-discovery-arrows"><button type="button" aria-label="Previous discovery" disabled={queue.length < 2} onClick={() => move(-1)}><ChevronLeft size={19} /></button><button type="button" aria-label="Next discovery" disabled={queue.length < 2} onClick={() => move(1)}><ChevronRight size={19} /></button></div><Link to="/search">Explore music</Link></footer>
 </section>;
}