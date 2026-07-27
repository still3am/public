import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

// Reactive audio visualizer driven by a Web Audio AnalyserNode connected to
// the player's audio element. Falls back to a calm idle shimmer when the
// analyser isn't ready (e.g. before playback starts).
export default function AudioVisualizer({
  className = "",
  color = "#ffffff",
  bars = 56,
  mirror = true,
}) {
  const p = usePlayer();
  const pRef = useRef(p);
  pRef.current = p;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let active = true;
    let raf = 0;
    let freqs = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (!active) return;
      const player = pRef.current;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const analyser = player.getAnalyser?.();
      const playing = player.isPlaying;
      let data = null;
      if (analyser) {
        if (!freqs || freqs.length !== analyser.frequencyBinCount) {
          freqs = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqs);
        data = freqs;
      }

      const n = bars;
      const gap = 3;
      const bw = Math.max(1, (w - gap * (n - 1)) / n);

      for (let i = 0; i < n; i++) {
        let v;
        if (data) {
          const idx = Math.floor((i / n) * data.length * 0.7);
          v = data[idx] / 255;
        } else if (playing) {
          const t = Date.now() / 1000;
          v = 0.12 + 0.12 * Math.abs(Math.sin(t * 1.5 + i * 0.4));
        } else {
          v = 0.05 + 0.03 * Math.abs(Math.sin(Date.now() / 1600 + i * 0.5));
        }
        const barH = Math.max(2, v * h * (mirror ? 0.46 : 0.92));
        const x = i * (bw + gap);
        const baseY = mirror ? h / 2 : h;

        const grad = ctx.createLinearGradient(0, baseY - barH, 0, baseY + (mirror ? barH : 0));
        grad.addColorStop(0, color);
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.35 + 0.55 * v;
        ctx.fillRect(x, baseY - barH, bw, barH);
        if (mirror) ctx.fillRect(x, baseY, bw, barH);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, bars, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}