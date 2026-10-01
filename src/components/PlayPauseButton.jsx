import { Play, Pause } from "lucide-react";

export default function PlayPauseButton({ isPlaying, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      className="w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-media-foreground text-media grid place-items-center ring-1 ring-media/25 shadow-lg hover:scale-105 active:scale-95 transition-transform duration-150">
      {isPlaying ? (
        <Pause size={28} fill="currentColor" strokeWidth={0} />
      ) : (
        <Play size={28} fill="currentColor" strokeWidth={0} className="ml-1" />
      )}
    </button>
  );
}