import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Music2, Play, Clock, Loader2 } from "lucide-react";

function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-foreground/50 mb-2">
        <Icon size={14} />
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-extrabold tabular-nums">
        {loading ? <Loader2 size={20} className="animate-spin text-foreground/40" /> : value}
      </div>
    </div>
  );
}

export default function AdminStats() {
  const [s, setS] = useState(null);

  useEffect(() => {
    (async () => {
      const [users, tracks, pending] = await Promise.all([
        base44.entities.User.list("-created_date", 1000).catch(() => []),
        base44.entities.Track.list("-created_date", 1000).catch(() => []),
        base44.entities.Track.filter({ approval_status: "pending" }, "-created_date", 500).catch(() => []),
      ]);
      setS({
        users: users.length,
        tracks: tracks.length,
        plays: tracks.reduce((a, t) => a + (t.play_count || 0), 0),
        pending: pending.length,
      });
    })();
  }, []);

  const loading = !s;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Users} label="Users" value={s?.users} loading={loading} />
      <StatCard icon={Music2} label="Tracks" value={s?.tracks} loading={loading} />
      <StatCard icon={Play} label="Total plays" value={s?.plays} loading={loading} />
      <StatCard icon={Clock} label="Awaiting review" value={s?.pending} loading={loading} />
    </div>
  );
}