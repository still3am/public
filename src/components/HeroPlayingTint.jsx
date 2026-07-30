import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Faded, smoothly flowing gradient overlay that bleeds the currently-playing
// track's cover-art colors across whatever parent it sits inside. Visible in
// both light and dark themes.
export default function HeroPlayingTint() {
  const { currentTrack, isPlaying } = usePlayer();
  const palette = useColorPalette(currentTrack?.cover_art_url);

  if (!isPlaying || !currentTrack?.cover_art_url) return null;

  return (
    <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out animate-[herotint_18s_ease-in-out_infinite]">
      <div
        className="absolute inset-0 animate-[herobreathe_9s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 18% 22%, ${palette[0]} 0, transparent 46%),` +
            `radial-gradient(circle at 78% 18%, ${palette[1]} 0, transparent 44%),` +
            `radial-gradient(circle at 60% 88%, ${palette[2]} 0, transparent 50%)`,
          filter: "blur(34px)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="absolute -inset-5 animate-[herobreathe_11s_ease-in-out_infinite] [animation-delay:-3s]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 22% 28%, ${palette[1]} 0, transparent 42%),` +
            `radial-gradient(circle at 72% 78%, ${palette[0]} 0, transparent 46%)`,
          filter: "blur(40px)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}