import { Music, ArrowLeft } from "lucide-react";
import TrackRow from "@/components/TrackRow";

export default function GenreBrowse({ genre, tracks, onBack }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={onBack}
          className="tap-target rounded-full hover:bg-foreground/[0.06]"
          aria-label="Back to genres"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
          <Music size={15} className="text-foreground/50" />
          {genre}
          <span className="text-xs font-semibold text-foreground/40">{tracks.length}</span>
        </h2>
      </div>
      {tracks.length === 0 ? (
        <div className="py-12 text-center text-foreground/50 text-sm">
          No tracks in this genre yet.
        </div>
      ) : (
        <div className="space-y-0.5">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}