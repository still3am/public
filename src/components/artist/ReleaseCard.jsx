import { Link } from "react-router-dom";
import { Disc3 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { albumYear } from "@/lib/albums";

// One album / EP in an artist's discography.
export default function ReleaseCard({ release }) {
  const { album, tracks } = release;
  const cover = album.cover_art_url || tracks.find((t) => t.cover_art_url)?.cover_art_url || "";
  const year = albumYear(album, tracks);
  const count = tracks.length;

  return (
    <Link
      to={`/album/${album.id}`}
      className="group rounded-2xl p-2.5 transition-all duration-300 hover:bg-foreground/[0.04] active:scale-[0.98]"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-foreground/[0.06] mb-2.5 shadow-sm">
        {cover ? (
          <Image
            src={cover}
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
      <div className="truncate text-sm font-semibold">{album.title}</div>
      <div className="text-xs text-foreground/55 truncate mt-0.5">
        {[year, `${count} ${count === 1 ? "track" : "tracks"}`].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}