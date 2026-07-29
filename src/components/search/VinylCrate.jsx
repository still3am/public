import { useState } from "react";
import VinylSleeve from "./VinylSleeve";

export default function VinylCrate({ genres, onPick }) {
  const [active, setActive] = useState(null);
  if (!genres.length) return null;

  return (
    <div>
      






      
      

      
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