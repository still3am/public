import { useNavigate } from "react-router-dom";

const GENRES = [
  { label: "Pop", g: "linear-gradient(150deg,#E64268,#FFB6C1)" },
  { label: "Hip-Hop", g: "linear-gradient(150deg,#00A9FF,#004C99)" },
  { label: "R&B", g: "linear-gradient(150deg,#E67A18,#3A1500)" },
  { label: "Electronic", g: "linear-gradient(150deg,#9932CC,#240A24)" },
  { label: "Dance", g: "linear-gradient(150deg,#00C874,#00854A)" },
  { label: "Rock", g: "linear-gradient(150deg,#E76846,#7A2412)" },
  { label: "Afrobeats", g: "linear-gradient(150deg,#E62A56,#A8002A)" },
  { label: "Amapiano", g: "linear-gradient(150deg,#6A5ACD,#BFB4DC)" },
  { label: "Drill", g: "linear-gradient(150deg,#240A24,#C71585)" },
  { label: "Reggaeton", g: "linear-gradient(150deg,#E90033,#6B0020)" },
  { label: "Lo-Fi", g: "linear-gradient(150deg,#9932CC,#BFB4DC)" },
  { label: "House", g: "linear-gradient(150deg,#AA0003,#E90033)" },
  { label: "Trap", g: "linear-gradient(150deg,#C71585,#4A0A2E)" },
  { label: "Phonk", g: "linear-gradient(150deg,#1A1A2E,#4A148C)" },
  { label: "K-Pop", g: "linear-gradient(150deg,#E64268,#FFB6C1)" },
  { label: "Jazz", g: "linear-gradient(150deg,#EBB000,#E67A18)" },
  { label: "Soul", g: "linear-gradient(150deg,#E94B73,#7A1035)" },
  { label: "Afro-Pop", g: "linear-gradient(150deg,#C71585,#FFB6C1)" },
  { label: "Latin", g: "linear-gradient(150deg,#E62A56,#E90033)" },
  { label: "Gospel", g: "linear-gradient(150deg,#9999FF,#3344AA)" },
  { label: "Country", g: "linear-gradient(150deg,#E67A18,#6B3000)" },
  { label: "Funk", g: "linear-gradient(150deg,#00C874,#00A9FF)" },
];

export default function GenreGrid() {
  const nav = useNavigate();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/60 mb-3 px-1">
        Browse Genres
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {GENRES.map((genre) => (
          <button
            key={genre.label}
            onClick={() => nav(`/genre/${encodeURIComponent(genre.label)}`)}
            className="relative h-32 rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform"
            style={{ background: genre.g }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3 text-white font-extrabold text-sm leading-tight drop-shadow">
              {genre.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}