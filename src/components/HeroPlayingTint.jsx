import { usePlayer } from "@/context/PlayerContext";
import ColorPulse from "@/components/ColorPulse";

// Bleeds the currently-playing track's cover palette across the hero, and
// only while something is actually playing.
export default function HeroPlayingTint() {
  const { currentTrack, isPlaying } = usePlayer();

  if (!isPlaying) return null;

  return <ColorPulse coverUrl={currentTrack?.cover_art_url} />;
}