import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import PullToRefresh from "@/components/PullToRefresh";
import { Loader2, Mic2, Disc3, ChevronRight } from "lucide-react";

// Special group for names starting with a non-letter.
const letterOf = (name) => {
  const ch = (name || "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "#";
};

export default function PublicRecordsIndex() {
  const [artists, setArtists] = useState(null);
  const [trackCounts, setTrackCounts] = useState({});

  const load = async () => {
    setArtists(null);
    try {
      const [list, tracks] = await Promise.all([
      base44.entities.Artist.list("name", 1000).catch(() => []),
      base44.entities.Track.filter({ is_published: true }, "-created_date", 10000).catch(() => [])]
      );
      const arr = (Array.isArray(list) ? list : []).slice().sort((a, b) =>
      (a.name || "").trim().toLowerCase().localeCompare((b.name || "").trim().toLowerCase())
      );
      // Count published tracks per artist name (normalized).
      const norm = (s) => (s || "").trim().toLowerCase();
      const counts = {};
      (Array.isArray(tracks) ? tracks : []).forEach((t) => {
        const n = norm(t.artist);
        if (!n) return;
        counts[n] = (counts[n] || 0) + 1;
      });
      setTrackCounts(counts);
      setArtists(arr);
    } finally {
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = {};
    (artists || []).forEach((a) => {
      const key = letterOf(a.name);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.keys(map).
    sort((x, y) => x === "#" ? 1 : y === "#" ? -1 : x.localeCompare(y)).
    map((key) => ({ key, items: map[key] }));
  }, [artists]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-10">
      <BackHeader title="Public Records" />
      <p className="text-sm text-foreground/55 -mt-2 mb-4 px-1">
        Every artist on the network, organized A to Z.
      </p>

      <PullToRefresh onRefresh={load}>
        {artists === null ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        artists.length === 0 ?
        <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-4">
              <Mic2 size={28} className="text-foreground/40" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mb-1">No records yet</h2>
            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
              Artists show up here once a Public Record is created.
            </p>
          </div> :

        <div className="space-y-6">
            {groups.map((g) =>
          <div key={g.key}>
                <div className="sticky top-[3.5rem] z-10 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-sm">
                  <span className="text-xs font-extrabold tracking-[0.2em] text-foreground/40">
                    {g.key}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {g.items.map((a) => {
                const count = trackCounts[(a.name || "").trim().toLowerCase()] || 0;
                return (
                  <Link
                    key={a.id}
                    to={`/records/${a.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition group">
                    
                        





                    
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{a.name}</div>
                          {count > 0 &&
                      <div className="text-xs text-foreground/45 truncate">
                              {count} {count === 1 ? "track" : "tracks"}
                            </div>
                      }
                        </div>
                        

                    
                      </Link>);

              })}
                </div>
              </div>
          )}
          </div>
        }
      </PullToRefresh>
    </div>);

}