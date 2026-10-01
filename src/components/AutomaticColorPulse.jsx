import { usePlayer } from "@/context/PlayerContext";
import ColorPulse from "@/components/ColorPulse";

// The app-wide automatic pulse: whichever track is playing quietly breathes its
// cover palette across the whole app, on every page, with no per-page wiring.
// It sits behind the app's surfaces (negative z-index) so cards, controls and
// text stay crisp, and it fades itself out whenever playback stops.
export default function AutomaticColorPulse() {
  const { currentTrack, isPlaying } = usePlayer();
  const coverUrl = currentTrack?.cover_art_url;

  if (!coverUrl) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      <ColorPulse
        coverUrl={coverUrl}
        fixed
        active={!!isPlaying}
        strength={0.65}
      />
    </div>
  );
}