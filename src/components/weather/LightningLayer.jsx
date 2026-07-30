import { useEffect, useState } from "react";

// Random full-bleed lightning flashes, double-strike like Apple Weather.
export default function LightningLayer() {
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let timer;
    const strike = () => {
      setFlash(0.55);
      setTimeout(() => setFlash(0), 90);
      setTimeout(() => setFlash(0.85), 190);
      setTimeout(() => setFlash(0), 330);
      timer = setTimeout(strike, 4000 + Math.random() * 7000);
    };
    timer = setTimeout(strike, 1500 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none bg-white transition-opacity duration-100"
      style={{ opacity: flash }}
    />
  );
}