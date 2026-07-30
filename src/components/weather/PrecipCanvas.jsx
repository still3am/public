import { useEffect, useRef } from "react";

// Canvas particle field for falling rain (with splash ripples) or drifting snow.
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
    const drift = Math.max(-3, Math.min(3, wind / 10));

    // Two depth layers for parallax: far (slower, lighter, smaller) and near.
    const layers = isSnow
      ? [
          { count: Math.round(40 * intensity), speedMul: 0.4, size: [0.8, 1.8], alpha: 0.25 },
          { count: Math.round(70 * intensity), speedMul: 1.1, size: [1.6, 3.4], alpha: 0.6 },
        ]
      : [
          { count: Math.round(60 * intensity), speedMul: 0.55, size: [6, 11], alpha: 0.18 },
          { count: Math.round(130 * intensity), speedMul: 1.25, size: [10, 18], alpha: 0.42 },
        ];

    let parts = [];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        parts.push(makePart(layer, true));
      }
    }
    function makePart(layer, preplace) {
      const sz = layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]);
      return {
        layer,
        x: Math.random() * w,
        y: preplace ? Math.random() * h : -Math.random() * h * 0.5,
        size: sz,
        speed: (isSnow ? 0.35 + Math.random() * 0.7 : 4 + Math.random() * 5) * layer.speedMul,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.025,
        swayAmp: isSnow ? 0.4 + Math.random() * 0.8 : 0.1 + Math.random() * 0.4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        alpha: layer.alpha * (0.6 + Math.random() * 0.4),
      };
    }

    // Splash ripples (rain only) at the bottom edge.
    const splashes = [];
    const groundY = h;

    const drawSnowflake = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(220,235,255,0.6)";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawRaindrop = (p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + drift * 2.5, p.y + p.size);
      grad.addColorStop(0, "rgba(170,200,240,0)");
      grad.addColorStop(1, "rgba(190,215,250,0.85)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.6, p.size * 0.12);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + drift * 2.5, p.y + p.size);
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y += p.speed;
        p.sway += p.swaySpeed;
        p.rot += p.rotSpeed;
        p.x += drift + Math.sin(p.sway) * p.swayAmp;
        if (p.y > groundY + 12) {
          if (!isSnow && p.layer === layers[1] && Math.random() < 0.25) {
            splashes.push({ x: p.x, r: 0, alpha: 0.5 });
          }
          p.y = -14;
          p.x = Math.random() * w;
        }
        if (p.x > w + 24) p.x = -24;
        if (p.x < -24) p.x = w + 24;
        isSnow ? drawSnowflake(p) : drawRaindrop(p);
      }

      // splash ripples
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.r += 0.6;
        s.alpha -= 0.02;
        if (s.alpha <= 0) {
          splashes.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = "rgba(190,215,245,0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(s.x, groundY - 2, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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