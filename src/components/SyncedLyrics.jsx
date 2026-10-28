import {findLyricIndex} from '@/lib/lyricClock';
import {useLyricClock} from '@/hooks/useLyricClock';
import LyricInterlude from "@/components/LyricInterlude";
import { useEffect, useRef, useMemo } from "react";


/** @param {any} props */
export default function SyncedLyrics({ trackId, position, resolvedLyrics, onSeek, onRetry, getPlaybackPosition }) {
  const lineRefs = useRef([]);
  const scrollRef = useRef(null);
  const activeRef = useRef(-1);
  const userScrollUntil = useRef(0);
  const resumeTimer = useRef(null);
  const touching=useRef(false);
  const lastCentered = useRef({ trackId: null, index: -1 });

  useEffect(() => {userScrollUntil.current = 0;clearTimeout(resumeTimer.current);
    lastCentered.current = { trackId: null, index: -1 };
  }, [trackId, resolvedLyrics?.record]);
  const current = resolvedLyrics?.trackId === trackId ? resolvedLyrics : null;
  const lyrics = current?.record || null;
  const trackLyrics = current?.text || '';
  const loading = !current || current.loading === true;

  const lines = useMemo(() => (Array.isArray(lyrics?.lines) ? lyrics.lines : []).
  filter((line) => Number.isFinite(Number(line.start_time_ms)) && Number(line.start_time_ms) >= 0).
  slice().sort((a, b) => Number(a.start_time_ms) - Number(b.start_time_ms)), [lyrics?.lines]);
  const displayLines = useMemo(() => lines.length && Number(lines[0].start_time_ms) >= 3000 ? [{ text: '♪', start_time_ms: 0, end_time_ms: Number(lines[0].start_time_ms) }, ...lines] : lines, [lines]);
  const hasTimed = displayLines.length > 0 && displayLines.some((line) => Number(line.start_time_ms) > 0 || Number(line.end_time_ms) > 0);
  const clock=useLyricClock({trackId,position,enabled:!!lyrics?.lines?.length,readPosition:getPlaybackPosition,viewport:scrollRef,lines:displayLines});
  const ms = Math.max(0, Number(clock) || 0) * 1000;
  const activeIdx=hasTimed?findLyricIndex(displayLines,clock):-1;
  activeRef.current = activeIdx;

  const centerActive = () => {
    const container = scrollRef.current;
    const line = lineRefs.current[activeRef.current];
    if (!container || !line || touching.current || Date.now() < userScrollUntil.current) return;
    // Bounding rectangles use the actual scroll viewport, not an outer positioned ancestor.
    const top = container.scrollTop + line.getBoundingClientRect().top - container.getBoundingClientRect().top -
    container.clientHeight * 0.32;
    const target = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, top));
    const previous = lastCentered.current;
    const jump = previous.trackId !== trackId || Math.abs(previous.index - activeRef.current) > 3;
    lastCentered.current = { trackId, index: activeRef.current };
    if (Math.abs(container.scrollTop - target) > 2) container.scrollTo({
      top: target,
      behavior: jump || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  };

  useEffect(() => {
    if (loading || activeIdx < 0) return;
    const frame = requestAnimationFrame(centerActive);
    return () => cancelAnimationFrame(frame);
  }, [activeIdx, loading, trackId, displayLines]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);
  const markUserScroll = () => {
    userScrollUntil.current = Date.now() + 4000;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      userScrollUntil.current = 0;
      centerActive();
    }, 4100);
  };
  const seekLine = (line) => {
    clearTimeout(resumeTimer.current);
    userScrollUntil.current = 0;
    onSeek?.(Number(line.start_time_ms) / 1000);
  };

  const text = typeof trackLyrics === "string" ? trackLyrics.trim() : "";
  if (loading) return <div role="status" aria-label="Finding lyrics" className="public-lyrics-loading">
    <div className="public-lyrics-skeleton" aria-hidden="true"><span /><span /><span /></div>
    
  </div>;


  if (hasTimed) return (
    <div className="public-lyrics-view">
    
    <div ref={scrollRef} onWheel={markUserScroll} onTouchStart={()=>{touching.current=true;markUserScroll();}} onTouchMove={markUserScroll}
      onTouchEnd={()=>{touching.current=false;markUserScroll();}} onTouchCancel={()=>{touching.current=false;markUserScroll();}}
      onKeyDown={(event) => {if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) markUserScroll();}}
      className="public-lyrics-scroll no-scrollbar" aria-label="Synced song lyrics">
      {displayLines.map((line, index) => {
          const active = index === activeIdx;
          const distance = activeIdx < 0 ? index : Math.abs(index - activeIdx);
          const opacity = active ? 1 : distance <= 1 ? 0.72 : distance === 2 ? 0.56 : 0.44;
          return <button type="button" key={index} ref={(element) => {lineRefs.current[index] = element;}}
          onClick={() => seekLine(line)} title="Play from this line"
          aria-label={(line.text === '♪' ? 'Instrumental passage' : line.text || 'Instrumental passage') + ' · Play from ' + Math.floor(Number(line.start_time_ms) / 60000) + ':' + String(Math.floor(Number(line.start_time_ms) / 1000) % 60).padStart(2, '0')} aria-current={active ? "true" : undefined}
          className="public-lyric-line selectable-content"
          style={{ opacity, filter: "none" }}>
          {/^(?:[♪♫]+|\[?(?:instrumental|music|interlude|solo)\]?)$/i.test(line.text?.trim() || "") ? <LyricInterlude active={active} /> : Array.isArray(line.words) && line.words.length ? line.words.map((word, wordIndex) => {
              const start = Number(word.start_time_ms),end = Number(word.end_time_ms);
              const valid = Number.isFinite(start) && Number.isFinite(end) && end > start;
              const progress = valid ? Math.max(0, Math.min(1, (ms - start) / (end - start))) : 1;
              return <span key={wordIndex} style={active && valid ? {
                backgroundImage: "linear-gradient(to right,#fff " + progress * 100 + "%,rgba(255,255,255,.4) " + progress * 100 + "%)",
                backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent"
              } : undefined}>{word.text}{!line.preserve_word_spacing && wordIndex < line.words.length - 1 ? " " : ""}</span>;
            }) : line.text?.trim() || <LyricInterlude active={active} />}
        </button>;
        })}
    </div>
    </div>);


  if (!text) return <div className="public-lyrics-empty" role="status">
    <div className="public-lyrics-empty-mark" aria-hidden="true"><span /><span /><span /></div>
    <h3>{current?.error ? 'Lyrics couldn’t load' : current?.instrumental ? 'An instrumental moment' : 'Lyrics aren’t here yet'}</h3>
    
    <div className="public-lyrics-actions">{current?.error && <button type="button" onClick={onRetry}>Retry</button>}</div>
  </div>;


  return (
    <div className="public-lyrics-view">
    <div className="public-lyrics-toolbar"><span>Lyrics · no timing available</span></div>
    <div className="public-lyrics-scroll no-scrollbar" aria-label="Song lyrics">
      {text.replace(/\r\n?/g, "\n").split("\n").map((line, index) =>
        line.trim() ? <p key={index} className="public-lyric-line public-lyric-plain selectable-content">{line}</p> :
        <div key={index} className="h-6" aria-hidden="true" />)}
    </div></div>);

}