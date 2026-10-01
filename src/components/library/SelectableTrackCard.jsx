import TrackCard from "@/components/TrackCard";
import { Check } from "lucide-react";

// In selection mode every tap on a card selects it instead of playing it, and
// the card shows a tick — the same card as everywhere else, just selectable.
export default function SelectableTrackCard({ track, selectMode, selected, onToggle }) {
  if (!selectMode) return <TrackCard track={track} />;

  return (
    <div
      className="relative rounded-2xl"
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(track.id);
      }}
    >
      <TrackCard track={track} />

      {selected && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-foreground bg-foreground/[0.08] pointer-events-none" />
      )}

      <div
        className={`absolute top-4 right-4 z-20 w-6 h-6 rounded-full grid place-items-center border-2 pointer-events-none transition ${
          selected
            ? "bg-foreground border-foreground text-background"
            : "bg-background/85 border-foreground/40 text-transparent backdrop-blur"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </div>
    </div>
  );
}