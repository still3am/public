import LyricInterlude from "@/components/LyricInterlude";
import { useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";

/** @param {any} props */
export default function SyncedLyrics({ trackId, position, resolvedLyrics, onSeek, onRetry, onFindMatch }) {
  const lineRefs = useRef([]);
  const scrollRef = useRef(null);
  const activeRef = useRef(-1);
  const userScrollUntil = useRef(0);
  const resumeTimer = useRef(null);

  useEffect(() => {
    lineRefs.current=[];userScrollUntil.current=0;clearTimeout(resumeTimer.current);
  },[trackId,resolvedLyrics]);
  const current=resolvedLyrics?.trackId===trackId?resolvedLyrics:null;
  const lyrics=current?.record||null;
  const trackLyrics=current?.text||'';
  const loading=!current||current.loading===true;

  const ms = Math.max(0, Number(position) || 0) * 1000;
  const lines = useMemo(() => (Array.isArray(lyrics?.lines) ? lyrics.lines : []).
  filter((line) => Number.isFinite(Number(line.start_time_ms)) && Number(line.start_time_ms) >= 0).
  slice().sort((a, b) => Number(a.start_time_ms) - Number(b.start_time_ms)),[lyrics?.lines]);
  const displayLines=useMemo(()=>lines.length&&Number(lines[0].start_time_ms)>=3000?[{text:'♪',start_time_ms:0,end_time_ms:Number(lines[0].start_time_ms)},...lines]:lines,[lines]);
  const hasTimed = displayLines.length > 0 && displayLines.some((line) => Number(line.start_time_ms) > 0 || Number(line.end_time_ms) > 0);
  let activeIdx = -1;
  if (hasTimed) {
    for (let index = 0; index < displayLines.length; index++) {
      if (ms >= Number(displayLines[index].start_time_ms)) activeIdx = index;else
      break;
    }
  }
  activeRef.current = activeIdx;

  const centerActive = () => {
    const container = scrollRef.current;
    const line = lineRefs.current[activeRef.current];
    if (!container || !line || Date.now() < userScrollUntil.current) return;
    // Bounding rectangles use the actual scroll viewport, not an outer positioned ancestor.
    const top = container.scrollTop + line.getBoundingClientRect().top - container.getBoundingClientRect().top -
    container.clientHeight * 0.32;
    const target = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, top));
    if (Math.abs(container.scrollTop - target) > 2) container.scrollTo({
      top: target,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  };

  useEffect(() => {
    if (loading || activeIdx < 0) return;
    const frame = requestAnimationFrame(centerActive);
    return () => cancelAnimationFrame(frame);
  }, [activeIdx, loading, trackId]);

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
  if (loading) return <div role="status" aria-label="Finding lyrics" className="flex-1 grid place-items-center text-white/60"><Loader2 className="animate-spin" size={22} /></div>;

  if (hasTimed) return (
    <div ref={scrollRef} onWheel={markUserScroll} onTouchStart={markUserScroll} onTouchMove={markUserScroll}
    className="public-lyrics-scroll no-scrollbar" aria-label="Synced song lyrics">
      {displayLines.map((line, index) => {
        const active = index === activeIdx;
        const distance = activeIdx < 0 ? index : Math.abs(index - activeIdx);
        const opacity = active ? 1 : distance <= 1 ? 0.72 : distance === 2 ? 0.52 : 0.36;
        return <button type="button" key={index} ref={(element) => {lineRefs.current[index] = element;}}
        onClick={() => seekLine(line)} aria-current={active ? "true" : undefined}
        className="public-lyric-line selectable-content"
        style={{ opacity, filter: "none" }}>
          {/^(?:[♪♫]+|\[?(?:instrumental|music|interlude|solo)\]?)$/i.test(line.text?.trim()||"") ? <LyricInterlude active={active}/> : Array.isArray(line.words) && line.words.length ? line.words.map((word, wordIndex) => {
            const start = Number(word.start_time_ms),end = Number(word.end_time_ms);
            const valid = Number.isFinite(start) && Number.isFinite(end) && end > start;
            const progress = valid ? Math.max(0, Math.min(1, (ms - start) / (end - start))) : 1;
            return <span key={wordIndex} style={active && valid ? {
              backgroundImage: "linear-gradient(to right,#fff " + progress * 100 + "%,rgba(255,255,255,.4) " + progress * 100 + "%)",
              backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent"
            } : undefined}>{word.text}{wordIndex < line.words.length - 1 ? " " : ""}</span>;
          }) : line.text?.trim() || <LyricInterlude active={active}/>}
        </button>;
      })}
    </div>);


  if (!text) return <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 text-white/70 text-sm" role="status"><p>{current?.error|| (current?.instrumental?'This recording is instrumental.':'No matching lyrics on LRCLIB yet.')}</p><div className="flex flex-wrap justify-center gap-2">{current?.error&&<button className="rounded-full border border-white/25 px-4 py-3" onClick={onRetry}>Retry</button>}<button className="rounded-full border border-white/25 px-4 py-3" onClick={onFindMatch}>Find another match</button></div></div>;

  return (
    <div className="public-lyrics-scroll no-scrollbar" aria-label="Song lyrics">
      {text.replace(/\r\n?/g, "\n").split("\n").map((line, index) =>
      line.trim() ? <p key={index} className="public-lyric-line public-lyric-plain selectable-content">{line}</p> :
      <div key={index} className="h-6" aria-hidden="true" />)}
    </div>);

}