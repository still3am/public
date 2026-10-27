import {useAuth} from "@/lib/AuthContext";
import {useLibrary} from "@/context/LibraryContext";
import {base44} from "@/api/base44Client";
import {readAllPages} from "@/lib/readPages";
import {artistKey} from "@/lib/artistReleaseModel";
import LoadError from '@/components/LoadError';
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { splitArtistNames } from "@/lib/artistTracks";
import { getPublishedTracks, getArtists } from "@/lib/catalogCache";
import PullToRefresh from "@/components/PullToRefresh";
import { Loader2, Mic2, ChevronRight } from "lucide-react";
import { useCoverUrl } from "@/hooks/useCoverUrl";

// Split a multi-artist string into individual names, preserving original
// casing. A track credited "Drake feat. Future" counts toward both Drake and
// Future as separate Public Records.
const splitNames = str => splitArtistNames(str, false);

const norm = (s) => (s || "").trim().toLowerCase();

// Special group for names starting with a non-letter.
const letterOf = (name) => {
  const ch = (name || "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "#";
};

// Fades + slides each letter group in as it scrolls into view.
/** @param {any} props */
function AzReveal({ children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if(!window.IntersectionObserver||window.matchMedia("(prefers-reduced-motion: reduce)").matches){setShown(true);return;}
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
      shown ? "opacity-100" : "opacity-0 translate-y-3"}`
      }>
      
      {children}
    </div>);

}

function RecordArtwork({ source, name }) {
  const url = useCoverUrl(source);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <span className="record-artwork">{url && !failed
    ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span aria-hidden="true">{(name || "?").trim().slice(0,1).toUpperCase()}</span>}</span>;
}

export default function PublicRecordsIndex() {
  const {user}=useAuth(),{ids,revision}=useLibrary();
  const [view,setView]=useState("library"),[subscriptions,setSubscriptions]=useState([]);
  const [loadError,setLoadError]=useState(false);
  const [artists, setArtists] = useState(null); // null = loading
  const [owner,setOwner]=useState(user?.id);
  const [activeKey, setActiveKey] = useState("");
  const [query,setQuery]=useState("");
  const requestVersion=useRef(0);
  const groupRefs = useRef({});

  const load = async (fresh=false) => {
    const request=++requestVersion.current;setLoadError(false);
    try {
      const [records, catalog, followed] = await Promise.all([
      getArtists(fresh),
      getPublishedTracks(fresh),
      user?.id ? readAllPages(opts=>base44.entities.ArtistSubscription.filter({created_by_id:user.id},{...opts})) : Promise.resolve([])]
      );
      const tracks=catalog.filter(track=>ids.has(track.id));
      const known=new Set(tracks.map(track=>track.id)),missing=[...ids].filter(id=>!known.has(id));
      for(let offset=0;offset<missing.length;offset+=200){
       const extra=await readAllPages(opts=>base44.entities.Track.filter({id:{$in:missing.slice(offset,offset+200)}},{...opts}));tracks.push(...extra);
      }
      const recordByName = new Map();
      (Array.isArray(records) ? records : []).forEach((a) => {
        const k = norm(a.name);
        if (k && !recordByName.has(k)) recordByName.set(k, a);
        for(const alias of Array.isArray(a.aliases)?a.aliases:[])if(!recordByName.has(norm(alias)))recordByName.set(norm(alias),a);
      });

      // nameKey -> { display, record, count }
      const map = new Map();
      const bump = (display, record, track) => {
        const key = norm(record?.name||display);
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.record && record) existing.record = record;
          if (track?.cover_art_url && (!existing.cover || (Number(track.play_count) || 0) > existing.coverPlays)) {
            existing.cover = track.cover_art_url;
            existing.coverPlays = Number(track.play_count) || 0;
          }
        } else {
          map.set(key, {
            display: record ? record.name : display,
            record: record || null,
            count: 1,
            cover: track?.cover_art_url || "",
            coverPlays: Number(track?.play_count) || 0
          });
        }
      };

      (Array.isArray(tracks) ? tracks : []).forEach((t) => {
        const segs = splitNames(t.artist);
        if (!segs.length) return;
        segs.forEach((seg) => bump(seg, recordByName.get(norm(seg)) || null, t));
      });

      if(view==="followed"){
        map.clear();
        for(const subscription of followed){
          const record=recordByName.get(artistKey(subscription.artist_name));
          map.set(subscription.artist_key,{display:record?.name||subscription.artist_name,record:record||null,count:catalog.filter(t=>splitNames(t.artist).some(name=>artistKey(name)===subscription.artist_key)).length});
        }
      }
      if(request===requestVersion.current)setSubscriptions(followed);
      const list = [...map.values()].sort((a, b) =>
      norm(a.display).localeCompare(norm(b.display))
      );
      if(request===requestVersion.current){setArtists(list);setOwner(user?.id);}
    } catch {if(request===requestVersion.current)setLoadError(true);}
  };

  useEffect(() => {
    load();return()=>{requestVersion.current++;};
  }, [user?.id,ids,revision,view]);
  useEffect(()=>{const refresh=()=>load(true);window.addEventListener("artist-follows:changed",refresh);return()=>window.removeEventListener("artist-follows:changed",refresh);},[user?.id,ids,view]);

  const groups = useMemo(() => {
    const map = {};
    (owner===user?.id?artists||[]:[]).filter(a=>!query.trim()||norm(a.display).includes(norm(query))).forEach((a) => {
      const key = letterOf(a.display);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.keys(map).
    sort((x, y) => x === "#" ? 1 : y === "#" ? -1 : x.localeCompare(y)).
    map((key) => ({ key, items: map[key] }));
  }, [artists,query,owner,user?.id]);

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
    if (!groups.length || !window.IntersectionObserver) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.
        filter((e) => e.isIntersecting).
        sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveKey(visible[0].target.getAttribute("data-key"));
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    groups.forEach((g) => {
      const el = groupRefs.current[g.key];
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [groups]);

  const draggingRef=useRef(false);
  const scrollToLetter = (key) => {
    const el = groupRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ behavior: draggingRef.current||window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth", block: "start" });
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
    draggingRef.current=true;setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    onPick(e.clientY);
  };
  const moveDrag = (e) => {
    if (dragging) onPick(e.clientY);
  };
  const endDrag = () => {
    draggingRef.current=false;setDragging(false);
    setDragLetter("");
  };

  if(loadError&&artists===null)return <LoadError onRetry={()=>load(true)}/>;
  return (
    <div className="directory-page max-w-3xl mx-auto pb-10">
      <header className="page-intro record-directory-intro"><p className="eyebrow">Public Record</p><h1>Behind the music.</h1><p>Artists from your saved music, together in one place.</p>{artists && <span className="record-directory-count">{artists.length} {artists.length === 1 ? "artist" : "artists"} {view==="library"?"in your library":"followed"}</span>}</header>
      

      

      <div className="view-switch mb-5" role="group" aria-label="Your artists"><button aria-pressed={view==="library"} onClick={()=>setView("library")}>Library</button><button aria-pressed={view==="followed"} onClick={()=>setView("followed")}>Followed{ subscriptions.length ? " · "+subscriptions.length : ""}</button></div>
      <div className="directory-toolbar">
      <div className="collection-tools"><input aria-label="Search the artist directory" placeholder="Find an artist" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/>{query&&<button className="playlist-action" onClick={()=>setQuery("")}>Clear search</button>}</div>
      {!!groups.length&&<nav className="directory-desktop-alphabet hidden md:flex" aria-label="Jump to artist letter">{allLetters.map(letter=><button type="button" key={letter} disabled={!letters.includes(letter)} aria-label={`Artists starting with ${letter}`} aria-current={activeKey===letter&&letters.includes(letter)?"location":undefined} onClick={()=>scrollToLetter(letter)}>{letter}</button>)}</nav>}
      </div>
      <PullToRefresh onRefresh={()=>load(true)}>
        {artists === null||owner!==user?.id ?
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div> :
        artists.length === 0 ?
        <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-4">
              <Mic2 size={28} className="text-foreground/40" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight mb-1">No artists here yet</h2>
            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
              {view==="library"?"Save songs to your library to see their artists here.":"Follow an artist from their page to keep them here."} <Link to="/search" className="block underline mt-3">Find music</Link>
            </p>
          </div> :

        <div className="directory-results pr-5 md:pr-8">
            {!groups.length&&<div className="collection-empty"><h2>No matching artists</h2><p>Try another name.</p></div>}
            {groups.map((g) =>
          <AzReveal key={g.key}>
                <div className="scroll-mt-[calc(env(safe-area-inset-top)+2.5rem)]" data-key={g.key} ref={(el) => groupRefs.current[g.key] = el}>
                  <div className="sticky top-[env(safe-area-inset-top)] md:top-0 z-10 px-2 py-2 bg-background border-b border-border/40">
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
                      className="record-directory-card group">
                      
                          <RecordArtwork source={a.cover || a.record?.cover_art_url || a.record?.avatar_url} name={a.display} />
                          <div className="record-directory-identity">
                            <span className="record-directory-name">{a.display}</span>
                            <span className="record-directory-meta">{a.count || 0} {a.count === 1 ? "song" : "songs"}</span>
                            



                        
                          </div>
                          <ChevronRight className="record-directory-arrow" size={18} aria-hidden="true" />
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
      {artists && groups.length > 0 &&
      <>
          <div
          aria-label="Artist alphabet index" role="navigation" tabIndex={0} onKeyDown={e=>{if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;e.preventDefault();const index=letters.indexOf(activeKey);const next=e.key==="Home"?0:e.key==="End"?letters.length-1:Math.max(0,Math.min(letters.length-1,index+(e.key==="ArrowDown"?1:-1)));scrollToLetter(letters[next]);}}
          ref={railRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="md:hidden fixed right-1 md:right-2 top-1/2 -translate-y-1/2 z-30 touch-none select-none px-0.5 md:px-1 py-1 md:py-1.5 rounded-full bg-foreground/[0.05] backdrop-blur-md border border-foreground/[0.06] flex flex-col items-center max-h-[50dvh] overflow-hidden">

          {allLetters.map((L) => {
          const has = letters.includes(L);
          const isActive = activeKey === L;
          return (
            <span
              key={L}
              className={`font-semibold leading-none w-5 h-4 md:w-4 md:h-4 grid place-items-center transition-colors duration-150 text-[8px] md:text-[10px] ${
              has ? "text-foreground/55" : "text-foreground/20"} ${
              isActive || dragLetter === L ? "text-foreground" : ""}`}>
                
                  {L}
                </span>);

          })}
          </div>

          {/* Floating drag indicator bubble */}
          {dragging && dragLetter &&
        <div
          className="fixed right-7 md:right-10 z-40 pointer-events-none"
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
