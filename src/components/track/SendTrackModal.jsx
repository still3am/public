import {useSafety} from "@/context/SafetyContext";
import {searchPeople} from "@/lib/globalSearch";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, X, Send, Check, Loader2, Music, ChevronLeft } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Image } from "@/components/ui/image";


const MIN_QUERY = 2;

function nameOf(person) {
  return person?.display_name || person?.full_name || "them";
}

/**
 * Sends a track to another listener. There is no chat here — the song is
 * delivered as a notification, so the recipient finds it in their feed and can
 * play it straight from there.
 *
 * Two steps on purpose: pick the friend, then write the note and send. The note
 * belongs to the send, so it is asked for at the moment of sending rather than
 * sitting above the search where it is easy to walk straight past.
 */
/** @param {any} props */
export default function SendTrackModal({ track, onClose }) {
  const { user } = useAuth();
  const { blocked } = useSafety();
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[]);
  const request=useRef(0);
  const alive=useRef(true),seed=useRef("");
  seed.current=[user?.id,track?.id].join(":");
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
  const [query, setQuery] = useState("");
  const [retry,setRetry]=useState(0);
  const [searchFailed,setSearchFailed]=useState(false);
  const sendingRef=useRef(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  useEffect(() => {
    const id=++request.current;setSearchFailed(false);
    const q = query.trim().toLowerCase();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchPeople(q);
        if(id===request.current)setResults((res?.data?.results || []).filter(person=>person.id!==user?.id));
      } catch {
        if(id===request.current){setResults([]);setSearchFailed(true);}
      } finally {
        if(id===request.current)setSearching(false);
      }
    }, 300);
    return () => {request.current++;clearTimeout(timer);};
  }, [query,retry,user?.id]);

  useEffect(()=>{setPicked(null);setSent(null);setNote("");setQuery("");setResults([]);},[track?.id,user?.id]);

  if (!track) return null;

  const send = async () => {
    if (!picked || !user?.id || sendingRef.current) return;
    sendingRef.current=true;setSending(true);const started=seed.current;
    try {
      await base44.entities.Notification.create({
        user_id: picked.id,
        type: "track_shared",
        actor_id: user.id,
        track_id: track.id,
        comment: note.trim(),
      });
      if(alive.current&&seed.current===started)setSent({ person: picked, note: note.trim() });
    } catch {
      // Keep the recipient and note ready for another attempt.
    } finally {
      sendingRef.current=false;if(alive.current)setSending(false);
    }
  };

  const sendElsewhere = () => {
    setSent(null);
    setPicked(null);
    setNote("");
    setQuery("");
    setResults([]);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Send song to a friend" data-public-dialog tabIndex={-1} onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();onClose();}}} className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 max-h-[85dvh] flex flex-col overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">
              {sent ? "Sent" : picked ? "Add a note" : "Send to a friend"}
            </h2>
            <p className="text-xs text-foreground/50 mt-0.5">
              {sent
                ? "It is in their notifications, ready to play."
                : picked
                  ? "Your note travels with the song, right under it."
                  : "It lands in their notifications, ready to play."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-foreground/[0.04] mb-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
            {track.cover_art_url ? (
              <Image src={track.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
            ) : (
              <Music size={16} className="text-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{track.title}</div>
            <div className="text-xs text-foreground/50 truncate">
              {track.artist || track.uploader_name || "Unknown"}
            </div>
          </div>
        </div>

        {searchFailed&&!picked&&!sent&&<button onClick={()=>setRetry(n=>n+1)} className="text-sm underline p-3">Refresh people</button>}
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 grid place-items-center mb-3">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold">Sent to {nameOf(sent.person)}</p>
            {sent.note && (
              <p className="mt-2 text-xs italic text-foreground/70 break-words max-w-[16rem]">
                "{sent.note}"
              </p>
            )}
          </div>
        ) : picked ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-foreground/[0.04] mb-3">
              <Avatar user={picked} size={40} />
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{nameOf(picked)}</span>
              <button
                disabled={sending}
                onClick={() => setPicked(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition shrink-0"
              >
                <ChevronLeft size={14} /> Change
              </button>
            </div>

            <textarea
              autoFocus
              rows={3}
              aria-label="Optional note" disabled={sending}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Add a note (optional)"
              className="w-full px-3.5 py-3 rounded-2xl bg-foreground/[0.05] border border-transparent focus:border-border focus:outline-none text-sm resize-none"
            />
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                autoFocus
                aria-label="Search friends"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a friend by name…"
                className="w-full pl-10 pr-3 py-3 rounded-2xl bg-foreground/[0.05] border border-transparent focus:border-border focus:outline-none text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain -mx-1 px-1 min-h-[7rem]">
              {searching ? (
                <div className="grid place-items-center py-8">
                  <Loader2 size={18} className="animate-spin text-foreground/40" />
                </div>
              ) : query.trim().length < MIN_QUERY ? (
                <p className="text-center text-xs text-foreground/50 py-8 px-4">
                  Type at least two letters of your friend's name to find them.
                </p>
              ) : results.length === 0 && !searchFailed ? (
                <p className="text-center text-xs text-foreground/50 py-8 px-4">
                  No one matches that name.
                </p>
              ) : (
                <div className="space-y-1">
                  {results.filter(person=>!blocked.has(person.id)).map((person) => (
                    <button
                      key={person.id}
                      onClick={() => setPicked(person)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.04] transition text-left"
                    >
                      <Avatar user={person} size={40} />
                      <span className="flex-1 min-w-0 text-sm font-semibold truncate">{nameOf(person)}</span>
                      <Send size={15} className="text-foreground/40" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {sent ? (
          <div className="mt-3 space-y-2">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.99] transition"
            >
              Done
            </button>
            <button
              onClick={sendElsewhere}
              className="w-full py-3 rounded-2xl bg-foreground/[0.06] text-sm font-semibold active:scale-[0.99] transition"
            >
              Send to someone else
            </button>
          </div>
        ) : picked ? (
          <button
            onClick={send}
            disabled={sending}
            className="mt-3 w-full py-3 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.99] transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            {sending ? "Sending…" : "Send song"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="mt-3 w-full py-3 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.99] transition"
          >
            Done
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}