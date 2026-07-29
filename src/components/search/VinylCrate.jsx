import { useState } from "react";
import VinylSleeve from "./VinylSleeve";

export default function VinylCrate({ genres, onPick }) {
  const [active, setActive] = useState(null);
  if (!genres.length) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 px-1 hidden">
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/60">
          The Crate
        </h3>
        <span className="text-[11px] text-foreground/40 font-medium hidden">
          {genres.length} genres
        </span>
      </div>
      <p className="px-1 mb-4 text-xs text-foreground/50 leading-relaxed hidden">
        Your music, stacked as records. Pick a genre to start digging.
      </p>
      <div
        className="flex flex-col [perspective:900px]"
        onMouseLeave={() => setActive(null)}>
        
        {genres.map((g, i) =>
        <div
          key={g.genre}
          className="-mt-2 first:mt-0 transition-[margin] duration-300"
          style={{ marginTop: i === 0 ? 0 : active === g.genre ? "0.5rem" : "-0.5rem" }}
          onMouseEnter={() => setActive(g.genre)}
          onFocus={() => setActive(g.genre)}>
          
            <VinylSleeve
            genre={g.genre}
            count={g.count}
            cover={g.cover}
            index={i}
            active={active === g.genre}
            onClick={() => onPick(g.genre)} />
          
          </div>
        )}
      </div>
    </div>);

}