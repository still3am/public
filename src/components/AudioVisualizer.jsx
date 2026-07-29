import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useColorPalette } from "@/hooks/useColorPalette";

// Reactive audio visualizer driven by a Web Audio AnalyserNode connected to
// the player's audio element. Bars are tinted with colors sampled from the
// current track's album cover, with smoothing and a soft glow.
export default function AudioVisualizer({
  className = "",
  bars = 56,
  mirror = true,
}) {
  const p = usePlayer();
  const pRef = useRef(p);
  pRef.current = p;
  const canvasRef = useRef(null);
  const palette = useColorPalette(p.currentTrack?.cover_art_url);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let active = true;
    let raf = 0;
    let freqs = null;
    const smooth = new Float32Array(bars);

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
      const [c1, c2, c3] = paletteRef.current;
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
      const radius = Math.min(bw / 2, 3);

      for (let i = 0; i < n; i++) {
        let v;
        if (data) {
          // log-ish spread so lows don't dominate the whole width
          const frac = Math.pow(i / n, 1.5);
          const idx = Math.floor(frac * data.length * 0.75);
          v = data[idx] / 255;
        } else if (playing) {
          const t = Date.now() / 1000;
          v = 0.12 + 0.12 * Math.abs(Math.sin(t * 1.5 + i * 0.4));
        } else {
          v = 0.05 + 0.03 * Math.abs(Math.sin(Date.now() / 1600 + i * 0.5));
        }
        // temporal smoothing: fast attack, slow release
        smooth[i] = v > smooth[i] ? v : smooth[i] * 0.86 + v * 0.14;
        const sv = smooth[i];

        const barH = Math.max(2, sv * h * (mirror ? 0.46 : 0.92));
        const x = i * (bw + gap);
        const baseY = mirror ? h / 2 : h;
        const top = baseY - barH;

        const grad = ctx.createLinearGradient(0, top, 0, baseY + (mirror ? barH : 0));
        grad.addColorStop(0, c3);
        grad.addColorStop(0.5, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.shadowColor = c1;
        ctx.shadowBlur = 8 + 18 * sv;
        ctx.globalAlpha = 0.4 + 0.6 * sv;

        const totalH = mirror ? barH * 2 : barH;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, top, bw, totalH, radius);
        else ctx.rect(x, top, bw, totalH);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bars, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}