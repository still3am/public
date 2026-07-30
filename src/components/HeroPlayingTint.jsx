import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";
import AudioVisualizer from "@/components/AudioVisualizer";

// A layered, reactive visualizer that takes over the hero while a track plays:
//   1. a slow breathing glow tinted from the cover artwork
//   2. a mirrored bar visualizer along the bottom, driven by live audio
export default function HeroPlayingTint() {
  const { currentTrack, isPlaying, enableAnalyser } = usePlayer();
  const palette = useColorPalette(currentTrack?.cover_art_url);

  if (!isPlaying || !currentTrack?.cover_art_url) return null;

  // warm up the Web Audio analyser so the bars react to real frequencies
  enableAnalyser?.();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* breathing color glow from cover-art palette */}
      <div
        className="absolute inset-0 transition-opacity duration-700 animate-[herotint_14s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 18% 22%, ${palette[0]} 0, transparent 46%),` +
            `radial-gradient(circle at 78% 18%, ${palette[1]} 0, transparent 44%),` +
            `radial-gradient(circle at 60% 88%, ${palette[2]} 0, transparent 50%)`,
          opacity: 0.2,
          mixBlendMode: "screen",
        }}
      />
      {/* soft top sheen */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 opacity-50"
        style={{
          background:
            `linear-gradient(to bottom, ${palette[1]}14, transparent)`,
        }}
      />
      {/* live bar visualizer along the base */}
      <div className="absolute inset-x-0 bottom-0 h-24 md:h-28 opacity-70">
        <AudioVisualizer bars={64} mirror className="w-full h-full" />
      </div>
    </div>
  );
}