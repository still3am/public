import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Color-only "heartbeat" visualizer. The cover-art palette swells with the
// track's low-end energy. Levels are normalized against a rolling floor/ceiling
// so quiet and loud masters both pulse, and layers drift slowly so the light
// feels alive between beats. Styles are written straight to the DOM to keep
// it smooth at 60fps.
export default function PulseVisualizer({ className = "" }) {
  const p = usePlayer();
  const [primary, secondary, accent] = useColorPalette(p.currentTrack?.cover_art_url);
  const layerA = useRef(null);
  const layerB = useRef(null);
  const layerC = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    p.enableAnalyser?.();
    let bass = 0;
    let mids = 0;
    let floor = 1;
    let ceil = 0;
    let t = 0;
    let buf = null;

    const loop = () => {
      const an = p.getAnalyser?.();
      if (an) {
        if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(buf);

        const lowN = Math.max(4, Math.floor(buf.length * 0.08));
        const midN = Math.max(lowN + 4, Math.floor(buf.length * 0.35));
        let lowSum = 0;
        let midSum = 0;
        for (let i = 0; i < lowN; i++) lowSum += buf[i];
        for (let i = lowN; i < midN; i++) midSum += buf[i];
        const rawLow = lowSum / lowN / 255;
        const rawMid = midSum / (midN - lowN) / 255;

        // rolling dynamic range so the pulse auto-gains to the track
        floor = Math.min(floor + 0.002, rawLow < floor ? rawLow : floor + 0.0006);
        ceil = Math.max(ceil - 0.0025, rawLow > ceil ? rawLow : ceil - 0.0008);
        const span = Math.max(0.06, ceil - floor);
        const norm = Math.min(1, Math.max(0, (rawLow - floor) / span));

        // fast attack, slow release => thump then relax
        bass += (norm - bass) * (norm > bass ? 0.16 : 0.045);
        mids += (rawMid - mids) * 0.05;
      }

      t += 0.0035;
      const drift = (a, b) => `${50 + Math.sin(t * a) * 14}% ${50 + Math.cos(t * b) * 14}%`;
      const glow = 0.26 + Math.min(0.6, bass * 0.85);

      if (layerA.current) {
        layerA.current.style.transform = `scale(${1 + bass * 0.18})`;
        layerA.current.style.opacity = glow;
        layerA.current.style.backgroundPosition = `${drift(1, 0.8)}, ${drift(0.7, 1.2)}, ${drift(1.3, 0.6)}`;
      }
      if (layerB.current) {
        layerB.current.style.transform = `scale(${1 + bass * 0.45})`;
        layerB.current.style.opacity = glow * 0.75;
      }
      if (layerC.current) {
        layerC.current.style.opacity = 0.1 + mids * 0.4;
        layerC.current.style.transform = `scale(${1.1 + mids * 0.2}) rotate(${Math.sin(t * 0.5) * 8}deg)`;
      }

      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [p]);

  return (
    <div className={`pointer-events-none overflow-hidden ${className}`}>
      <div
        ref={layerA}
        className="absolute inset-0"
        style={{
          backgroundImage:
            `radial-gradient(circle at 30% 30%, ${primary} 0, transparent 46%),` +
            `radial-gradient(circle at 72% 68%, ${secondary} 0, transparent 46%),` +
            `radial-gradient(circle at 50% 88%, ${accent} 0, transparent 50%)`,
          backgroundSize: "160% 160%, 150% 150%, 170% 170%",
          filter: "blur(65px) saturate(1.8)",
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={layerB}
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 55%, ${primary} 0, transparent 55%)`,
          filter: "blur(85px) saturate(1.6)",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={layerC}
        className="absolute -inset-1/4"
        style={{
          backgroundImage: `conic-gradient(from 0deg, ${accent}, transparent 35%, ${secondary}, transparent 75%, ${accent})`,
          filter: "blur(100px) saturate(1.4)",
          mixBlendMode: "screen",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}