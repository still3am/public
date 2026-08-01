import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function SyncedLyrics({ trackId, position, fallbackText = "", onSeek }) {
  const [lyrics, setLyrics] = useState(null);
  const [trackLyrics, setTrackLyrics] = useState("");
  const [loading, setLoading] = useState(true);
  const lineRefs = useRef([]);
  const scrollRef = useRef(null);
  const userScrollUntil = useRef(0);

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

  const ms = position * 1000;
  const lines = lyrics?.lines || [];
  const hasTimed = lines.length && lines.some((l) => l.start_time_ms || l.end_time_ms);

  let activeIdx = -1;
  if (hasTimed) {
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].start_time_ms || 0;
      if (ms >= s) activeIdx = i;
      else break;
    }
  }

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
      <div className="flex-1 grid place-items-center text-white/50">
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
              className={`block text-left w-full mb-3 transition-all duration-500 ${
                isActive ? "text-2xl font-extrabold" : "text-lg font-bold"
              }`}
              style={{
                opacity,
                transform: isActive ? "translateX(10px) scale(1.0)" : "translateX(0) scale(1)",
                filter: isActive ? "none" : "blur(0.3px)",
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
    return null;
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-10 text-white/85 text-xl font-extrabold leading-relaxed whitespace-pre-line">
      {text}
      <div className="h-24" />
    </div>
  );
}