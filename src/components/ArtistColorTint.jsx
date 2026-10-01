import ColorPulse from "@/components/ColorPulse";

// Breathing gradient bleed built from an artist's dominant cover palette.
export default function ArtistColorTint({ coverUrl }) {
  return <ColorPulse coverUrl={coverUrl} />;
}