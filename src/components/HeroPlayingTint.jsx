import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Faded, gentle gradient overlay that bleeds the currently-playing track's
// cover-art colors across its parent. Uses only the cover's real dominant
// palette — no artificial hue shifts. Visible in light and dark themes.
export default function HeroPlayingTint() {
  const { currentTrack, isPlaying } = usePlayer();
  const [primary, secondary, accent] = useColorPalette(currentTrack?.cover_art_url);

  if (!isPlaying || !currentTrack?.cover_art_url) return null;

  return (
    <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out">
      <div
        className="absolute inset-0 animate-[herobreathebright_9s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 25% 25%, ${primary} 0, transparent 48%),` +
            `radial-gradient(circle at 75% 75%, ${secondary} 0, transparent 48%),` +
            `radial-gradient(circle at 50% 90%, ${accent} 0, transparent 50%)`,
          filter: "blur(38px) saturate(1.6) brightness(1.15)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="absolute -inset-5 animate-[herobreathebright_11s_ease-in-out_infinite] [animation-delay:-3s]"
        style={{
          backgroundImage:
            `radial-gradient(circle at 35% 30%, ${primary} 0, transparent 44%),` +
            `radial-gradient(circle at 70% 72%, ${secondary} 0, transparent 44%)`,
          filter: "blur(44px) saturate(1.6) brightness(1.2)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}