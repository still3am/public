import { useRef, useEffect } from "react";

/**
 * Lightweight frequency-bar visualizer driven by a deck's AnalyserNode.
 * Reads `getAnalyser()` each animation frame so it picks up the node as soon
 * as the Web Audio graph is built (which happens on first load/play).
 */
export default function DeckVisualizer({ getAnalyser, active }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const analyser = getAnalyser();
      if (!analyser || !active) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const bars = 22;
      const step = Math.floor(buf.length / bars);
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = buf[i * step] / 255;
        const bh = Math.max(2, v * h);
        ctx.fillStyle = `rgba(255,255,255,${0.2 + v * 0.8})`;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [getAnalyser, active]);

  return <canvas ref={canvasRef} width={220} height={36} className="w-full h-9 mt-1.5" />;
}