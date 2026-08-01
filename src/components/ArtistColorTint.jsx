import { useColorPalette } from "@/hooks/useColorPalette";

// Bright, breathing gradient bleed built from a cover art's dominant palette.
export default function ArtistColorTint({ coverUrl }) {
  const [primary, secondary, accent] = useColorPalette(coverUrl);

  if (!coverUrl) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
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