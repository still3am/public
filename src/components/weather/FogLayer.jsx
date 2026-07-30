// Drifting, soft fog wisps for depth and haze.
export default function FogLayer() {
  const bands = [
    { top: "55%", dur: "60s", delay: "0s", o: 0.35, h: "h-24" },
    { top: "70%", dur: "80s", delay: "-25s", o: 0.28, h: "h-28" },
    { top: "82%", dur: "100s", delay: "-50s", o: 0.4, h: "h-32" },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bands.map((b, i) => (
        <div
          key={i}
          className={`absolute left-0 w-[150%] ${b.h} animate-cloud-drift`}
          style={{
            top: b.top,
            opacity: b.o,
            animationDuration: b.dur,
            animationDelay: b.delay,
            background:
              "linear-gradient(90deg, transparent, rgba(230,235,242,0.9) 50%, transparent)",
            filter: "blur(14px)",
          }}
        />
      ))}
    </div>
  );
}