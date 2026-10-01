import { useColorPalette } from "@/hooks/useColorPalette";

// The app's single color pulse: a faded, breathing gradient bleed built from a
// cover art's real dominant palette — no artificial hue shifts.
//
// - `fixed`    pins it to the viewport instead of the parent (page ambience).
// - `active`   fades it out without unmounting, so playback stopping doesn't
//              pop. The fade lives on the gradient layers themselves: an
//              ancestor with opacity < 1 isolates them and mix-blend-mode
//              would stop blending with the page.
// - `strength` 0–1 dials the wash down for full-page ambience.
export default function ColorPulse({
  coverUrl,
  fixed = false,
  active = true,
  strength = 1,
  className = "",
}) {
  const [primary, secondary, accent] = useColorPalette(coverUrl);

  if (!coverUrl) return null;

  const tone = `saturate(${(1.6 * strength).toFixed(2)}) brightness(${(1.15 * strength).toFixed(2)})`;

  return (
    <div
      className={`${fixed ? "fixed" : "absolute"} inset-0 pointer-events-none ${className}`}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
          active
            ? "animate-[herobreathebright_9s_ease-in-out_infinite]"
            : "opacity-0"
        }`}
        style={{
          backgroundImage:
            `radial-gradient(circle at 25% 25%, ${primary} 0, transparent 48%),` +
            `radial-gradient(circle at 75% 75%, ${secondary} 0, transparent 48%),` +
            `radial-gradient(circle at 50% 90%, ${accent} 0, transparent 50%)`,
          filter: `blur(38px) ${tone}`,
          mixBlendMode: "multiply",
        }}
      />
      <div
        className={`absolute -inset-5 transition-opacity duration-1000 ease-out ${
          active
            ? "animate-[herobreathebright_11s_ease-in-out_infinite] [animation-delay:-3s]"
            : "opacity-0"
        }`}
        style={{
          backgroundImage:
            `radial-gradient(circle at 35% 30%, ${primary} 0, transparent 44%),` +
            `radial-gradient(circle at 70% 72%, ${secondary} 0, transparent 44%)`,
          filter: `blur(44px) ${tone}`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}