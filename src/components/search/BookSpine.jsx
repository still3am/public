function hash(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 1000003;
  return Math.abs(h);
}

export default function BookSpine({ genre, count, hue, index, onClick }) {
  const heightPct = 62 + hash(genre, 7) % 38; // 62–100% of row
  const lightness = 30 + (hash(genre, 13) % 18); // 30–48
  const base = `hsl(${hue}, 46%, ${lightness}%)`;
  const mid = `hsl(${hue}, 50%, ${Math.min(lightness + 12, 60)}%)`;
  const dark = `hsl(${hue}, 44%, ${Math.max(lightness - 16, 8)}%)`;
  const ink = lightness < 40 ? "#f5ead2" : "#1c140a";
  // tilt a couple of books for a lived-in look
  const tilt = hash(genre, 3) % 7 === 0 ? (hash(genre, 5) % 2 ? 3 : -3) : 0;

  return (
    <button
      onClick={onClick}
      style={{
        height: `${heightPct}%`,
        transform: `rotate(${tilt}deg)`,
        background: `linear-gradient(90deg, ${dark} 0%, ${base} 18%, ${mid} 50%, ${base} 82%, ${dark} 100%)`,
      }}
      className="group relative shrink-0 w-7 sm:w-9 max-w-[44px] rounded-[3px_3px_2px_2px] overflow-hidden transition-transform duration-200 ease-out hover:-translate-y-2 hover:rotate-0 hover:z-10 active:scale-[0.97] shadow-[1px_0_2px_rgba(0,0,0,0.4)]"
      aria-label={`Browse ${genre}`}>

      {/* top + bottom caps */}
      <span className="absolute inset-x-0 top-0 h-2" style={{ background: dark }} />
      <span className="absolute inset-x-0 bottom-0 h-2.5" style={{ background: dark }} />

      {/* decorative bands */}
      <span className="absolute inset-x-[18%] top-[14%] h-px opacity-60" style={{ background: mid }} />
      <span className="absolute inset-x-[18%] bottom-[14%] h-px opacity-60" style={{ background: mid }} />

      {/* pages peeking on the fore-edge */}
      <span
        className="absolute right-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm"
        style={{ background: "linear-gradient(#e9dcc0,#c9b48a)" }} />

      {/* title plate */}
      <span
        className="absolute inset-y-3 left-1/2 -translate-x-1/2 rounded-[2px] flex items-center justify-center"
        style={{ writingMode: "vertical-rl", color: ink }}>
        <span className="text-[8px] sm:text-[10px] font-serif font-semibold tracking-[0.12em] uppercase whitespace-nowrap">
          {genre}
        </span>
      </span>

      {/* hover count */}
      {count > 0 && (
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full bg-black/60 text-white text-[8px] sm:text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {count}
        </span>
      )}

      {/* glossy spine sheen */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.18)_0%,transparent_35%,transparent_65%,rgba(0,0,0,0.22)_100%)]" />
    </button>
  );
}