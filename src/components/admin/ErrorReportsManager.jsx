import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Bug, ChevronDown, Trash2, Check, Search } from "lucide-react";
import moment from "moment";

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "investigating", label: "Investigating" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

export default function ErrorReportsManager() {
  const [filter, setFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [counts, setCounts] = useState({});
  const [expanded, setExpanded] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setReports(null);
    try {
      const rows = await base44.entities.ErrorReport.filter(
        filter === "all" ? {} : { status: filter },
        "-created_date",
        100
      );
      setReports(rows || []);
      const all = await base44.entities.ErrorReport.list("-created_date", 300);
      const tally = { open: 0, investigating: 0, resolved: 0 };
      (all || []).forEach((r) => {
        tally[r.status] = (tally[r.status] || 0) + 1;
      });
      setCounts(tally);
    } catch {
      setReports([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(report, status) {
    setBusy(report.id);
    try {
      await base44.entities.ErrorReport.update(report.id, { status });
      setCounts((prev) => ({
        ...prev,
        [status]: (prev[status] || 0) + 1,
        [report.status]: Math.max(0, (prev[report.status] || 0) - 1),
      }));
      setReports((prev) => (prev || []).filter((r) => r.id !== report.id));
    } catch {
      // leave the row in place so it can be retried
    } finally {
      setBusy("");
    }
  }

  async function remove(report) {
    if (!confirm("Delete this report?")) return;
    setBusy(report.id);
    try {
      await base44.entities.ErrorReport.delete(report.id);
      setReports((prev) => (prev || []).filter((r) => r.id !== report.id));
      setCounts((prev) => ({
        ...prev,
        [report.status]: Math.max(0, (prev[report.status] || 0) - 1),
      }));
    } catch {
    } finally {
      setBusy("");
    }
  }

  const list = reports || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Bug size={15} /> Error Reports
        </div>
        <button onClick={load} className="text-xs text-foreground/50 hover:text-foreground">
          Refresh
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.id !== "all" && (
                <span className="opacity-60">{counts[f.id] || 0}</span>
              )}
            </button>
          );
        })}
      </div>

      {reports === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center flex flex-col items-center gap-1.5">
          <Search size={16} className="text-foreground/30" />
          Nothing {filter === "all" ? "reported" : filter} right now.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const open = expanded === r.id;
            return (
              <div key={r.id} className="rounded-lg bg-foreground/[0.02] p-2.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-words selectable-content">{r.message}</div>
                    <div className="text-[11px] text-foreground/50 truncate mt-0.5">
                      {r.user_name || "Listener"} · {r.page_path || "unknown page"} ·{" "}
                      {r.device || "unknown device"} · {moment(r.created_date).fromNow()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.details && (
                      <button
                        onClick={() => setExpanded(open ? "" : r.id)}
                        className="p-2 rounded-full hover:bg-foreground/5"
                        aria-label="Toggle error details"
                      >
                        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    )}
                    {busy === r.id ? (
                      <div className="p-2">
                        <Loader2 size={15} className="animate-spin text-foreground/50" />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setStatus(r, "resolved")}
                          className="p-2 rounded-full hover:bg-foreground/5 text-green-600"
                          aria-label="Mark resolved"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => remove(r)}
                          className="p-2 rounded-full hover:bg-foreground/5 text-destructive"
                          aria-label="Delete report"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {r.status !== "investigating" && busy !== r.id && (
                  <button
                    onClick={() => setStatus(r, "investigating")}
                    className="mt-2 text-[11px] font-semibold text-foreground/55 hover:text-foreground transition"
                  >
                    Mark investigating
                  </button>
                )}

                {open && r.details && (
                  <pre className="selectable-content mt-2 px-2.5 py-2 rounded-lg bg-foreground/[0.04] text-[11px] whitespace-pre-wrap break-words text-foreground/60">
                    {r.details}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}