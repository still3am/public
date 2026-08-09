import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useColorPalette } from "@/hooks/useColorPalette";

// Fades the profile song's cover-art colors across the hero background,
// mirroring the homepage's HeroPlayingTint effect.
export default function ProfileSongTint({ trackId }) {
  const [coverUrl, setCoverUrl] = useState("");
  const [primary, secondary, accent] = useColorPalette(coverUrl);

  useEffect(() => {
    if (!trackId) { setCoverUrl(""); return; }
    base44.entities.Track.get(trackId)
      .then((t) => setCoverUrl(t?.cover_art_url || ""))
      .catch(() => setCoverUrl(""));
  }, [trackId]);

  if (!coverUrl) return null;

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