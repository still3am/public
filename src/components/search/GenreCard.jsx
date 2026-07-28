import { Play } from "lucide-react";

export default function GenreCard({ genre, count, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white text-start h-20 overflow-hidden active:scale-[0.97] transition shadow-sm`}>
      
      <span className="font-extrabold leading-tight drop-shadow-sm line-clamp-2 pr-7 text-6xl">
        {genre}
      </span>
      <span className="text-[11px] font-medium opacity-85 hidden">
        {count} {count === 1 ? "track" : "tracks"}
      </span>
      <Play
        size={22}
        className="absolute right-2 bottom-2 opacity-30 group-active:opacity-70 transition hidden"
        fill="currentColor" />
      
    </button>);

}