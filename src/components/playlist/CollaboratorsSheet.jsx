import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Input } from "@/components/ui/input";
import { getUsersByIds } from "@/lib/userLookup";
import { useToast } from "@/components/ui/use-toast";

// Share a playlist: everyone on the list can add and remove songs.
export default function CollaboratorsSheet({ playlist, onChanged, onClose }) {
  const { toast } = useToast();
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState("");

  const ids = playlist.collaborator_ids || [];

  useEffect(() => {
    let alive = true;
    getUsersByIds(ids).then((users) => alive && setPeople(users));
    return () => {
      alive = false;
    };
  }, [ids.join(",")]);

  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: needle });
        setResults(res?.data?.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function save(nextIds) {
    const updated = await base44.entities.Playlist.update(playlist.id, {
      collaborator_ids: nextIds,
    });
    onChanged?.(updated);
  }

  async function add(user) {
    if (!user?.id || ids.includes(user.id)) return;
    setBusy(user.id);
    try {
      await save([...ids, user.id]);
      setQ("");
      setResults([]);
    } catch {
      toast({ title: "Couldn't add that person", variant: "destructive" });
    } finally {
      setBusy("");
    }
  }

  async function remove(userId) {
    setBusy(userId);
    try {
      await save(ids.filter((i) => i !== userId));
    } catch {
      toast({ title: "Couldn't remove that person", variant: "destructive" });
    } finally {
      setBusy("");
    }
  }

  const candidates = results.filter((r) => r?.id && !ids.includes(r.id));

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] flex flex-col">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight">Collaborators</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-foreground/50 mb-3">
          Anyone you add can put songs in this playlist and take them out.
        </p>

        {people.length > 0 && (
          <div className="mb-3 space-y-1">
            {people.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-1.5 rounded-xl">
                <Avatar user={u} size={32} />
                <div className="min-w-0 flex-1 text-sm font-semibold truncate">
                  {u.display_name || u.full_name || u.email}
                </div>
                <button
                  onClick={() => remove(u.id)}
                  className="p-2 rounded-full text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition"
                  aria-label="Remove collaborator"
                >
                  {busy === u.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find someone by name"
            className="h-10 pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {searching && !candidates.length ? (
            <div className="grid place-items-center py-6">
              <Loader2 className="animate-spin text-foreground/40" />
            </div>
          ) : (
            <div className="space-y-1">
              {candidates.map((u) => (
                <button
                  key={u.id}
                  onClick={() => add(u)}
                  disabled={!!busy}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-foreground/[0.04] transition"
                >
                  <Avatar user={u} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{u.display_name || u.full_name}</div>
                    <div className="text-xs text-foreground/50 truncate">{u.email}</div>
                  </div>
                  {busy === u.id ? (
                    <Loader2 size={15} className="animate-spin shrink-0" />
                  ) : (
                    <UserPlus size={15} className="text-foreground/40 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}