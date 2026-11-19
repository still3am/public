import { useRef, useState } from 'react';
import { formatTime } from '@/lib/audio-utils';
import './playback-seek-slider.css';

export default function PlaybackSeekSlider({ position, duration, onSeek, showTimes = true, overlay = false }) {
  const limit = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const clamp = value => Math.min(limit, Math.max(0, Number(value) || 0));
  const [preview, setPreview] = useState(null);
  const dragging = useRef(false);
  const pending = useRef(0);
  const haptic = useRef({ touch: false, at: 0, step: 0 });
  const tick = next => {
    if (!haptic.current.touch || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const step = Math.round(next / limit * 50);
    const now = performance.now();
    if (step === haptic.current.step || now - haptic.current.at < 80) return;
    haptic.current.step = step;
    haptic.current.at = now;
    try { navigator.vibrate(5); } catch { /* Unsupported or blocked: seeking still works. */ }
  };
  const value = clamp(preview ?? position);
  const finish = event => {
    event.stopPropagation();
    if (!dragging.current) return;
    dragging.current = false;
    haptic.current.touch = false;
    onSeek(clamp(pending.current));
    setPreview(null);
  };
  const cancel = event => {
    event.stopPropagation();
    dragging.current = false;
    haptic.current.touch = false;
    setPreview(null);
  };
  return <div className="public-playback-seek" data-overlay={overlay} data-dragging={preview !== null} data-disabled={!limit}>
    <div className="public-playback-seek-control" style={{ '--seek-progress': (limit ? value / limit * 100 : 0) + '%' }}>
      <div className="public-playback-seek-track" aria-hidden="true"><div /><i /></div>
      <input type="range" aria-label="Seek playback" aria-valuetext={formatTime(value) + ' of ' + formatTime(limit)}
        min={0} max={limit || 1} step="0.1" value={value} disabled={!limit}
        onClick={event => event.stopPropagation()}
        onTouchStart={event => event.stopPropagation()}
        onTouchMove={event => event.stopPropagation()}
        onTouchEnd={event => event.stopPropagation()}
        onPointerDown={event => {
          event.stopPropagation();
          dragging.current = true;
          haptic.current = { touch: event.pointerType === 'touch', at: 0, step: Math.round(value / (limit || 1) * 50) };
          pending.current = value;
          setPreview(value);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onChange={event => {
          const next = clamp(event.target.value);
          pending.current = next;
          if (dragging.current) { setPreview(next); tick(next); }
          else onSeek(next);
        }}
        onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={finish} />
    </div>
    {showTimes && <div className="public-playback-seek-times"><span>{formatTime(value)}</span><span>-{formatTime(Math.max(0, limit - value))}</span></div>}
  </div>;
}
