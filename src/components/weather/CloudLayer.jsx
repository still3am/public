// Layered, slowly drifting cloud blobs rendered as soft SVG puff groups for depth.
export default function CloudLayer({ density = 0.5 }) {
  const clouds = [
    { top: "-4%", scale: 1.4, dur: "70s", delay: "0s", o: 0.7, blur: "blur-3xl" },
    { top: "8%", scale: 0.9, dur: "95s", delay: "-20s", o: 0.5, blur: "blur-2xl" },
    { top: "26%", scale: 1.1, dur: "120s", delay: "-55s", o: 0.38, blur: "blur-2xl" },
    { top: "44%", scale: 0.7, dur: "85s", delay: "-38s", o: 0.28, blur: "blur-xl" },
  ].slice(0, Math.max(1, Math.round(density * 4)));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute animate-cloud-drift"
          style={{
            top: c.top,
            left: 0,
            opacity: c.o * (0.4 + density * 0.6),
            animationDuration: c.dur,
            animationDelay: c.delay,
            transform: `scale(${c.scale})`,
          }}
        >
          <svg
            width="26rem"
            height="8rem"
            viewBox="0 0 520 160"
            className={c.blur}
            style={{ filter: "saturate(1.05)" }}
          >
            <defs>
              <radialGradient id={`cg-${i}`} cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="70%" stopColor="rgba(245,250,255,0.55)" />
                <stop offset="100%" stopColor="rgba(245,250,255,0)" />
              </radialGradient>
            </defs>
            <g fill={`url(#cg-${i})`}>
              <circle cx="120" cy="95" r="55" />
              <circle cx="190" cy="75" r="68" />
              <circle cx="275" cy="85" r="58" />
              <circle cx="360" cy="78" r="64" />
              <circle cx="430" cy="95" r="50" />
              <ellipse cx="270" cy="120" rx="180" ry="34" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
}