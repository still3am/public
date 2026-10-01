import { Check } from "lucide-react";
import TrackCard from "@/components/TrackCard";

// A library card wrapped in a tap-to-select overlay while the bulk toolbar is
// up: the overlay sits on top of the card so a tap toggles selection rather
// than playing or navigating into the track.
export default function SelectableTrackCard({ track, selecting, selected, onToggle }) {
  return (
    <div className="relative">
      <TrackCard track={track} />
      {selecting &&
      <button
        onClick={() => onToggle(track.id)}
        aria-label={`${selected ? "Deselect" : "Select"} ${track.title}`}
        aria-pressed={selected}
        className="absolute inset-0 z-10 rounded-2xl">
          {selected &&
        <span className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-foreground/70 bg-foreground/[0.06]" />
        }
          <span
          className={`absolute top-2 left-2 w-6 h-6 rounded-full grid place-items-center border transition ${
          selected ?
          "bg-foreground text-background border-foreground" :
          "bg-background/80 border-border backdrop-blur"}`
          }>
            {selected && <Check size={14} />}
          </span>
        </button>
      }
    </div>);

}