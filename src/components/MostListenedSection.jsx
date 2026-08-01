import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import TrackCard from "@/components/TrackCard";
import { getTopListened } from "@/lib/recentPlays";

export default function MostListenedSection() {
  const [items, setItems] = useState(() => getTopListened(5));

  useEffect(() => {
    const onChange = () => setItems(getTopListened(5));
    window.addEventListener("recentplays:change", onChange);
    return () => window.removeEventListener("recentplays:change", onChange);
  }, []);

  if (!items.length) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
        <Headphones size={18} /> Most Listened
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      </div>
    </div>
  );
}