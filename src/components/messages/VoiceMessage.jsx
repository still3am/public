import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

function formatDuration(sec) {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceMessage({ url, isMine }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  };

  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-[18px] max-w-[260px] ${isMine ? "bg-foreground text-background" : "bg-foreground/[0.08] text-foreground"}`}>
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${isMine ? "bg-background/15" : "bg-foreground/10"}`}
      >
        {playing ? <Pause size={16} className={isMine ? "text-background" : "text-foreground"} /> : <Play size={16} className={`ml-0.5 ${isMine ? "text-background" : "text-foreground"}`} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${isMine ? "bg-background/20" : "bg-foreground/15"}`}>
          <div
            className={`h-full rounded-full transition-all ${isMine ? "bg-background" : "bg-foreground"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className={`text-xs tabular-nums shrink-0 ${isMine ? "text-background/60" : "text-foreground/50"}`}>
        {formatDuration(playing || progress > 0 ? duration * (1 - progress) : duration)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => { if (e.target.duration) setProgress(e.target.currentTime / e.target.duration); }}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}