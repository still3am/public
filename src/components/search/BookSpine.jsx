function hash(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 1000003;
  return Math.abs(h);
}

export default function BookSpine({ genre, count, hue, index, onClick }) {
  const heightPct = 58 + hash(genre, 7) % 42; // 58–100% of shelf
  const lightness = 36 + (hash(genre, 13) % 16); // 36–52
  const color = `hsl(${hue}, 50%, ${lightness}%)`;
  const edge = `hsl(${hue}, 45%, ${Math.min(lightness + 16, 70)}%)`;
  const ink = lightness < 46 ? "#fdfaf3" : "#1a120b";

  return (
    <button
      onClick={onClick}
      style={{
        height: `${heightPct}%`,
        backgroundColor: color,
        boxShadow: `inset 2px 0 0 ${edge}, inset -2px 0 0 rgba(0,0,0,0.25), 1px 0 2px rgba(0,0,0,0.35)`,
      }}
      className="group relative flex-1 min-w-[14px] sm:min-w-[20px] max-w-[44px] rounded-[3px_3px_1px_1px] overflow-hidden transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:z-10 active:scale-[0.98]"
      aria-label={`Browse ${genre}`}>

      {/* pages top edge */}
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `hsl(40, 28%, ${Math.min(lightness + 36, 86)}%)` }} />

      {/* vertical genre name */}
      <span
        className="absolute inset-0 flex items-center justify-center py-2.5"
        style={{ writingMode: "vertical-rl", color: ink }}>
        <span className="text-[9px] sm:text-[11px] font-semibold tracking-wide uppercase whitespace-nowrap line-clamp-1">
          {genre}
        </span>
      </span>

      {/* hover count */}
      {count > 0 && (
        <span
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full bg-black/55 text-white text-[8px] sm:text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          {count}
        </span>
      )}
    </button>
  );
}