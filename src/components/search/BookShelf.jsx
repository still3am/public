import { useMemo } from "react";
import BookSpine from "./BookSpine";

const SHELVES = 4;

function hue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 1000003;
  return Math.abs(h) % 360;
}

export default function BookShelf({ genres, onPick }) {
  const shelves = useMemo(() => {
    if (!genres?.length) return [];
    // arrange by hue so the shelf reads as a rainbow gradient
    const sorted = [...genres].sort((a, b) => hue(a.genre) - hue(b.genre));
    const per = Math.ceil(sorted.length / SHELVES);
    const rows = [];
    for (let i = 0; i < sorted.length; i += per) rows.push(sorted.slice(i, i + per));
    return rows;
  }, [genres]);

  if (!shelves.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      {shelves.map((row, i) => (
        <div key={i}>
          {/* books */}
          <div className="flex items-end gap-[2px] px-2.5 sm:px-4 h-28 sm:h-40 bg-gradient-to-b from-[#271911] to-[#150d08]">
            {row.map((g, idx) => (
              <BookSpine
                key={g.genre}
                genre={g.genre}
                count={g.count}
                hue={hue(g.genre)}
                index={idx}
                onClick={() => onPick(g.genre)} />
            ))}
          </div>

          {/* wooden plank */}
          <div
            className="h-2.5 sm:h-3"
            style={{
              background: "linear-gradient(#3a261a, #28180e 55%, #1c1008)",
              boxShadow: "0 -1px 0 rgba(255,220,180,0.12) inset, 0 5px 10px rgba(0,0,0,0.5)",
            }} />
        </div>
      ))}
    </div>
  );
}