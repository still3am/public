import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

const NEUTRAL = ["#53545b", "#383a43", "#777982"];

// The animation never creates an audio graph. Native playback stays available.
export default function PulseVisualizer({ className = "", palette = NEUTRAL }) {
  const p = usePlayer();
  const latest = useRef(p);
  latest.current = p;
  const primaryLayer = useRef(null);
  const accentLayer = useRef(null);
  const smooth = useRef(0);
  const phase = useRef(0);
  const [primary, secondary, accent] = palette;

  useEffect(() => {
    let frame = 0, lastTime = 0, analyser = null, bins = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paint = energy => {
      if (primaryLayer.current) {
        primaryLayer.current.style.transform = "translate3d(0,0,0) scale(" + (1.03 + energy * 0.11) + ")";
        primaryLayer.current.style.opacity = String(0.6 + energy * 0.18);
      }
      if (accentLayer.current) {
        accentLayer.current.style.transform = "translate3d(0,0,0) scale(" + (1.02 + energy * 0.16) + ")";
        accentLayer.current.style.opacity = String(0.3 + energy * 0.12);
      }
    };
    const loop = time => {
      frame = 0;
      if (document.hidden || motion.matches) { paint(0); return; }
      const dt = lastTime ? Math.min(64, Math.max(1, time - lastTime)) : 16;
      lastTime = time;
      phase.current += dt;
      const player = latest.current;
      let target = 0;
      if (player.isPlaying) {
        target = 0.18 + (Math.sin(phase.current / 850) + 1) * 0.12;
        const next = player.getAnalyser?.();
        if (next) {
          if (next !== analyser || bins?.length !== next.frequencyBinCount) {
            analyser = next;
            bins = new Uint8Array(next.frequencyBinCount);
          }
          try {
            analyser.getByteFrequencyData(bins);
            const count = Math.min(bins.length, Math.max(4, Math.floor(bins.length * 0.12)));
            let total = 0;
            for (let index = 0; index < count; index++) total += bins[index];
            target = count ? Math.min(1, total / count / 255) : 0;
          } catch { /* Keep the ambient pulse if the analyser is unavailable. */ }
        }
      }
      const duration = target > smooth.current ? 180 : 650;
      smooth.current += (target - smooth.current) * (1 - Math.exp(-dt / duration));
      paint(smooth.current);
      if (player.isPlaying || smooth.current > 0.002) frame = requestAnimationFrame(loop);
    };
    const resume = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (document.hidden || motion.matches) { paint(0); return; }
      frame = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    resume();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
    };
  }, [p.isPlaying]);

  return (
    <div className={"pointer-events-none overflow-hidden " + className}>
      <div ref={primaryLayer} className="absolute -inset-[12%]"
        style={{
          opacity: 0.6,
          transform: "translate3d(0,0,0) scale(1.03)",
          willChange: "transform, opacity",
          backgroundImage: "radial-gradient(ellipse at 25% 25%, " + primary + " 0, transparent 62%),radial-gradient(ellipse at 80% 60%, " + secondary + " 0, transparent 62%),radial-gradient(ellipse at 45% 85%, " + accent + " 0, transparent 58%)",
          filter: "blur(38px) saturate(1.45)",
        }} />
      <div ref={accentLayer} className="absolute -inset-[12%]"
        style={{
          opacity: 0.3,
          transform: "translate3d(0,0,0) scale(1.02)",
          willChange: "transform, opacity",
          backgroundImage: "radial-gradient(ellipse at 50% 55%, " + primary + " 0, transparent 62%)",
          filter: "blur(48px) saturate(1.35)",
        }} />
    </div>
  );
}
