import { useRef, useState } from 'react';
import { formatTime } from '@/lib/audio-utils';
import './playback-seek-slider.css';

export default function PlaybackSeekSlider({ position, duration, onSeek, showTimes = true, overlay = false }) {
  const limit = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const clamp = value => Math.min(limit, Math.max(0, Number(value) || 0));
  const [preview, setPreview] = useState(null);
  const dragging = useRef(false);
  const pending = useRef(0);
  const value = clamp(preview ?? position);
  const finish = event => {
    event.stopPropagation();
    if (!dragging.current) return;
    dragging.current = false;
    onSeek(clamp(pending.current));
    setPreview(null);
  };
  const cancel = event => {
    event.stopPropagation();
    dragging.current = false;
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
          pending.current = value;
          setPreview(value);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onChange={event => {
          const next = clamp(event.target.value);
          pending.current = next;
          if (dragging.current) setPreview(next);
          else onSeek(next);
        }}
        onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={finish} />
    </div>
    {showTimes && <div className="public-playback-seek-times"><span>{formatTime(value)}</span><span>-{formatTime(Math.max(0, limit - value))}</span></div>}
  </div>;
}
