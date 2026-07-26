export default function ScoreboardTrackCount({ count = 0 }) {
  const padded = String(Math.max(0, count)).padStart(3, "0");
  return (
    <div className="inline-block rounded-2xl p-[6px] bg-gradient-to-br from-zinc-200 via-zinc-500 to-black shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <div
        className="relative rounded-xl overflow-hidden px-4 py-3"
        style={{
          backgroundColor: "#111111",
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        <div
          className="text-center font-mono font-bold tracking-[0.35em] text-[9px] md:text-[10px] text-[#FF9A1F] mb-1.5"
          style={{ textShadow: "0 0 5px rgba(255,140,0,0.75)" }}
        >
          TRACKS
        </div>
        <div
          className="flex items-center justify-center gap-0.5 font-mono font-black text-[#FF8C00] leading-none tabular-nums"
          style={{ textShadow: "0 0 6px rgba(255,140,0,0.85), 0 0 14px rgba(255,69,0,0.55)" }}
        >
          {padded.split("").map((d, i) => (
            <span
              key={i}
              className="relative text-3xl md:text-4xl"
              aria-hidden={i < padded.length - String(Math.max(0, count)).length}
            >
              <span className="absolute inset-0 text-[#3a1d00] opacity-40 select-none">{d}</span>
              <span className="relative">{d}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}