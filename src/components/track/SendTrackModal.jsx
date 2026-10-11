import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, X, Send, Check, Loader2, Music } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";

const MIN_QUERY = 2;

/**
 * Sends a track to another listener. There is no chat here — the song is
 * delivered as a notification, so the recipient finds it in their feed and can
 * play it straight from there.
 */
export default function SendTrackModal({ track, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState([]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q });
        setResults(res?.data?.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!track) return null;

  // Your own profile is included on purpose: it is the quickest way to check
  // the whole flow end to end, and sending to yourself is harmless.
  const people = results;

  const send = async (person) => {
    setSendingId(person.id);
    try {
      await base44.entities.Notification.create({
        user_id: person.id,
        type: "track_shared",
        actor_id: user.id,
        track_id: track.id,
        comment: comment.trim(),
      });
      setSentIds((prev) => [...prev, person.id]);
      toast({ title: `Sent to ${person.display_name || person.full_name || "them"}` });
    } catch {
      toast({ title: "Couldn't send that. Try again.", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] flex flex-col"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">Send to a friend</h2>
            <p className="text-xs text-foreground/50 mt-0.5">
              It lands in their notifications, ready to play.
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

        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          maxLength={140}
          className="w-full px-3.5 py-3 rounded-2xl bg-foreground/[0.05] border border-transparent focus:border-border focus:outline-none text-sm mb-3"
        />

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            autoFocus
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
          ) : people.length === 0 ? (
            <p className="text-center text-xs text-foreground/50 py-8 px-4">
              No one matches that name.
            </p>
          ) : (
            <div className="space-y-1">
              {people.map((person) => {
                const sent = sentIds.includes(person.id);
                return (
                  <button
                    key={person.id}
                    onClick={() => !sent && send(person)}
                    disabled={sent || sendingId === person.id}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.04] transition text-left disabled:cursor-default"
                  >
                    <Avatar user={person} size={40} />
                    <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                      {person.display_name || person.full_name || "Unnamed"}
                    </span>
                    {sendingId === person.id ? (
                      <Loader2 size={16} className="animate-spin text-foreground/50" />
                    ) : sent ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                        <Check size={14} /> Sent
                      </span>
                    ) : (
                      <Send size={15} className="text-foreground/40" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-3 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.99] transition"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}