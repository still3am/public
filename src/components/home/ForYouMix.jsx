import { Play } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import TrackCard from "@/components/TrackCard";

// The personalized mix: a playable queue, not just another row — it is built
// from the listener's follows, genres and history (see lib/forYou.js).
export default function ForYouMix({ tracks }) {
  const p = usePlayer();
  if (!tracks?.length) return null;

  return (
    <section className="mb-10 md:mb-12">
      <div className="relative overflow-hidden rounded-3xl border border-foreground/[0.06] p-5 md:p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/12 via-transparent to-amber-400/12 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-violet-500/12 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-extrabold tracking-tight">For You</h2>
            <p className="text-xs md:text-sm text-foreground/55 mt-0.5">
              Built from who you follow, the genres you picked and what you play.
            </p>
          </div>
          <button
            onClick={() => p.playTrackAt(tracks, 0)}
            className="shrink-0 h-11 px-5 rounded-full bg-foreground text-background text-sm font-bold flex items-center gap-2 active:scale-95 transition"
          >
            <Play size={15} fill="currentColor" /> Play mix
          </button>
        </div>

        <div className="relative flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:gap-4">
          {tracks.slice(0, 10).map((t) => (
            <div key={t.id} className="snap-start shrink-0 w-[60vw] max-w-[210px] sm:w-[200px] md:w-auto">
              <TrackCard track={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}