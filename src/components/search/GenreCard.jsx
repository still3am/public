import { gradientFor } from "@/lib/genreGradients";

export default function GenreCard({ genre, count, onClick }) {
  const [from, to] = gradientFor(genre);
  return (
    <button
      onClick={onClick}
      style={{ background: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
      className="relative h-24 sm:h-28 rounded-2xl overflow-hidden text-left active:scale-[0.97] transition shadow-sm group"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
      <div className="absolute inset-0 px-3 py-2.5 flex flex-col justify-between">
        <span className="text-white font-extrabold text-[13px] leading-tight line-clamp-2 drop-shadow-sm">
          {genre}
        </span>
        {count != null && count > 0 && (
          <span className="text-white/85 text-[10px] font-semibold drop-shadow-sm">
            {count} track{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}