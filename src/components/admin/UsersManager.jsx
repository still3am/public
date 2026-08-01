import { useEffect, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import UserRow from "@/components/admin/UserRow";
import UserCountStat from "@/components/admin/UserCountStat";

export default function UsersManager() {
  const [users, setUsers] = useState(null);
  const [uploadCounts, setUploadCounts] = useState({});
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const [list, tracks] = await Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.Track.list("-created_date", 5000),
    ]);
    const counts = {};
    (tracks || []).forEach((t) => {
      if (t.uploader_id) counts[t.uploader_id] = (counts[t.uploader_id] || 0) + 1;
    });
    setUploadCounts(counts);
    setUsers(list || []);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBlock = async (u) => {
    setBusyId(u.id);
    await base44.entities.User.update(u.id, { is_blocked: !u.is_blocked });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, is_blocked: !u.is_blocked } : x))
    );
    setBusyId(null);
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.full_name || u.email}? This cannot be undone.`)) return;
    setBusyId(u.id);
    await base44.entities.User.delete(u.id);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    setBusyId(null);
  };

  const term = q.trim().toLowerCase();
  const filtered = (users || []).filter(
    (u) =>
      !term ||
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
  );

  if (!users) {
    return (
      <div className="py-16 grid place-items-center">
        <Loader2 size={20} className="animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div>
      <UserCountStat />
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users"
          className="pl-9 h-10 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center text-foreground/50">
          <Users size={26} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div>
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              uploads={uploadCounts[u.id] || 0}
              busy={busyId === u.id}
              onToggleBlock={toggleBlock}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}