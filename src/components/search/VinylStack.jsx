import { Disc3 } from "lucide-react";

const EDGE_GRADIENTS = [
  "from-fuchsia-500 to-purple-900",
  "from-rose-500 to-red-950",
  "from-orange-500 to-rose-950",
  "from-amber-500 to-orange-900",
  "from-lime-500 to-emerald-950",
  "from-emerald-500 to-teal-950",
  "from-cyan-500 to-blue-950",
  "from-blue-500 to-indigo-950",
  "from-indigo-500 to-purple-950",
  "from-violet-500 to-fuchsia-950",
  "from-pink-500 to-rose-950",
  "from-teal-500 to-cyan-950",
];

function edgeFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return EDGE_GRADIENTS[h % EDGE_GRADIENTS.length];
}

export default function VinylStack({ genres, onPick }) {
  if (!genres?.length) return null;
  const items = genres.slice(0, 10);

  return (
    <div className="w-full max-w-md mx-auto px-1">
      <div
        className="relative"
        style={{ perspective: "900px", perspectiveOrigin: "50% 0%" }}
      >
        {items.map((g, i) => {
          const edge = edgeFor(g.genre);
          const scale = 1 - i * 0.018;
          return (
            <button
              key={g.genre}
              onClick={() => onPick(g.genre)}
              className="group relative block w-full text-left transition-transform duration-200 active:scale-[0.97] focus-visible:outline-none"
              style={{
                height: "clamp(64px, 15vw, 92px)",
                marginTop: i === 0 ? 0 : "clamp(-14px, -3vw, -8px)",
                transform: `rotateX(14deg) scale(${scale})`,
                transformOrigin: "50% 0%",
                zIndex: items.length - i,
              }}
              aria-label={`Browse ${g.genre}`}
            >
              {/* sleeve edge / thickness */}
              <div
                className={`absolute inset-x-1 bottom-0 h-2.5 rounded-b-xl bg-gradient-to-b ${edge}`}
              />

              {/* sleeve face */}
              <div className="absolute inset-x-0 top-0 bottom-1.5 rounded-xl overflow-hidden border border-white/15 bg-neutral-900 shadow-xl shadow-black/40">
                {g.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${edge}`} />
                )}

                {/* depth darkening deeper in the stack */}
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: 0.28 + i * 0.045 }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />

                <div className="relative h-full flex items-center gap-3 px-3 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] sm:text-base font-extrabold text-white truncate leading-tight">
                      {g.genre}
                    </div>
                    <div className="text-[11px] text-white/65 truncate font-medium">
                      {g.count} {g.count === 1 ? "track" : "tracks"}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/30 grid place-items-center bg-black/40 shrink-0 group-hover:bg-white group-hover:border-white transition">
                    <Disc3
                      size={16}
                      className="text-white/85 group-hover:text-black transition"
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm font-extrabold text-foreground/85 leading-snug">
        Your music, reimagined as records.
        <br />
        Pick a genre to start.
      </p>
    </div>
  );
}