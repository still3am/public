import { Image } from "@/components/ui/image";

export default function VinylCrate({ genres, onPick }) {
  if (!genres?.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {genres.map((g) =>
      <button
        key={g.genre}
        onClick={() => onPick(g.genre)}
        className="group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 cursor-pointer text-left
            hover:bg-foreground/[0.04] active:scale-[0.98]">
        
        
          <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm">
            {g.cover ?
          <Image
            src={g.cover}
            fittingType="fill"
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" /> :


          <div className="w-full h-full grid place-items-center text-foreground/25 text-[10px] font-semibold uppercase tracking-wider px-2 text-center">
                {g.genre}
              </div>
          }
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>
          
          <div className="text-xs text-foreground/55 truncate mt-0.5 hidden">
            {g.count} {g.count === 1 ? "track" : "tracks"}
          </div>
        </button>
      )}
    </div>);

}