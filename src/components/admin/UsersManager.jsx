import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Users, Loader2, RefreshCw } from "lucide-react";

export default function UsersManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setUsers(null);
    const r = await base44.entities.User.list("-created_date", 500).catch(() => []);
    setUsers(r);
  }

  useEffect(() => { load(); }, []);

  async function setRole(u, role) {
    setBusy(u.id);
    try {
      await base44.entities.User.update(u.id, { role });
      setUsers((prev) => (prev || []).map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast({ title: `${u.full_name || u.email} is now ${role}` });
    } catch {
      toast({ title: "Couldn't change role", variant: "destructive" });
    } finally {
      setBusy("");
    }
  }

  const list = (users || []).filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Users size={15} /> Users {users ? `· ${users.length}` : ""}
        </div>
        <button onClick={load} className="p-2 rounded-full hover:bg-foreground/5 text-foreground/50" aria-label="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email"
        className="w-full mb-3 px-3 py-2 rounded-full border border-border bg-background text-sm"
      />

      {users === null ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-foreground/40" /></div>
      ) : list.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">No users found.</div>
      ) : (
        <div className="space-y-2 max-h-[26rem] overflow-y-auto">
          {list.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl bg-foreground/[0.02]">
              <div className="min-w-0 flex-1">
                <Link to={`/profile/${u.id}`} className="text-sm font-medium truncate block hover:underline">
                  {u.full_name || "Unnamed"}
                </Link>
                <div className="text-xs text-foreground/50 truncate">{u.email}</div>
              </div>
              {busy === u.id ? (
                <Loader2 size={15} className="animate-spin shrink-0" />
              ) : (
                <select
                  value={u.role || "user"}
                  onChange={(e) => setRole(u, e.target.value)}
                  className="text-xs border border-border rounded-full px-2 py-1 bg-background shrink-0"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}