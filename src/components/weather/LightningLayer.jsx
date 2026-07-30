import { useEffect, useRef, useState } from "react";

// Generate a jagged lightning bolt polyline from top of box to a strike point.
function makeBolt(startX, endX, h) {
  const points = [[startX, 0]];
  const steps = 9 + Math.floor(Math.random() * 5);
  let y = 0;
  let x = startX;
  for (let i = 1; i <= steps; i++) {
    y = (h * i) / steps;
    const jitter = (Math.random() - 0.5) * 70;
    x = startX + ((endX - startX) / steps) * i + jitter;
    points.push([x, y]);
  }
  // a fork
  const forkStart = points[Math.floor(steps * 0.6)];
  points.push([forkStart[0] + (Math.random() - 0.5) * 80, h * (0.78 + Math.random() * 0.12)]);
  points.push(forkStart);
  points.push([endX, h]);
  return points;
}

// Random full-bleed lightning flashes + jagged bolt SVG, double-strike like Apple Weather.
export default function LightningLayer() {
  const [flash, setFlash] = useState(0);
  const [bolt, setBolt] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    let timer;
    const strike = () => {
      const box = boxRef.current;
      const w = box ? box.clientWidth : 400;
      const h = box ? box.clientHeight : 200;
      const startX = w * (0.3 + Math.random() * 0.4);
      const endX = startX + (Math.random() - 0.5) * w * 0.4;
      setBolt(makeBolt(startX, endX, h));
      setFlash(0.5);
      setTimeout(() => setFlash(0), 70);
      setTimeout(() => setFlash(0.9), 150);
      setTimeout(() => setFlash(0), 260);
      timer = setTimeout(strike, 3500 + Math.random() * 6000);
    };
    timer = setTimeout(strike, 1200 + Math.random() * 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 bg-white transition-opacity duration-[60ms]"
        style={{ opacity: flash }}
      />
      {flash > 0 && bolt && (
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <polyline
            points={bolt.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px rgba(220,230,255,0.9))" }}
          />
        </svg>
      )}
    </div>
  );
}