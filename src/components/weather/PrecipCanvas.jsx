import { useEffect, useRef } from "react";

// Canvas particle field for falling rain or drifting snow.
export default function PrecipCanvas({ type = "rain", intensity = 1, wind = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const isSnow = type === "snow";
    const count = Math.round((isSnow ? 60 : 120) * intensity);
    const drift = Math.max(-2.5, Math.min(2.5, wind / 12));
    const make = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: isSnow ? 1.2 + Math.random() * 2.2 : 8 + Math.random() * 14,
      speed: isSnow ? 0.4 + Math.random() * 0.8 : 4 + Math.random() * 5,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.45,
    });
    let parts = Array.from({ length: count }, make);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y += p.speed;
        p.sway += 0.02;
        p.x += drift + (isSnow ? Math.sin(p.sway) * 0.5 : 0);
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x > w + 20) p.x = -20;
        if (p.x < -20) p.x = w + 20;

        if (isSnow) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.arc(p.x, p.y, p.len, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(160,200,255,${p.alpha})`;
          ctx.lineWidth = 1.1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + drift * 2, p.y + p.len);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [type, intensity, wind]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}