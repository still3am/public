import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { Disc3 } from "lucide-react";

export default function AlbumCard({ album }) {
  return (
    <Link to={`/album/${album.id}`} className="group block">
      <div className="aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm">
        {album.cover_art_url ? (
          <Image
            src={album.cover_art_url}
            fittingType="fill"
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-foreground/25">
            <Disc3 size={26} />
          </div>
        )}
      </div>
      <div className="text-sm font-semibold truncate group-hover:underline">
        {album.title}
      </div>
      <div className="text-xs text-foreground/55 truncate mt-0.5">
        {album.artist_name || "Various artists"}
      </div>
    </Link>
  );
}