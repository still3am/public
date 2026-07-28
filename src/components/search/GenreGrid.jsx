import GenreCard from "./GenreCard";

const GRADIENTS = [
  "from-fuchsia-600 to-purple-700",
  "from-rose-500 to-pink-600",
  "from-orange-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-lime-500 to-emerald-600",
  "from-emerald-400 to-teal-600",
  "from-cyan-400 to-blue-600",
  "from-blue-500 to-indigo-700",
  "from-indigo-500 to-purple-700",
  "from-violet-500 to-fuchsia-700",
  "from-pink-500 to-rose-700",
  "from-red-500 to-orange-600",
  "from-teal-400 to-cyan-600",
  "from-sky-400 to-blue-700",
  "from-purple-500 to-indigo-800",
  "from-fuchsia-500 to-pink-700",
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
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