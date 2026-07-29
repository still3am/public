import { Disc3 } from "lucide-react";

const EDGE_GRADIENTS = [
  "from-fuchsia-600 to-purple-900",
  "from-rose-600 to-red-950",
  "from-orange-500 to-rose-950",
  "from-amber-500 to-orange-900",
  "from-lime-600 to-emerald-950",
  "from-emerald-600 to-teal-950",
  "from-cyan-600 to-blue-950",
  "from-blue-600 to-indigo-950",
  "from-indigo-600 to-purple-950",
  "from-violet-600 to-fuchsia-950",
  "from-pink-600 to-rose-950",
  "from-red-600 to-orange-950",
  "from-teal-600 to-cyan-950",
  "from-sky-600 to-blue-950",
  "from-purple-600 to-indigo-950",
  "from-fuchsia-600 to-pink-950",
];

function edgeFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return EDGE_GRADIENTS[h % EDGE_GRADIENTS.length];
}

export default function VinylStack({ genres, onPick }) {
  if (!genres?.length) return null;
  const items = genres.slice(0, 9);

  return (
    <div className="relative">
      <div className="relative" style={{ perspective: "1400px" }}>
        {items.map((g, i) => {
          const edge = edgeFor(g.genre);
          const tilt = (i % 2 === 0 ? -1 : 1) * (1.5 + i * 0.6);
          return (
            <button
              key={g.genre}
              onClick={() => onPick(g.genre)}
              className="group relative block w-full text-left transition-transform duration-300 active:scale-[0.985]"
              style={{
                marginTop: i === 0 ? 0 : "-58%",
                transform: `rotateX(6deg) rotate(${tilt}deg)`,
                transformOrigin: "center top",
                zIndex: items.length - i,
              }}
              aria-label={`Browse ${g.genre}`}
            >
              {/* sleeve thickness / edge */}
              <div
                className={`absolute inset-x-0 -bottom-2 h-4 rounded-b-2xl bg-gradient-to-b ${edge} opacity-80 blur-[1px]`}
              />
              <div className="absolute inset-x-2 -bottom-4 h-4 rounded-b-2xl bg-black/70" />

              {/* card face */}
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 shadow-2xl">
                {g.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${edge} opacity-85`} />
                )}

                {/* lower-card darkening for depth */}
                <div
                  className="absolute inset-0 bg-black transition-opacity"
                  style={{ opacity: 0.12 + i * 0.07 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />

                {/* top label strip */}
                <div className="absolute top-0 inset-x-0 p-3.5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-bold">
                    Genre
                  </div>
                  <div className="text-xl font-extrabold text-white truncate leading-tight drop-shadow-sm">
                    {g.genre}
                  </div>
                  <div className="text-xs text-white/70 truncate font-medium">
                    {g.count} {g.count === 1 ? "track" : "tracks"}
                  </div>
                </div>

                {/* vinyl record hint */}
                <div className="absolute right-3.5 bottom-3.5 w-11 h-11 rounded-full border border-white/30 grid place-items-center bg-black/40 backdrop-blur-sm group-hover:bg-black/60 transition">
                  <Disc3 size={20} className="text-white/85" />
                </div>

                {/* selection ring accent on front card */}
                {i === 0 && (
                  <div className="absolute inset-2 rounded-xl border-2 border-dashed border-white/40 pointer-events-none" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm font-extrabold text-foreground/90 px-4 leading-snug">
        Your music, reimagined as records.
        <br />
        Pick a genre to start.
      </p>
    </div>
  );
}