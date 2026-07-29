// Deterministic solid color per genre name — each genre gets a stable
// "book cover" color so the shelf reads like a real library, no images.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
  h = (h << 5) - h + str.charCodeAt(i);
  h |= 0;
  }
  return Math.abs(h);
}

export default function GenreBook({ genre, count, index, active, onClick, onHover, onLeave }) {
  const hue = hash(genre) % 360;
  const sat = 38 + (hash(genre + "s") % 24); // muted but rich
  const light = 26 + (hash(genre + "l") % 16); // dark-ish spine
  const accent = `hsl(${hue} ${sat}% ${light + 10}%)`;
  const base = `hsl(${hue} ${sat}% ${light}%)`;
  const shelf = `hsl(${hue} ${sat}% ${Math.max(12, light - 14)}%)`;

  // natural-looking height/width variation from the hash + track count
  const heightVariance = 40 + (hash(genre) % 30) + Math.min(count, 40);
  const widthVariance = 30 + (hash(genre + "w") % 12);

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        height: `${heightVariance}px`,
        width: `${widthVariance}px`,
        background: `linear-gradient(90deg, ${shelf} 0%, ${base} 15%, ${base} 85%, ${shelf} 100%)`,
        zIndex: active ? 20 : 10,
        transform: active
          ? "translateY(-10px) rotate(-1.5deg)"
          : `translateY(${index % 2 ? 1 : 0}px)`,
        boxShadow: active
          ? "0 18px 30px -10px rgba(0,0,0,0.7)"
          : "0 6px 14px -8px rgba(0,0,0,0.7)",
      }}
      className="group relative shrink-0 rounded-[3px] overflow-hidden transition-all duration-300 ease-out flex items-center justify-center hover:-translate-y-2 hover:z-20 active:translate-y-0"
      aria-label={`Browse ${genre}`}>
      {/* spine top/bottom caps */}
      <span className="absolute top-0 inset-x-0 h-[3px]" style={{ background: accent }} />
      <span className="absolute bottom-0 inset-x-0 h-[6px]" style={{ background: shelf }} />
      {/* decorative gilt banding */}
      <span className="absolute top-[22%] inset-x-1.5 h-px opacity-40" style={{ background: accent }} />
      <span className="absolute bottom-[24%] inset-x-1.5 h-px opacity-40" style={{ background: accent }} />

      {/* vertical title on the spine */}
      <span
        className="relative px-1 text-[10px] font-extrabold tracking-tight text-white/85 whitespace-nowrap select-none"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
        {genre}
      </span>
    </button>
  );
}