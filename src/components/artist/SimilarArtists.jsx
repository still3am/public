import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { findSimilarArtists } from "@/lib/artistSimilarity";
import { Loader2, Share2 } from "lucide-react";

export default function SimilarArtists({ artistName }) {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const tracks = await base44.entities.Track
        .filter({ is_published: true }, "-play_count", 3000)
        .catch(() => []);
      if (!alive) return;
      setItems(findSimilarArtists(Array.isArray(tracks) ? tracks : [], artistName, 8));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [artistName]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border py-12 grid place-items-center">
        <Loader2 size={18} className="animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 text-center px-6">
        <Share2 size={22} className="text-foreground/35 mx-auto mb-2" />
        <p className="text-sm text-foreground/50">
          Not enough catalogue overlap yet to map similar artists.
        </p>
      </div>
    );
  }

  const W = 460;
  const H = 340;
  const cx = W / 2;
  const cy = H / 2;
  const top = items[0].score || 1;

  const nodes = items.map((it, i) => {
    const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    // Stronger similarity sits closer to the centre.
    const norm = it.score / top;
    const r = 70 + (1 - norm) * 78;
    return { ...it, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.04] to-transparent p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {nodes.map((n) => (
          <line
            key={`l-${n.name}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke="currentColor"
            className="text-foreground"
            strokeOpacity={hover === n.name ? 0.55 : 0.14}
            strokeWidth={1 + (n.score / top) * 2}
          />
        ))}

        {nodes.map((n) => (
          <g
            key={n.name}
            onClick={() => nav(`/artist?name=${encodeURIComponent(n.name)}`)}
            onMouseEnter={() => setHover(n.name)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={hover === n.name ? 24 : 21}
              className="fill-background stroke-foreground transition-all"
              strokeOpacity={0.25}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              className="fill-foreground font-bold pointer-events-none"
              style={{ fontSize: 11 }}
            >
              {Math.round(n.score * 100)}%
            </text>
            <text
              x={n.x}
              y={n.y + 38}
              textAnchor="middle"
              className="fill-foreground/70 font-semibold pointer-events-none"
              style={{ fontSize: 10 }}
            >
              {n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name}
            </text>
          </g>
        ))}

        <circle cx={cx} cy={cy} r={38} className="fill-foreground" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-background font-extrabold"
          style={{ fontSize: 11 }}
        >
          {artistName.length > 12 ? `${artistName.slice(0, 11)}…` : artistName}
        </text>
      </svg>

      <div className="flex flex-wrap gap-1.5 px-2 pb-1">
        {items.map((it) => (
          <button
            key={it.name}
            onClick={() => nav(`/artist?name=${encodeURIComponent(it.name)}`)}
            onMouseEnter={() => setHover(it.name)}
            onMouseLeave={() => setHover(null)}
            className="chip hover:bg-accent"
          >
            {it.name}
            <span className="text-foreground/40">
              {it.sharedGenres.slice(0, 1).join("")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}