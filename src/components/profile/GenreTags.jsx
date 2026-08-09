import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Music } from "lucide-react";

export default function GenreTags() {
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    base44.entities.UserGenre.filter({}, "-created_date", 1)
      .then((records) => {
        const g = Array.isArray(records) && records[0]?.genres ? records[0].genres : [];
        setGenres(g);
      })
      .catch(() => setGenres([]));
  }, []);

  if (!genres.length) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <Music size={18} /> My Taste
      </h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link key={g} to={`/search?genre=${encodeURIComponent(g)}`} className="chip active">
            {g}
          </Link>
        ))}
      </div>
    </div>
  );
}