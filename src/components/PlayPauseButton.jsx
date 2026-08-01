import { Play, Pause } from "lucide-react";

export default function PlayPauseButton({ isPlaying, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? "Pause" : "Play"}
      className="w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-white text-black grid place-items-center ring-1 ring-black/20 shadow-[0_12px_34px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-transform duration-150">
      {isPlaying ? (
        <Pause size={28} fill="black" strokeWidth={0} />
      ) : (
        <Play size={28} fill="black" strokeWidth={0} className="ml-1" />
      )}
    </button>
  );
}