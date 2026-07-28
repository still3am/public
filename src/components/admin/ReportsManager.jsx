import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Check, X, Loader2, Flag } from "lucide-react";

export default function ReportsManager() {
  const [reports, setReports] = useState(null);
  const [tracks, setTracks] = useState({});
  const [busy, setBusy] = useState("");

  async function load() {
    setReports(null);
    try {
      const r = await base44.entities.Report.filter({ status: "pending" }, "-created_date", 50);
      setReports(r);
      const ids = [...new Set(r.map((x) => x.track_id).filter(Boolean))];
      const map = {};
      for (const id of ids) {
        try { map[id] = await base44.entities.Track.get(id); } catch {}
      }
      setTracks(map);
    } catch {
      setReports([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setBusy(id);
    try {
      await base44.entities.Report.update(id, { status });
      setReports((prev) => (prev || []).filter((r) => r.id !== id));
    } catch {} finally {
      setBusy("");
    }
  }

  const list = reports || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Flag size={15} /> Reports Queue
        </div>
        <button onClick={load} className="text-xs text-foreground/50 hover:text-foreground">Refresh</button>
      </div>
      {reports === null ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-foreground/40" /></div>
      ) : list.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">No pending reports.</div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const t = tracks[r.track_id];
            return (
              <div key={r.id} className="flex items-start gap-3 p-2 rounded-lg bg-foreground/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {t ? t.title : "Unknown track"}
                  </div>
                  <div className="text-xs text-foreground/50 truncate">{r.reason || "No reason given"}</div>
                  <Link to={`/track/${r.track_id}`} className="text-[11px] text-foreground/40 hover:underline">
                    Open track
                  </Link>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setStatus(r.id, "dismissed")}
                    disabled={busy === r.id}
                    className="p-2 rounded-full hover:bg-foreground/5"
                    aria-label="Dismiss"
                  >
                    {busy === r.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "reviewed")}
                    disabled={busy === r.id}
                    className="p-2 rounded-full hover:bg-foreground/5 text-green-600"
                    aria-label="Mark reviewed"
                  >
                    <Check size={15} />
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