import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

const BAR_COUNT = 28;

export default function MixerVisualizer() {
  const p = usePlayer();
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const barsRef = useRef(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const analyser = p.getAnalyser?.();
      const bars = barsRef.current;
      const gap = 3;
      const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;

      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const step = Math.floor(buf.length / BAR_COUNT) || 1;
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buf[i * step + j] || 0;
          const v = sum / step / 255;
          // ease toward target for smooth motion
          bars[i] = bars[i] * 0.65 + v * 0.35;
        }
      } else {
        // no analyser — idle shimmer
        const t = Date.now() / 600;
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = 0.12 + 0.1 * Math.sin(t + i * 0.5);
          bars[i] = bars[i] * 0.8 + v * 0.2;
        }
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const v = bars[i];
        const barH = Math.max(2, v * h);
        const x = i * (barW + gap);
        const y = h - barH;
        const alpha = 0.3 + v * 0.7;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        const r = Math.min(barW / 2, 2);
        // rounded-top bar
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, h);
        ctx.lineTo(x, h);
        ctx.closePath();
        ctx.fill();
      }
    }
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [p]);

  return <canvas ref={canvasRef} className="w-full h-16" />;
}