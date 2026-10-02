import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Music, Disc3, CornerDownLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getPublishedTracks, getArtists } from "@/lib/catalogCache";
import { Image } from "@/components/ui/image";
import Avatar from "@/components/Avatar";

const PAGES = [
{ label: "Home", path: "/" },
{ label: "Search", path: "/search" },
{ label: "Top Charts", path: "/top" },
{ label: "Recently Added", path: "/recent" },
{ label: "Your Library", path: "/library" },
{ label: "Upload a track", path: "/upload" },
{ label: "Public Records", path: "/records" },
{ label: "Offline Downloads", path: "/downloads" },
{ label: "Notifications", path: "/notifications" },
{ label: "Artist Dashboard", path: "/artist-dashboard" }];


const KIND_LABEL = { track: "Track", artist: "Artist", person: "Person", page: "Page" };

function ResultRow({ row, active, onClick, onHover, refEl }) {
  return (
    <button
      ref={refEl}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
      active ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.03]"}`
      }>
      
      <span className="w-9 h-9 rounded-lg overflow-hidden bg-foreground/[0.06] shrink-0 grid place-items-center text-foreground/50">
        {row.kind === "track" && row.cover ?
        <Image src={row.cover} fittingType="fill" alt="" className="w-full h-full object-cover" /> :
        row.kind === "track" ? <Music size={15} /> :
        row.kind === "artist" ? <Disc3 size={15} /> :
        row.kind === "person" ? <Avatar user={row.user} size={36} /> :
        <Search size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{row.title}</span>
        <span className="block text-xs text-foreground/55 truncate">{row.subtitle}</span>
      </span>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-foreground/40">
        {KIND_LABEL[row.kind]}
      </span>
    </button>);

}

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState({ tracks: [], artists: [] });
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const reqId = useRef(0);
  const inputRef = useRef(null);
  const rowRefs = useRef([]);

  const Q = q.trim().toLowerCase();

  // Reset + focus whenever the palette opens
  useEffect(() => {
    if (!open) return;
    setQ("");
    setPeople([]);
    setCursor(0);
    rowRefs.current = [];
    document.documentElement.classList.add("modal-open");
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      clearTimeout(t);
      document.documentElement.classList.remove("modal-open");
    };
  }, [open]);

  // Warm the shared catalogue once — local filtering then feels instant
  useEffect(() => {
    if (!open || catalog.tracks.length) return;
    let cancelled = false;
    (async () => {
      try {
        const [tracks, artists] = await Promise.all([getPublishedTracks(), getArtists()]);
        if (cancelled) return;
        setCatalog({
          tracks: Array.isArray(tracks) ? tracks : [],
          artists: Array.isArray(artists) ? artists : []
        });
      } catch {
        /* leave the catalogue empty; people search still works */
      }
    })();
    return () => {cancelled = true;};
  }, [open, catalog.tracks.length]);

  // People require a remote lookup — debounce it, with a stale-request guard
  useEffect(() => {
    if (!open || !Q) {
      setPeople([]);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: Q });
        if (id === reqId.current) setPeople(res?.data?.results || []);
      } catch {
        if (id === reqId.current) setPeople([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, Q]);

  useEffect(() => {setCursor(0);}, [Q]);

  const rows = useMemo(() => {
    if (!Q) return [];
    const trackHits = catalog.tracks.
    filter((t) =>
    t.title?.toLowerCase().includes(Q) ||
    t.artist?.toLowerCase().includes(Q) ||
    t.uploader_name?.toLowerCase().includes(Q) ||
    t.genre?.toLowerCase().includes(Q)
    ).
    slice(0, 6);
    const artistHits = catalog.artists.
    filter((a) => a.name?.toLowerCase().includes(Q)).
    slice(0, 4);
    const pageHits = PAGES.filter((p) => p.label.toLowerCase().includes(Q)).slice(0, 3);

    return [
    ...trackHits.map((t) => ({
      key: `t-${t.id}`,
      kind: "track",
      title: t.title,
      subtitle: t.artist || t.uploader_name || "Unknown artist",
      cover: t.cover_art_url,
      to: `/track/${t.id}`
    })),
    ...artistHits.map((a) => ({
      key: `a-${a.id}`,
      kind: "artist",
      title: a.name,
      subtitle: [a.genre, a.location].filter(Boolean).join(" · ") || "Artist",
      to: `/records/${a.id}`
    })),
    ...people.map((u) => ({
      key: `u-${u.id}`,
      kind: "person",
      title: u.display_name || u.full_name || "Unnamed",
      subtitle: u.location || "PUBLIC member",
      user: u,
      to: `/profile/${u.id}`
    })),
    ...pageHits.map((p) => ({
      key: `p-${p.path}`,
      kind: "page",
      title: p.label,
      subtitle: "Open page",
      to: p.path
    }))];

  }, [Q, catalog, people]);

  useEffect(() => {
    rowRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor, rows.length]);

  const openRow = (row) => {
    onClose();
    navigate(row.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {onClose();return;}
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(Math.max(rows.length - 1, 0), c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[cursor]) openRow(rows[cursor]);
      else if (Q) {onClose();navigate(`/search?q=${encodeURIComponent(q.trim())}`);}
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[8vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick search">
      
      <div
        className="w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[74vh]"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="shrink-0 text-foreground/45" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tracks, artists, people, pages…"
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none" />
          
          {loading && <Loader2 size={15} className="animate-spin text-foreground/40 shrink-0" />}
          <button
            onClick={onClose}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-foreground/45 border border-border rounded px-1.5 py-1">
            
            Esc
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!Q ?
          <p className="px-3 py-6 text-sm text-foreground/50 text-center">
              Start typing to search the PUBLIC network.
            </p> :
          rows.length === 0 ?
          <p className="px-3 py-6 text-sm text-foreground/50 text-center">
              {loading ? "Searching…" : `No matches for “${q.trim()}”`}
            </p> :

          <div className="space-y-0.5">
              {rows.map((row, i) =>
            <ResultRow
              key={row.key}
              row={row}
              active={i === cursor}
              onClick={() => openRow(row)}
              onHover={() => setCursor(i)}
              refEl={(el) => {rowRefs.current[i] = el;}} />

            )}
            </div>
          }
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs text-foreground/50">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={13} /> Open
          </span>
          <span>↑↓ navigate · Esc close</span>
        </div>
      </div>
    </div>);

}