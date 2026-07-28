import GenreCard from "./GenreCard";

const GRADIENTS = [
  "from-fuchsia-700 to-purple-900",
  "from-rose-700 to-red-950",
  "from-orange-600 to-rose-950",
  "from-amber-600 to-orange-900",
  "from-lime-700 to-emerald-950",
  "from-emerald-700 to-teal-950",
  "from-cyan-700 to-blue-950",
  "from-blue-700 to-indigo-950",
  "from-indigo-700 to-purple-950",
  "from-violet-700 to-fuchsia-950",
  "from-pink-700 to-rose-950",
  "from-red-700 to-orange-950",
  "from-teal-700 to-cyan-950",
  "from-sky-700 to-blue-950",
  "from-purple-700 to-indigo-950",
  "from-fuchsia-700 to-pink-950",
];

function gradientFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function GenreGrid({ genres, onPick }) {
  if (!genres.length) return null;
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/60 mb-3 px-1">
        Browse Genres
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {genres.map((g) => (
          <GenreCard
            key={g.genre}
            genre={g.genre}
            count={g.count}
            gradient={gradientFor(g.genre)}
            onClick={() => onPick(g.genre)}
          />
        ))}
      </div>
    </div>
  );
}