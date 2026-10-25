import { useEffect, useRef, useState } from 'react';
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
  const stageRef = useRef(null),wheelMove = useRef(null),wheelState = useRef({ total: 0, last: 0, direction: 0, moved: false, timer: null, step: 215 });
  const dragFrame = useRef(null),dragValue = useRef(0),dragSpacing = useRef(215);
  function coverStep() {const stage = stageRef.current,value = stage && typeof getComputedStyle === 'function' ? parseFloat(getComputedStyle(stage).getPropertyValue('--cover-step')) : 0;return value > 0 ? value : 215;}
  function paintDrag(distance, spacing = 0) {
    if (spacing > 0) dragSpacing.current = spacing;
    dragValue.current = distance;
    const apply = () => {dragFrame.current = null;const stage = stageRef.current,value = dragValue.current;stage?.classList?.toggle('is-dragging', value !== 0);stage?.style?.setProperty('--drag-px', value + 'px');stage?.style?.setProperty('--drag-fraction', String(value / dragSpacing.current));};
    if (!distance || typeof requestAnimationFrame !== 'function') {if (dragFrame.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(dragFrame.current);dragFrame.current = null;apply();}
    else if (dragFrame.current === null) dragFrame.current = requestAnimationFrame(apply);
  }
  useEffect(() => {
    const stage = stageRef.current;if (!stage || queue.length < 2) return;
    const onWheel = (event) => {
      if (event.ctrlKey || gesture.current) return;
      const shifted = event.shiftKey && Math.abs(event.deltaX) < 1,dx = shifted ? event.deltaY : event.deltaX;
      if (!dx || !shifted && Math.abs(dx) <= Math.abs(event.deltaY) * 1.15) return;
      if (event.cancelable) event.preventDefault();
      const now = Date.now(),direction = Math.sign(dx),wheel = wheelState.current;
      if (now - wheel.last > 160 || direction !== wheel.direction) {wheel.total = 0;wheel.moved = false;wheel.step = coverStep();}
      wheel.last = now;wheel.direction = direction;
      if (wheel.moved) return;
      const step = wheel.step || 215;wheel.total += dx * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth || 300 : 1);
      wheel.total = Math.max(-step * 1.15, Math.min(step * 1.15, wheel.total));paintDrag(-wheel.total, step);
      clearTimeout(wheel.timer);wheel.timer = setTimeout(() => {wheel.moved = true;paintDrag(0);if (Math.abs(wheel.total) >= Math.max(20, step * .18)) wheelMove.current?.(Math.sign(wheel.total));}, 90);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {stage.removeEventListener('wheel', onWheel);clearTimeout(wheelState.current.timer);wheelState.current.total = 0;paintDrag(0);};
  }, [queue.length]);
  if (!queue.length) return null;
  const found = queue.findIndex((item) => item.id === selectedId),active = found >= 0 ? found : 0,selected = queue[active];
  const move = (direction) => setSelectedId(previous => {const index = queue.findIndex(item => item.id === previous),start = index >= 0 ? index : 0;return queue[(start + direction + queue.length) % queue.length].id;});
  wheelMove.current = move;
  const finishGesture = (event, cancelled = false) => {
    const start = gesture.current;if (!start || start.id !== event.pointerId) return;gesture.current = null;
    const dx = event.clientX - start.x,dy = event.clientY - start.y,horizontal = start.axis === 'horizontal' || !start.axis && Math.abs(dx) > Math.abs(dy) * 1.25;
    paintDrag(0);
    if (start.axis === 'horizontal' || horizontal && Math.abs(dx) > 10) suppressClickUntil.current = Date.now() + 500;
    if (cancelled || queue.length < 2 || !horizontal) return;
    const step = start.step,velocity = (event.clientX - start.sampleX) / Math.max(8, Date.now() - start.sampleTime),distance = Math.abs(dx);
    const flick = Math.abs(velocity) > .45 && distance > 18;
    if (distance >= Math.max(30, step * .22) || flick) {const count = Math.min(3, Math.max(1, Math.round(distance / step)));move((dx < 0 ? 1 : -1) * count);}
  };
  const visible = queue.map((item, index) => {let offset = (index - active + queue.length) % queue.length;if (offset > queue.length / 2) offset -= queue.length;return { item, index, offset };}).filter((item) => Math.abs(item.offset) <= 3);
  return <section className="home-discovery" aria-labelledby="home-discovery-title">
  <div className="home-discovery-intro"><h2 id="home-discovery-title">Curated soundscapes<br /><em>for your mind.</em></h2><span>Something for your mood. A little beyond your usual.</span></div>
  <div ref={stageRef} className={'home-discovery-stage' + (queue.length < 3 ? ' is-small' : '')} role="region" aria-label="Discover music carousel" tabIndex={0}
    onPointerDown={(event) => {if (event.isPrimary === false || event.button !== 0) return;clearTimeout(wheelState.current.timer);paintDrag(0);suppressClickUntil.current = 0;gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: '', sampleX: event.clientX, sampleTime: Date.now(), step: coverStep() };}}
    onPointerMove={(event) => {const start = gesture.current;if (!start || start.id !== event.pointerId) return;const dx = Math.abs(event.clientX - start.x),dy = Math.abs(event.clientY - start.y);if (!start.axis && Math.max(dx, dy) > 10) {if (dx > dy * 1.25) {start.axis = 'horizontal';event.currentTarget.setPointerCapture?.(event.pointerId);} else if (dy > dx * 1.25) start.axis = 'vertical';}if (start.axis === 'horizontal') {if (event.cancelable) event.preventDefault();const step = start.step;paintDrag(Math.max(-step * 2.5, Math.min(step * 2.5, event.clientX - start.x)), step);if (Date.now() - start.sampleTime > 80) {start.sampleX = event.clientX;start.sampleTime = Date.now();}}}}
    onPointerUp={(event) => finishGesture(event)} onPointerCancel={(event) => finishGesture(event, true)} onLostPointerCapture={(event) => {if (event.target === event.currentTarget && gesture.current?.id === event.pointerId) {gesture.current = null;paintDrag(0);}}}
    onClickCapture={(event) => {if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {event.preventDefault();event.stopPropagation();}}}
    onDragStart={(event) => event.preventDefault()} onKeyDown={(event) => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);}}}>
   <ol className="home-discovery-covers">{visible.map(({ item, index, offset }) => <DiscoveryCover key={item.id} track={item} offset={offset} selected={index === active} playing={currentTrackId === item.id && isPlaying} onChoose={() => {setSelectedId(item.id);onSelect(queue, index);}} />)}</ol>
  </div>
  <footer className="home-discovery-controls"><div className="home-discovery-arrows"><button type="button" aria-label="Previous discovery" disabled={queue.length < 2} onClick={() => move(-1)}><ChevronLeft size={19} /></button><button type="button" aria-label="Next discovery" disabled={queue.length < 2} onClick={() => move(1)}><ChevronRight size={19} /></button></div><Link to="/search">Explore music</Link></footer>
 </section>;
}