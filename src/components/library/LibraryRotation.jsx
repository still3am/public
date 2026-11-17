import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { usePlayer } from "@/context/PlayerContext";
import "./library-rotation.css";

function RotationCover({ track, offset, active, onSelect, onPlay, playing }) {
  const cover = useCoverUrl(track.cover_art_url);
  return <article className={"library-rotation-card" + (active ? " is-active" : "")} data-offset={offset} style={{ "--rotation-offset": offset, "--rotation-scale": active ? 1 : 0.88, zIndex: 10 - Math.abs(offset), opacity: active ? 1 : Math.abs(offset) === 1 ? 0.5 : 0, pointerEvents: Math.abs(offset) > 1 ? "none" : "auto" }}>
    <button type="button" className="library-rotation-art" onClick={active ? onPlay : onSelect}
      aria-label={active ? (playing ? "Pause " : "Play ") + track.title + " by " + (track.artist || "Unknown artist") : "Show " + track.title}>
      {cover ? <Image src={cover} alt="" fittingType="fill" className="w-full h-full" /> : <span className="library-rotation-placeholder"><Music size={34} /></span>}
      <span className="library-rotation-play" aria-hidden="true">{active && playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</span>
    </button>
    <div className="library-rotation-caption">
      <Link to={"/track/" + track.id} tabIndex={active ? 0 : -1} onClick={event => event.stopPropagation()}>{track.title || "Untitled song"}</Link>
      <p>{track.artist || track.uploader_name || "PUBLIC artist"}</p>
    </div>
  </article>;
}

export default function LibraryRotation({ tracks }) {
  const player = usePlayer();
  const ids = useMemo(() => tracks.map(track => track.id).join("|"), [tracks]);
  const [selectedId, setSelectedId] = useState(() => tracks[0]?.id || null);
  const [dragOffset, setDragOffset] = useState(0);
  const gesture = useRef(null);
  useEffect(() => {
    if (!tracks.some(track => track.id === selectedId)) setSelectedId(tracks[0]?.id || null);
  }, [ids, selectedId, tracks]);
  const activeIndex = Math.max(0, tracks.findIndex(track => track.id === selectedId));
  const activeTrack = tracks[activeIndex];
  if (!activeTrack) return null;

  const move = direction => {
    const next = (activeIndex + direction + tracks.length) % tracks.length;
    setSelectedId(tracks[next].id);
  };
  const play = () => {
    if (player.currentTrack?.id === activeTrack.id) player.togglePlay();
    else player.playTrackAt(tracks, activeIndex);
  };
  const offsets = tracks.length === 1 ? [0] : tracks.length === 2 ? [0, 1] : tracks.length === 3 ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
  const visible = offsets.map(offset => {
    const index = (activeIndex + offset + tracks.length) % tracks.length;
    return { track: tracks[index], index, offset };
  });
  const onPointerDown = event => {
    if (event.button !== 0 || tracks.length < 2) return;
    gesture.current = { id: event.pointerId, y: event.clientY, x: event.clientX, lastY: event.clientY, time: Date.now(), axis: "" };
  };
  const onPointerMove = event => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dy = event.clientY - start.y;
    const dx = event.clientX - start.x;
    if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) start.axis = Math.abs(dy) > Math.abs(dx) * 1.15 ? "vertical" : "horizontal";
    if (start.axis !== "vertical") return;
    if (event.cancelable) event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragOffset(Math.max(-120, Math.min(120, dy * 0.45)));
    if (Date.now() - start.time > 90) { start.lastY = event.clientY; start.time = Date.now(); }
  };
  const onPointerUp = event => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    const dy = event.clientY - start.y;
    const velocity = (event.clientY - start.lastY) / Math.max(10, Date.now() - start.time);
    setDragOffset(0);
    if (start.axis === "vertical" && (Math.abs(dy) > 38 || Math.abs(velocity) > 0.5)) move(dy < 0 ? 1 : -1);
  };
  return <section className="library-rotation" aria-label="Recently saved song rotation">
    <div className="library-rotation-stage" role="region" aria-label="Recently saved songs. Swipe up or down to rotate."
      tabIndex={0} style={{ "--rotation-drag": dragOffset + "px" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={() => { gesture.current = null; setDragOffset(0); }}
      onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); } }}>
      {visible.map(({ track, index, offset }) => <RotationCover key={track.id} track={track} offset={offset}
        active={offset === 0} onSelect={() => setSelectedId(track.id)} onPlay={play}
        playing={player.currentTrack?.id === track.id && player.isPlaying} />)}
      <div className="library-rotation-arrows">
        <button type="button" aria-label="Previous saved song" disabled={tracks.length < 2} onClick={() => move(-1)}><ChevronUp size={18} /></button>
        <button type="button" aria-label="Next saved song" disabled={tracks.length < 2} onClick={() => move(1)}><ChevronDown size={18} /></button>
      </div>
    </div>
    <div className="library-rotation-position" aria-live="polite"><span>{activeIndex + 1} of {tracks.length}</span><span>{activeTrack.title} · {activeTrack.artist || activeTrack.uploader_name || "PUBLIC artist"}</span></div>
  </section>;
}
