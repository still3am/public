import { Disc3 } from "lucide-react";

export default function ArtistRow({ artist, onPick }) {
  return (
    <button
      onClick={onPick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition text-left"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
        {artist.avatar_url ? (
          <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Disc3 size={20} className="text-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{artist.name}</div>
      </div>
    </button>
  );
}