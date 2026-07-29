import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Music2, Play, Clock, Loader2 } from "lucide-react";

function StatCard({ icon: Icon, label, value, loading }) {
  return null;










}

export default function AdminStats() {
  const [s, setS] = useState(null);

  useEffect(() => {
    let alive = true;

    // Paginate past the 1000-row server cap using a created_date cursor so the
    // counts stay accurate on large catalogs.
    async function countAll(entity, sort = "-created_date", pageSize = 1000) {
      let total = 0;
      let cursor = null;
      while (true) {
        const query = cursor ? { created_date: { $lt: cursor } } : {};
        let page;
        try {
          page = await entity.filter(query, sort, pageSize);
        } catch {
          break;
        }
        if (!page || !page.length) break;
        total += page.length;
        if (page.length < pageSize) break;
        const last = page[page.length - 1];
        cursor = last?.created_date;
        if (!cursor) break;
      }
      return total;
    }

    async function countTracks() {
      let total = 0;
      let plays = 0;
      let pending = 0;
      let cursor = null;
      while (true) {
        const query = cursor ? { created_date: { $lt: cursor } } : {};
        let page;
        try {
          page = await base44.entities.Track.filter(query, "-created_date", 1000);
        } catch {break;}
        if (!page || !page.length) break;
        for (const t of page) {
          total++;
          plays += t.play_count || 0;
          if (t.approval_status === "pending") pending++;
        }
        if (page.length < 1000) break;
        cursor = page[page.length - 1]?.created_date;
        if (!cursor) break;
      }
      return { total, plays, pending };
    }

    async function load() {
      const [users, t] = await Promise.all([
      countAll(base44.entities.User),
      countTracks()]
      );
      if (!alive) return;
      setS({
        users,
        tracks: t.total,
        plays: t.plays,
        pending: t.pending
      });
    }

    load();

    // live updates: entity events + a poll as a safety net
    const unsubs = [];
    try {unsubs.push(base44.entities.Track.subscribe(() => load()));} catch {}
    try {unsubs.push(base44.entities.User.subscribe(() => load()));} catch {}
    const timer = setInterval(load, 10000);

    return () => {
      alive = false;
      clearInterval(timer);
      unsubs.forEach((u) => u && u());
    };
  }, []);

  const loading = !s;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Users} label="Users" value={s?.users} loading={loading} />
      <StatCard icon={Music2} label="Tracks" value={s?.tracks} loading={loading} />
      <StatCard icon={Play} label="Total plays" value={s?.plays} loading={loading} />
      <StatCard icon={Clock} label="Awaiting review" value={s?.pending} loading={loading} />
    </div>);

}