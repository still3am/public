import BookSpine from "./BookSpine";

function hue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 1000003;
  return Math.abs(h) % 360;
}

export default function BookShelf({ genres, onPick }) {
  if (!genres?.length) return null;
  const sorted = [...genres].sort((a, b) => hue(a.genre) - hue(b.genre));

  return (
    <div
      className="flex items-end gap-[3px] overflow-x-auto no-scrollbar py-6 pl-1 pr-6 h-40 sm:h-52 bg-gradient-to-b from-[#1b1310] to-[#0f0a07] rounded-2xl border border-border">

      {sorted.map((g, idx) => (
        <BookSpine
          key={g.genre}
          genre={g.genre}
          count={g.count}
          hue={hue(g.genre)}
          index={idx}
          onClick={() => onPick(g.genre)} />
      ))}
    </div>
  );
}