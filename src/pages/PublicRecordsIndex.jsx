import { useEffect, useMemo, useRef, useState } from "react";
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

// Fades + slides each letter group in as it scrolls into view.
function AzReveal({ children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      className={`transition-all duration-500 ${
      shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`
      }>
      
      {children}
    </div>);

}

export default function PublicRecordsIndex() {
  const [artists, setArtists] = useState(null); // null = loading
  const [activeKey, setActiveKey] = useState("");
  const groupRefs = useRef({});

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

  const letters = groups.map((g) => g.key);
  const allLetters = useMemo(
    () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").concat(letters.includes("#") ? ["#"] : []),
    [letters]
  );
  const railRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragLetter, setDragLetter] = useState("");
  const [dragY, setDragY] = useState(0);

  // Track which letter section is nearest the top of the viewport.
  useEffect(() => {
    if (!groups.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.
        filter((e) => e.isIntersecting).
        sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveKey(visible[0].target.dataset.key);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    groups.forEach((g) => {
      const el = groupRefs.current[g.key];
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [groups]);

  const scrollToLetter = (key) => {
    const el = groupRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveKey(key);
  };

  // iOS-style: snap a pointer position to the nearest existing letter.
  const pickAt = (clientY) => {
    const el = railRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const i = Math.floor((clientY - r.top) / (r.height / allLetters.length));
    if (i < 0 || i >= allLetters.length) return null;
    const L = allLetters[i];
    if (letters.includes(L)) return L;
    for (let d = 1; d < allLetters.length; d++) {
      if (i - d >= 0 && letters.includes(allLetters[i - d])) return allLetters[i - d];
      if (i + d < allLetters.length && letters.includes(allLetters[i + d])) return allLetters[i + d];
    }
    return null;
  };

  const onPick = (clientY) => {
    const L = pickAt(clientY);
    if (L && L !== dragLetter) {
      setDragLetter(L);
      setDragY(clientY);
      scrollToLetter(L);
      if (navigator.vibrate) navigator.vibrate(8);
    } else if (L) {
      setDragY(clientY);
    }
  };

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    onPick(e.clientY);
  };
  const moveDrag = (e) => {
    if (dragging) onPick(e.clientY);
  };
  const endDrag = () => {
    setDragging(false);
    setDragLetter("");
  };

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

        <div className="pr-5 md:pr-0">
            {groups.map((g) =>
          <AzReveal key={g.key}>
                <div data-key={g.key} ref={(el) => groupRefs.current[g.key] = el}>
                  <div className="sticky top-[3.25rem] z-10 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-sm">
                    <span className="text-[11px] font-extrabold tracking-[0.18em] text-foreground/40">
                      {g.key}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    {g.items.map((a) => {
                  const href = a.record ?
                  `/records/${a.record.id}` :
                  `/artist?name=${encodeURIComponent(a.display)}`;
                  return (
                    <Link
                      key={norm(a.display)}
                      to={href}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-foreground/[0.04] active:scale-[0.99] transition group">
                      
                          <div className="min-w-0 flex-1 flex items-baseline gap-2">
                            <span className="text-[13px] font-medium truncate">{a.display}</span>
                            



                        
                          </div>
                          

                      
                      
                        </Link>);

                })}
                  </div>
                </div>
              </AzReveal>
          )}
          </div>
        }
      </PullToRefresh>

      {/* iOS-style index — mobile only, tap & drag */}
      {artists && artists.length > 0 &&
      <>
          <div
          ref={railRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="md:hidden fixed right-0.5 top-1/2 -translate-y-1/2 z-30 touch-none select-none px-0.5 py-1 rounded-full bg-foreground/[0.05] backdrop-blur-md border border-foreground/[0.06] flex flex-col items-center max-h-[78vh] overflow-hidden">
          
            {allLetters.map((L) => {
            const has = letters.includes(L);
            const isActive = activeKey === L;
            return (
              <span
                key={L}
                className={`text-[8px] font-semibold leading-none w-3 h-3 grid place-items-center transition-colors duration-150 ${
                has ? "text-foreground/55" : "text-foreground/20"} ${
                isActive || dragLetter === L ? "text-foreground" : ""}`}>
                
                  {L}
                </span>);

          })}
          </div>

          {/* Floating drag indicator bubble */}
          {dragging && dragLetter &&
        <div
          className="md:hidden fixed right-7 z-40 pointer-events-none"
          style={{ top: Math.max(36, Math.min(window.innerHeight - 36, dragY)) }}>
          
              <div className="-translate-y-1/2 w-11 h-11 rounded-full bg-foreground text-background grid place-items-center text-base font-extrabold shadow-lg">
                {dragLetter}
              </div>
            </div>
        }
        </>
      }
    </div>);

}