import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Faded, animated gradient overlay that bleeds the currently-playing track's
// cover-art colors across whatever parent it sits inside. Visible in both
// light and dark themes.
export default function HeroPlayingTint() {
  const { currentTrack, isPlaying } = usePlayer();
  const palette = useColorPalette(currentTrack?.cover_art_url);

  if (!isPlaying || !currentTrack?.cover_art_url) return null;

  return (
    <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 animate-[herotint_14s_ease-in-out_infinite]">
      <div
        className="absolute inset-0 opacity-20 animate-pulse [animation-duration:6s]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 18% 22%, ${palette[0]} 0, transparent 46%),` +
            `radial-gradient(circle at 78% 18%, ${palette[1]} 0, transparent 44%),` +
            `radial-gradient(circle at 60% 88%, ${palette[2]} 0, transparent 50%)`,
          filter: "blur(28px)",
          mixBlendMode: "multiply",
        }}
      />
      {/* On dark backgrounds multiply fades to black, so layer a soft screen pass too */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-25 animate-pulse [animation-duration:8s] [animation-delay:1.5s]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 22% 28%, ${palette[1]} 0, transparent 42%),` +
            `radial-gradient(circle at 72% 78%, ${palette[0]} 0, transparent 46%)`,
          filter: "blur(32px)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}