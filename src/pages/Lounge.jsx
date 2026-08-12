import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { fetchSessionByCode, loungeUrl, parseTrack } from "@/lib/lounge";
import { getRecentPlays } from "@/lib/recentPlays";
import {
  Loader2,
  Users,
  Speaker,
  Plus,
  Check,
  X,
  ListMusic,
  Search,
  Clock,
} from "lucide-react";

export default function Lounge() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Resolve session + create-or-fetch my membership record.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code || !user?.id) return;
      setLoading(true);
      try {
        const s = await fetchSessionByCode(code);
        if (cancelled) return;
        if (!s) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setSession(s);
        const mine = await base44.entities.LoungeMember.filter(
          { session_id: s.id, user_id: user.id },
          "created_date",
          50
        );
        if (cancelled) return;
        if (mine.length) {
          setMember(mine[0]);
        } else if (s.host_id === user.id) {
          const m = await base44.entities.LoungeMember.create({
            session_id: s.id,
            user_id: user.id,
            name: user.display_name || user.full_name || "",
            role: "host",
            status: "approved",
          });
          if (!cancelled) setMember(m);
        } else {
          const m = await base44.entities.LoungeMember.create({
            session_id: s.id,
            user_id: user.id,
            name: user.display_name || user.full_name || "",
            role: "guest",
            status: "pending",
          });
          if (!cancelled) setMember(m);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, user?.id]);

  const refreshMember = useCallback(async (sid) => {
    try {
      const all = await base44.entities.LoungeMember.filter({ session_id: sid }, "created_date", 200);
      setMembers(all || []);
      const me = (all || []).find((m) => m.user_id === user?.id);
      if (me) setMember(me);
    } catch {}
  }, [user?.id]);

  // Live member / approval status updates.
  useEffect(() => {
    if (!session?.id) return;
    refreshMember(session.id);
    let unsub;
    try {
      unsub = base44.entities.LoungeMember.subscribe(() => refreshMember(session.id));
    } catch {}
    const poll = setInterval(() => refreshMember(session.id), 5000);
    return () => {
      if (unsub) unsub();
      clearInterval(poll);
    };
  }, [session?.id, refreshMember]);

  const approved = member?.status === "approved";
  const isHost = member?.role === "host";
  const rejected = member?.status === "rejected";
  const pending = member?.status === "pending";

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-foreground/50" />
          </div>
        ) : notFound ? (
          <div className="text-center py-24">
            <Speaker size={36} className="mx-auto text-foreground/30 mb-3" />
            <h2 className="text-lg font-extrabold">Lounge not found</h2>
            <p className="text-sm text-foreground/50 mt-1 mb-4">
              The host may have ended the lounge, or the code is wrong.
            </p>
            <Link to="/" className="text-sm font-semibold underline">
              Back home
            </Link>
          </div>
        ) : !approved ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-foreground/5 grid place-items-center mx-auto mb-4">
              {pending ? <Clock size={28} className="text-foreground/50" /> : <X size={28} className="text-red-500" />}
            </div>
            {pending ? (
              <>
                <h2 className="text-lg font-extrabold">Waiting for approval</h2>
                <p className="text-sm text-foreground/50 mt-1 max-w-xs mx-auto">
                  The host ({session?.host_name || "Host"}) needs to let you in. This page updates automatically.
                </p>
                <div className="inline-flex items-center gap-2 mt-4 text-xs text-foreground/40">
                  <Loader2 size={13} className="animate-spin" /> Listening for the host's decision…
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-extrabold">Declined by host</h2>
                <p className="text-sm text-foreground/50 mt-1">You weren't let into this lounge.</p>
                <button
                  onClick={() => nav("/")}
                  className="mt-4 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
                >
                  Back home
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-border bg-foreground/[0.02] p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-foreground/50">
                  <Speaker size={12} /> {isHost ? "Hosting lounge" : "In the lounge"}
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/40">
                  <Users size={12} />
                  {members.filter((m) => m.status === "approved").length} live
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                  <ListMusic size={28} className="text-foreground/30" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-lg">Add songs to the queue</h3>
                  <p className="text-sm text-foreground/50 mt-1">
                    Tracks you add play on {isHost ? "your" : "the host's"} device. {isHost ? "" : "Ask the host to hit play."}
                  </p>
                </div>
              </div>
            </div>

            <LoungeQueueList sessionId={session.id} isHost={isHost} />

            {/* Add to the shared queue */}
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-border hover:bg-foreground/[0.04] text-sm font-semibold transition mb-3"
            >
              <Plus size={16} /> Add music to the queue
            </button>

            <div className="text-[11px] text-foreground/40 text-center">
              Lounge code <span className="font-bold tracking-widest">{session?.code}</span>
              {!isHost && ` · hosted by ${session?.host_name || "Host"}`}
            </div>
          </>
        )}
      </div>

      {pickerOpen && session?.id && user?.id && (
        <GuestQueuePicker
          sessionId={session.id}
          user={user}
          onClose={() => setPickerOpen(false)}
          onAdded={(ok) =>
            toast(
              ok === false
                ? { title: "Couldn't add track", variant: "destructive" }
                : { title: "Added to the lounge queue" }
            )
          }
        />
      )}
    </div>
  );
}

// ---------------- Guest add-to-queue picker ----------------
function GuestQueuePicker({ sessionId, user, onClose, onAdded }) {
  const { ids } = useLibrary();
  const libraryIds = Array.from(ids || []);
  const [tracks, setTracks] = useState(null);
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState(new Set());

  const load = useCallback(async () => {
    const recent = getRecentPlays().slice(0, 30);
    let libTracks = [];
    try {
      if (libraryIds.length) {
        libTracks = await base44.entities.Track.filter(
          { id: { $in: libraryIds.slice(0, 200) } },
          "-created_date",
          300
        );
      }
    } catch {}
    const byId = new Map();
    [...(libTracks || []), ...recent].forEach((t) => t && byId.set(t.id, t));
    setTracks([...byId.values()]);
  }, [libraryIds.join(",")]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tracks || [];
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.uploader_name?.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  const add = async (t) => {
    const slim = {
      id: t.id,
      title: t.title,
      artist: t.artist || t.uploader_name || "",
      uploader_id: t.uploader_id,
      uploader_name: t.uploader_name || "",
      cover_art_url: t.cover_art_url || "",
      audio_url: t.audio_url,
      duration_seconds: t.duration_seconds || 0,
      genre: t.genre || "Other",
      explicit: !!t.explicit,
    };
    try {
      await base44.entities.LoungeQueueItem.create({
        session_id: sessionId,
        track_id: t.id,
        track: JSON.stringify(slim),
        added_by_id: user?.id,
        added_by_name: user?.display_name || user?.full_name || "",
      });
      setJustAdded((prev) => new Set(prev).add(t.id));
      onAdded?.(true);
    } catch (e) {
      onAdded?.(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xl flex flex-col animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <ListMusic size={20} className="opacity-80 shrink-0" />
          <h2 className="text-lg font-bold truncate">Add to the lounge queue</h2>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/10 active:scale-90 transition" aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="px-5 pb-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library & recently played"
            className="w-full pl-10 pr-3 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/15 transition text-white"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-10 text-white">
        {!tracks ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-white/50" />
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-16">
            <p className="text-sm text-white/50">{query ? "No matches." : "Add tracks to your library first."}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((t) => {
              const added = justAdded.has(t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition">
                  <div className="w-10 h-10 rounded overflow-hidden bg-white/10 shrink-0">
                    {t.cover_art_url && <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-white/50 truncate">{t.artist || t.uploader_name || "Unknown"}</div>
                  </div>
                  <button
                    onClick={() => add(t)}
                    disabled={added}
                    className={`shrink-0 w-9 h-9 rounded-full grid place-items-center active:scale-90 transition ${
                      added ? "bg-green-500/30 text-green-300" : "bg-white/10 hover:bg-white/20"
                    }`}
                    aria-label={added ? "Added" : "Add"}
                  >
                    {added ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Live shared queue ----------------
function LoungeQueueList({ sessionId, isHost }) {
  const p = usePlayer();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [removingId, setRemovingId] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.LoungeQueueItem.filter(
        { session_id: sessionId },
        "created_date",
        100
      );
      setItems(list || []);
    } catch {
      setItems([]);
    } finally {
      setLoadingQ(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    let unsub;
    try {
      unsub = base44.entities.LoungeQueueItem.subscribe(() => load());
    } catch {}
    const poll = setInterval(load, 5000);
    return () => {
      if (unsub) unsub();
      clearInterval(poll);
    };
  }, [load]);

  const parsed = items
    .map((it) => ({ ...parseTrack(it.track), _row: it }))
    .filter((x) => x && x.id);

  const removeItem = async (rowId) => {
    setRemovingId(rowId);
    try {
      await base44.functions.invoke("loungeRemoveQueueItem", { queue_item_id: rowId });
      // The subscription will refresh the list across all devices — no local
      // optimisation needed.
    } catch {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-foreground/[0.02] p-3 mb-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/40 mb-2">
        <ListMusic size={12} /> Up next {parsed.length ? `· ${parsed.length}` : ""}
      </div>
      {loadingQ ? (
        <div className="flex justify-center py-3">
          <Loader2 size={15} className="animate-spin text-foreground/40" />
        </div>
      ) : parsed.length === 0 ? (
        <p className="text-xs text-foreground/40 px-1 py-1">
          The queue is empty. Add a song and it shows up here for everyone.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
          {parsed.map((t, i) => {
            const playing = p.currentTrack?.id === t.id;
            return (
              <div
                key={t._row.id}
                className="flex items-center gap-3 px-1.5 py-1.5 rounded-lg hover:bg-foreground/[0.04] transition"
              >
                <div className="w-7 text-center text-xs text-foreground/40 shrink-0">{i + 1}</div>
                <div className="w-10 h-10 rounded overflow-hidden bg-foreground/10 shrink-0">
                  {t.cover_art_url && <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${playing ? "text-foreground" : ""}`}>
                    {t.title}
                  </div>
                  <div className="text-xs text-foreground/45 truncate">
                    {t.artist || "Unknown"}
                    {t._row.added_by_name ? ` · added by ${t._row.added_by_name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isHost && (
                    <button
                      onClick={() => p.playTrackAt([t])}
                      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background active:scale-90 transition"
                    >
                      {playing ? "Now" : "Play"}
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(t._row.id)}
                    disabled={removingId === t._row.id}
                    className="shrink-0 w-7 h-7 rounded-full grid place-items-center text-foreground/40 hover:text-destructive hover:bg-destructive/10 active:scale-90 transition disabled:opacity-40"
                    aria-label="Remove from queue"
                  >
                    {removingId === t._row.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}