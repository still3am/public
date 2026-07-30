// Soft, slowly drifting cloud blobs. `density` 0–1 controls how many / how opaque.
export default function CloudLayer({ density = 0.5 }) {
  const clouds = [
    { top: "4%", size: "18rem", dur: "48s", delay: "0s", o: 0.5 },
    { top: "24%", size: "13rem", dur: "66s", delay: "-14s", o: 0.38 },
    { top: "-6%", size: "22rem", dur: "84s", delay: "-30s", o: 0.3 },
    { top: "42%", size: "15rem", dur: "58s", delay: "-46s", o: 0.28 },
  ].slice(0, Math.max(1, Math.round(density * 4)));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute animate-cloud-drift rounded-full bg-white blur-2xl"
          style={{
            top: c.top,
            width: c.size,
            height: `calc(${c.size} * 0.45)`,
            opacity: c.o * (0.4 + density * 0.6),
            animationDuration: c.dur,
            animationDelay: c.delay,
          }}
        />
      ))}
    </div>
  );
}