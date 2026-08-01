import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Color-only "heartbeat" visualizer. Instead of just tracking loudness, this
// runs a simple onset detector on the bass band: whenever the current kick
// energy jumps well above the recent running average, it fires a beat and the
// palette snaps outward, then decays — so the pulse locks to the tempo.
export default function PulseVisualizer({ className = "" }) {
  const p = usePlayer();
  const [primary, secondary, accent] = useColorPalette(p.currentTrack?.cover_art_url);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    p.enableAnalyser?.();
    let avg = 0; // running bass average
    let level = 0; // smoothed sustained level
    let hit = 0; // beat impulse, decays each frame
    let cooldown = 0; // frames to wait before another beat can fire

    const loop = () => {
      const an = p.getAnalyser?.();
      if (an) {
        const data = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(data);
        // Low frequencies carry the kick — that's the "heart".
        const n = Math.max(4, Math.floor(data.length * 0.1));
        let sum = 0;
        for (let i = 0; i < n; i++) sum += data[i];
        const energy = sum / n / 255;

        avg = avg === 0 ? energy : avg + (energy - avg) * 0.04;
        level += (energy - level) * (energy > level ? 0.4 : 0.07);

        // Onset: a clear spike over the local average, with a short refractory
        // period so one kick doesn't register as several beats.
        if (cooldown > 0) cooldown -= 1;
        if (energy > avg * 1.35 && energy > 0.08 && cooldown === 0) {
          hit = Math.min(1, (energy - avg) * 3.5);
          cooldown = 9;
        }
        hit *= 0.86;

        const swell = level * 0.45 + hit;
        if (outerRef.current) {
          outerRef.current.style.transform = `scale(${1 + swell * 0.3})`;
          outerRef.current.style.opacity = String(0.28 + Math.min(0.6, swell * 0.8));
        }
        if (innerRef.current) {
          innerRef.current.style.transform = `scale(${1 + swell * 0.75})`;
          innerRef.current.style.opacity = String(0.2 + Math.min(0.65, hit * 0.9));
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [p]);

  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <div
        ref={outerRef}
        className="absolute inset-0"
        style={{
          transition: "transform 70ms ease-out, opacity 110ms ease-out",
          backgroundImage:
            `radial-gradient(circle at 30% 30%, ${primary} 0, transparent 46%),` +
            `radial-gradient(circle at 72% 68%, ${secondary} 0, transparent 46%),` +
            `radial-gradient(circle at 50% 88%, ${accent} 0, transparent 50%)`,
          filter: "blur(60px) saturate(1.7)",
        }}
      />
      <div
        ref={innerRef}
        className="absolute inset-0"
        style={{
          transition: "transform 55ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease-out",
          backgroundImage: `radial-gradient(circle at 50% 50%, ${primary} 0, transparent 55%)`,
          filter: "blur(80px) saturate(1.6)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}