import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Color-only "heartbeat" visualizer: the cover-art palette swells and contracts
// with the track's low-end energy, so the pulse follows the music's tempo
// instead of drawing bars.
export default function PulseVisualizer({ className = "" }) {
  const p = usePlayer();
  const [primary, secondary, accent] = useColorPalette(p.currentTrack?.cover_art_url);
  const [beat, setBeat] = useState(0);
  const raf = useRef(null);
  const smooth = useRef(0);

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

  const scale = 1 + beat * 0.35;
  const opacity = 0.3 + Math.min(0.65, beat * 0.9);

  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: "transform 90ms ease-out, opacity 140ms ease-out",
          backgroundImage:
            `radial-gradient(circle at 30% 30%, ${primary} 0, transparent 46%),` +
            `radial-gradient(circle at 72% 68%, ${secondary} 0, transparent 46%),` +
            `radial-gradient(circle at 50% 88%, ${accent} 0, transparent 50%)`,
          filter: "blur(60px) saturate(1.7)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${1 + beat * 0.6})`,
          opacity: opacity * 0.7,
          transition: "transform 130ms ease-out, opacity 180ms ease-out",
          backgroundImage:
            `radial-gradient(circle at 50% 50%, ${primary} 0, transparent 55%)`,
          filter: "blur(80px) saturate(1.6)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}