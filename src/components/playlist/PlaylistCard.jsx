import { Link } from "react-router-dom";
import { ListMusic } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function PlaylistCard({ playlist }) {
  const count = playlist.track_ids?.length || 0;
  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 hover:bg-foreground/[0.04] active:scale-[0.98]"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm">
        {playlist.cover_art_url ? (
          <Image
            src={playlist.cover_art_url}
            fittingType="fill"
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.03]">
            <ListMusic size={28} className="text-foreground/30" />
          </div>
        )}
      </div>
      <div className="truncate text-sm font-semibold">{playlist.name}</div>
      <div className="text-xs text-foreground/50 truncate mt-0.5">
        {count} {count === 1 ? "song" : "songs"}
      </div>
    </Link>
  );
}