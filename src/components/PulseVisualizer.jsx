import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Color-only "heartbeat" visualizer: the cover-art palette swells and contracts
// with the track's low-end energy, so the pulse follows the music's tempo
// instead of drawing bars.
//
// It runs automatically while a track plays — there is no toggle — and falls
// back to a neutral monochrome pulse when the track has no artwork (or its
// palette can't be read) so playback is never left without a visual.
export default function PulseVisualizer({ className = "" }) {
  const p = usePlayer();
  const track = p.currentTrack;
  const [primary, secondary, accent] = useColorPalette(track?.cover_art_url);
  const [beat, setBeat] = useState(0);
  const raf = useRef(null);
  const smooth = useRef(0);
  const hasArt = !!track?.cover_art_url;

  useEffect(() => {
    p.enableAnalyser?.();
    const loop = () => {
      const an = p.getAnalyser?.();
      if (an) {
        const data = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(data);
        // Low frequencies carry the kick — that's the "heart".
        const n = Math.max(4, Math.floor(data.length * 0.12));
        let sum = 0;
        for (let i = 0; i < n; i++) sum += data[i];
        const energy = sum / n / 255;
        // Fast attack, slow release => thump then relax.
        smooth.current =
          energy > smooth.current
            ? smooth.current + (energy - smooth.current) * 0.55
            : smooth.current + (energy - smooth.current) * 0.08;
        setBeat(smooth.current);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [p]);

  if (!track) return null;

  const scale = 1 + beat * 0.35;
  const opacity = 0.3 + Math.min(0.65, beat * 0.9);
  const colors = hasArt
    ? [primary, secondary, accent]
    : [
        "hsl(var(--foreground) / 0.55)",
        "hsl(var(--foreground) / 0.4)",
        "hsl(var(--foreground) / 0.3)",
      ];
  const [c1, c2, c3] = colors;

  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: "transform 90ms ease-out, opacity 140ms ease-out",
          backgroundImage:
            `radial-gradient(circle at 30% 30%, ${c1} 0, transparent 46%),` +
            `radial-gradient(circle at 72% 68%, ${c2} 0, transparent 46%),` +
            `radial-gradient(circle at 50% 88%, ${c3} 0, transparent 50%)`,
          filter: `blur(60px) saturate(${hasArt ? 1.7 : 1})`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${1 + beat * 0.6})`,
          opacity: opacity * 0.7,
          transition: "transform 130ms ease-out, opacity 180ms ease-out",
          backgroundImage: `radial-gradient(circle at 50% 50%, ${c1} 0, transparent 55%)`,
          filter: `blur(80px) saturate(${hasArt ? 1.6 : 1})`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}