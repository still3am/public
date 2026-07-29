import { useState } from "react";
import GenreBook from "./GenreBook";

export default function GenreShelf({ genres, onPick }) {
  const [active, setActive] = useState(null);
  if (!genres.length) return null;

  const perRow = 9;
  const rows = [];
  for (let i = 0; i < genres.length; i += perRow) rows.push(genres.slice(i, i + perRow));

  return (
    <div className="space-y-5">
      {rows.map((row, ri) => (
        <div key={ri}>
          <div className="flex items-end gap-1.5 px-1 pb-1.5 flex-wrap">
            {row.map((g, i) => (
              <GenreBook
                key={g.genre}
                genre={g.genre}
                count={g.count}
                index={ri * perRow + i}
                active={active === g.genre}
                onClick={() => onPick(g.genre)}
                onHover={() => setActive(g.genre)}
                onLeave={() => setActive(null)}
              />
            ))}
          </div>
          {/* shelf plank */}
          <div className="h-2.5 rounded-sm bg-gradient-to-b from-foreground/15 to-foreground/[0.04] shadow-[0_8px_16px_-10px_rgba(0,0,0,0.6)]" />
        </div>
      ))}
    </div>
  );
}