import { Link } from "react-router-dom";
import { Disc3, ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";

/** @param {any} props */
export default function ArtistRow({ artist }) {
  const art = artist.cover_art_url || artist.avatar_url;

  return (
    <Link
      to={`/artist?name=${encodeURIComponent(artist.name || "")}`}
      className="artist-search-row w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition text-left"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
        {art ? (
          <Image src={art} fittingType="fill" alt="" className="w-full h-full object-cover" />
        ) : (
          <Disc3 size={20} className="text-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{artist.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">Artist</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true"/>
    </Link>
  );
}