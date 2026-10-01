import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Search, Loader2, UserPlus, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/ui/use-toast";

// Owner-only sheet for inviting (and removing) the people who can add and
// remove songs in a playlist.
export default function CollaboratorsPanel({ playlist, onClose, onChanged }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState([]);
  const [busyId, setBusyId] = useState("");

  const ids = playlist.collaborator_ids || [];
  const key = ids.join(",");

  // Profiles for the people already on the playlist.
  useEffect(() => {
    if (!ids.length) {
      setMembers([]);
      return;
    }
    let alive = true;
    base44.functions
      .invoke("usersByIds", { ids })
      .then((res) => {
        if (!alive) return;
        const users = res?.data?.users || [];
        setMembers(
          users.map((u) => ({
            id: u.id,
            name: u.display_name || u.full_name || "Listener",
            avatar_url: u.avatar_url || "",
          }))
        );
      })
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: term });
        setResults(res?.data?.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  async function add(user) {
    if (!user?.id || ids.includes(user.id)) return;
    setBusyId(user.id);
    try {
      const updated = await base44.entities.Playlist.update(playlist.id, {
        collaborator_ids: [...ids, user.id],
      });
      onChanged?.(updated);
      setQ("");
      setResults([]);
      toast({ title: `${user.display_name || user.full_name || "They"} can now edit this playlist` });
    } catch {
      toast({ title: "Couldn't add that person", variant: "destructive" });
    } finally {
      setBusyId("");
    }
  }

  async function remove(user) {
    setBusyId(user.id);
    try {
      const updated = await base44.entities.Playlist.update(playlist.id, {
        collaborator_ids: ids.filter((i) => i !== user.id),
      });
      onChanged?.(updated);
      setMembers((prev) => prev.filter((m) => m.id !== user.id));
    } catch {
      toast({ title: "Couldn't remove that person", variant: "destructive" });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight">Collaborators</h2>
            <p className="text-xs text-foreground/50 mt-0.5">
              Collaborators can add and remove songs. Only you can rename or delete it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people to invite…"
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none"
          />
          {searching && (
            <Loader2
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-foreground/40"
            />
          )}
        </div>

        {q.trim().length >= 2 && (
          <div className="mb-4 space-y-0.5">
            {!searching && !results.length && (
              <div className="text-xs text-foreground/50 px-1 py-2">No one found for “{q.trim()}”.</div>
            )}
            {results.map((u) => {
              const already = ids.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => !already && add(u)}
                  disabled={already || busyId === u.id}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/[0.04] transition text-left disabled:opacity-60"
                >
                  <Avatar user={u} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {u.display_name || u.full_name || "Listener"}
                    </div>
                    <div className="text-xs text-foreground/50 truncate">
                      {u.bio || u.location || "PUBLIC listener"}
                    </div>
                  </div>
                  {busyId === u.id ? (
                    <Loader2 size={16} className="animate-spin text-foreground/50" />
                  ) : (
                    <UserPlus size={16} className={already ? "text-foreground/25" : "text-foreground/60"} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/40 mb-2">
          On this playlist
        </div>
        <div className="space-y-0.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl">
              <Avatar user={{ avatar_url: m.avatar_url, display_name: m.name }} size={36} />
              <div className="text-sm font-semibold truncate flex-1 min-w-0">{m.name}</div>
              <button
                onClick={() => remove(m)}
                disabled={busyId === m.id}
                className="w-8 h-8 rounded-full grid place-items-center text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition"
                aria-label={`Remove ${m.name}`}
              >
                {busyId === m.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          ))}
          {!members.length && !ids.length && (
            <p className="text-xs text-foreground/50 px-1">
              No collaborators yet — search above to invite someone.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}