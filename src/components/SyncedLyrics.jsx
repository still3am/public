import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/context/PlayerContext";
import { Loader2 } from "lucide-react";

// Karaoke fill: the sung part of the active line is painted solid, the rest
// stays dim, and the split point sweeps across the line as it plays.
const FILL =
  "linear-gradient(90deg, hsl(var(--media-foreground)) 0 var(--fill, 0%)," +
  " hsl(var(--media-foreground) / 0.35) var(--fill, 0%) 100%)";

// A line runs until its recorded end, else the next line's start, else a short
// default — so the fill always has a window to travel.
function lineWindow(lines, i) {
  const start = lines[i]?.start_time_ms || 0;
  const recorded = lines[i]?.end_time_ms || 0;
  if (recorded > start) return [start, recorded];
  const next = lines[i + 1]?.start_time_ms || 0;
  if (next > start) return [start, next];
  return [start, start + 4000];
}

export default function SyncedLyrics({ trackId, position, fallbackText = "", onSeek }) {
  const { isPlaying } = usePlayer();
  const [lyrics, setLyrics] = useState(null);
  const [trackLyrics, setTrackLyrics] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);

  const lineRefs = useRef([]);
  const scrollRef = useRef(null);
  const userScrollUntil = useRef(0);
  const msRef = useRef(position * 1000);
  const activeRef = useRef(-1);
  const linesRef = useRef([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLyrics(null);
    setTrackLyrics("");
    Promise.all([
      base44.entities.Lyrics
        .filter({ track_id: trackId, status: "approved" }, "-created_date", 5)
        .catch(() => []),
      base44.entities.Track.get(trackId).catch(() => null),
    ]).then(([lyricsRes, track]) => {
      if (!alive) return;
      const found = Array.isArray(lyricsRes) && lyricsRes.length ? lyricsRes[0] : null;
      setLyrics(found || null);
      setTrackLyrics(track?.lyrics_text || "");
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [trackId]);

  const lines = lyrics?.lines || [];
  const hasTimed = lines.length && lines.some((l) => l.start_time_ms || l.end_time_ms);
  linesRef.current = lines;

  // Paint the active line's fill from the current position. Kept imperative so
  // a 60fps sweep never re-renders the whole song.
  const paint = () => {
    const i = activeRef.current;
    const el = lineRefs.current[i];
    if (!el || i < 0) return;
    const [start, end] = lineWindow(linesRef.current, i);
    const progress = Math.max(0, Math.min(1, (msRef.current - start) / (end - start)));
    el.style.setProperty("--fill", `${(progress * 100).toFixed(2)}%`);
  };

  // Move playback to `ms`: re-highlight only when the line changes.
  const sync = (ms) => {
    msRef.current = ms;
    let idx = -1;
    const list = linesRef.current;
    for (let i = 0; i < list.length; i++) {
      if (ms >= (list[i].start_time_ms || 0)) idx = i;
      else break;
    }
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActiveIdx(idx);
    }
    paint();
  };

  // `position` is a ~4Hz sample from the audio element — resync to it.
  useEffect(() => {
    if (!hasTimed) return;
    sync(position * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, hasTimed, lyrics]);

  // ...and interpolate in between so the fill sweeps instead of stepping.
  useEffect(() => {
    if (!hasTimed || !isPlaying) return;
    let raf = null;
    let last = performance.now();
    const tick = (now) => {
      const delta = now - last;
      last = now;
      sync(msRef.current + delta);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTimed, isPlaying, lyrics]);

  useEffect(() => {
    if (activeIdx < 0) return;
    if (Date.now() < userScrollUntil.current) return;
    const el = lineRefs.current[activeIdx];
    const container = scrollRef.current;
    if (el && container) {
      const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }, [activeIdx]);

  const markUserScroll = () => {
    userScrollUntil.current = Date.now() + 4000;
  };

  if (loading) {
    return (
      <div className="flex-1 grid place-items-center text-media-foreground/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (hasTimed) {
    return (
      <div
        ref={scrollRef}
        onWheel={markUserScroll}
        onTouchStart={markUserScroll}
        onTouchMove={markUserScroll}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-10 leading-snug"
      >
        {lines.map((l, i) => {
          const isActive = i === activeIdx;
          const dist = Math.abs(i - activeIdx);
          const opacity = isActive ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.28 : 0.18;
          return (
            <button
              key={i}
              ref={(el) => (lineRefs.current[i] = el)}
              onClick={() => onSeek?.((l.start_time_ms || 0) / 1000)}
              className={`selectable-content block text-left w-full mb-3 transition-all duration-500 ${
                isActive
                  ? "text-2xl font-extrabold bg-clip-text text-transparent"
                  : "text-lg font-bold"
              }`}
              style={{
                opacity,
                transform: isActive ? "translateX(10px)" : "translateX(0)",
                filter: isActive ? "none" : "blur(0.3px)",
                ...(isActive ? { backgroundImage: FILL } : null),
              }}
            >
              {l.text && l.text.trim() ? l.text : "♪"}
            </button>
          );
        })}
        <div className="h-24" />
      </div>
    );
  }

  const text = trackLyrics.trim() || fallbackText.trim();
  if (!text) {
    return (
      <div className="flex-1 flex items-center justify-center text-media-foreground/40 italic text-center px-6">
        No lyrics available for this track yet.
      </div>
    );
  }
  return (
    <div className="selectable-content flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-10 text-media-foreground/85 text-xl font-extrabold leading-relaxed whitespace-pre-line">
      {text}
      <div className="h-24" />
    </div>
  );
}