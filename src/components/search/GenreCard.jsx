export default function GenreCard({ genre, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-start p-3.5 rounded-2xl bg-transparent border border-border text-foreground text-start h-12 overflow-hidden active:scale-[0.97] transition"
    >
      <span className="text-sm font-extrabold leading-tight line-clamp-1">
        {genre}
      </span>
    </button>
  );
}