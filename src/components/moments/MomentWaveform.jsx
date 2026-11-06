import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import './moment-tools.css';

const format = (value) => Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function peaksOf(buffer) {
  const samples = buffer.getChannelData(0);
  const width = Math.max(1, Math.floor(samples.length / 84));
  return Array.from({ length: 84 }, (_, index) => {
    let peak = 0;
    for (let i = index * width; i < Math.min(samples.length, (index + 1) * width); i += Math.max(1, Math.floor(width / 160))) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  });
}

export default function MomentWaveform({ track, start, duration, maxDuration, disabled, onChange }) {
  const [shape, setShape] = useState(null);
  const [status, setStatus] = useState('idle');
  const lane = useRef(null);
  const drag = useRef(null);
  const total = Math.max(3, shape?.duration || Number(track.duration_seconds) || Math.max(60, start + duration));
  const end = start + duration;
  const max = Math.min(maxDuration, total);

  useEffect(() => {
    const abort = new AbortController();
    let audio;
    setShape(null);
    setStatus('loading');
    async function load() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw Error('Waveform unavailable');
      const song = track.audio_url ? track : await base44.entities.Track.get(track.id);
      if (abort.signal.aborted) return;
      if (!song.audio_url) throw Error('Waveform unavailable');
      const response = await fetch(song.audio_url, { signal: abort.signal });
      const limit = 32 * 1024 * 1024;
      if (!response.ok || Number(response.headers.get('content-length')) > limit || !response.body) throw Error('Waveform unavailable');
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > limit) { await reader.cancel(); throw Error('Waveform unavailable'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (abort.signal.aborted) return;
      audio = new AudioContextClass();
      const buffer = await audio.decodeAudioData(bytes.buffer);
      if (!abort.signal.aborted) {
        setShape({ duration: buffer.duration, peaks: peaksOf(buffer) });
        setStatus('ready');
      }
    }
    load().catch(() => { if (!abort.signal.aborted) setStatus('unavailable'); }).finally(() => {
      if (audio?.state !== 'closed') audio?.close().catch(() => {});
    });
    return () => abort.abort();
  }, [track.id, track.audio_url]);

  function change(edge, value) {
    if (disabled) return;
    if (edge === 'start') {
      const next = clamp(value, Math.max(0, end - max), Math.max(0, end - 3));
      onChange(next, end - next);
    } else {
      onChange(start, clamp(value, start + 3, Math.min(total, start + max)) - start);
    }
  }

  function pointerTime(event) {
    const rect = lane.current.getBoundingClientRect();
    return Math.round(clamp((event.clientX - rect.left) / rect.width, 0, 1) * total * 10) / 10;
  }

  return <div className="moment-waveform-editor">
    <div className="moment-waveform-times"><strong>{format(start)} – {format(end)}</strong><span>{duration.toFixed(1)}s selected</span></div>
    <div ref={lane} className="moment-waveform" aria-hidden="true">
      {shape && <svg viewBox="0 0 336 60" preserveAspectRatio="none">
        {shape.peaks.map((peak, index) => {
          const height = Math.max(3, peak * 54);
          return <rect key={index} x={index * 4} y={(60 - height) / 2} width="2.5" height={height} rx="1" />;
        })}
      </svg>}
      <div className="moment-waveform-selection" style={{ left: 100 * clamp(start / total, 0, 1) + '%', right: 100 * (1 - clamp(end / total, 0, 1)) + '%' }} />
      {['start','end'].map((edge) => <span key={edge} className="moment-waveform-handle"
        style={{ left: 100 * clamp((edge === 'start' ? start : end) / total, 0, 1) + '%' }}
        onPointerDown={(event) => {
          if (disabled) return;
          drag.current = { edge, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => { if (drag.current?.edge === edge && drag.current.id === event.pointerId) change(edge, pointerTime(event)); }}
        onLostPointerCapture={() => { drag.current = null; }}
      />)}
    </div>
    {status === 'loading' && <small role="status">Loading waveform…</small>}
    {status === 'unavailable' && <small>Waveform unavailable. You can still set both points below.</small>}
    <label>Move clip<input aria-label="Move clip along the song" type="range" min="0" max={Math.max(0, total - duration)} step="0.1" value={start} disabled={disabled} onChange={(event) => onChange(Number(event.target.value), duration)} /></label>
    <div className="moment-waveform-inputs">
      <label>Start (seconds)<input type="number" min={Math.max(0, end - max)} max={Math.max(0, end - 3)} step="0.1" value={Number(start.toFixed(2))} disabled={disabled} onChange={(event) => change('start', Number(event.target.value))} /></label>
      <label>End (seconds)<input type="number" min={start + 3} max={Math.min(total, start + max)} step="0.1" value={Number(end.toFixed(2))} disabled={disabled} onChange={(event) => change('end', Number(event.target.value))} /></label>
    </div>
  </div>;
}
