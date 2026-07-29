import { Play } from "lucide-react";

export default function GenreCard({ genre, count, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col justify-between p-3.5 rounded-2xl bg-transparent border border-border text-foreground text-start h-20 overflow-hidden active:scale-[0.97] transition"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.10] pointer-events-none`} />
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] to-transparent pointer-events-none" />
      <span className="relative text-sm font-extrabold leading-tight line-clamp-2 pr-7">
        {genre}
      </span>
      <span className="relative text-[11px] font-medium text-foreground/45">
        {count} {count === 1 ? "track" : "tracks"}
      </span>
      <Play
        size={20}
        className="absolute right-2 bottom-2 text-foreground/25 group-active:text-foreground/70 transition"
      />
    </button>
  );
}