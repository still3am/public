import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import PullToRefresh from "@/components/PullToRefresh";
import { Loader2, Mic2, Disc3 } from "lucide-react";

// Split a multi-artist string into individual names, preserving original
// casing. A track credited "Drake feat. Future" counts toward both Drake and
// Future as separate Public Records.
const splitNames = (str) =>
(str || "").
split(/\s*(?:,|&| feat\.| ft\.| x |;|\/)\s*/i).
map((s) => s.trim()).
filter(Boolean);

const norm = (s) => s.trim().toLowerCase();

// Special group for names starting with a non-letter.
const letterOf = (name) => {
  const ch = (name || "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "#";
};

export default function PublicRecordsIndex() {
  const [artists, setArtists] = useState(null); // null = loading

  const load = async () => {
    setArtists(null);
    try {
      const [records, tracks] = await Promise.all([
      base44.entities.Artist.list("-updated_date", 1000).catch(() => []),
      base44.entities.Track.filter({ is_published: true }, "-created_date", 10000).catch(() => [])]
      );
      const recordByName = new Map();
      (Array.isArray(records) ? records : []).forEach((a) => {
        const k = norm(a.name);
        if (k && !recordByName.has(k)) recordByName.set(k, a);
      });

      // nameKey -> { display, record, count }
      const map = new Map();
      const bump = (display, record) => {
        const key = norm(display);
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.record && record) existing.record = record;
        } else {
          map.set(key, {
            display: record ? record.name : display,
            record: record || null,
            count: 1
          });
        }
      };

      (Array.isArray(tracks) ? tracks : []).forEach((t) => {
        const segs = splitNames(t.artist);
        if (!segs.length) return;
        segs.forEach((seg) => bump(seg, recordByName.get(norm(seg)) || null));
      });

      // Make sure Artist records with zero published tracks still appear.
      recordByName.forEach((rec, key) => {
        if (!map.has(key)) {
          map.set(key, { display: rec.name, record: rec, count: 0 });
        } else {
          // prefer the canonical record name/casing
          map.get(key).display = rec.name;
          map.get(key).record = rec;
        }
      });

      const list = [...map.values()].sort((a, b) =>
      norm(a.display).localeCompare(norm(b.display))
      );
      setArtists(list);
    } finally {
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = {};
    (artists || []).forEach((a) => {
      const key = letterOf(a.display);
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
              Artists show up here once a track names them in its credits.
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
                const href = a.record ? `/records/${a.record.id}` : `/artist?name=${encodeURIComponent(a.display)}`;
                return (
                  <Link
                    key={norm(a.display)}
                    to={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition group">
                    
                        <div className="w-11 h-11 rounded-full bg-foreground/[0.06] grid place-items-center overflow-hidden shrink-0 ring-1 ring-foreground/10">
                          {a.record?.avatar_url ?
                      <img src={a.record.avatar_url} alt="" className="w-full h-full object-cover" /> :

                      <Mic2 size={18} className="text-foreground/45" />
                      }
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{a.display}</div>
                          {a.count > 0 &&
                      <div className="text-xs text-foreground/45 truncate">
                              {a.count} {a.count === 1 ? "track" : "tracks"}
                            </div>
                      }
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/55 group-hover:text-foreground transition shrink-0 hidden">
                          Open <Disc3 size={13} className="opacity-70" />
                        </span>
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