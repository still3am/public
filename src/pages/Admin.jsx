import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/EmptyState";
import {
  Loader2,
  Shield,
  Flag,
  Music,
  Users,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const [q, setQ] = useState("");

  async function load() {
    if (user?.role !== "admin") return;
    setLoading(true);
    try {
      const [u, r, s] = await Promise.all([
        base44.entities.User.list("-created_date", 200).catch(() => []),
        base44.entities.Report
          .filter({ status: "pending" }, "-created_date", 100)
          .catch(() => []),
        base44.entities.Suggestion.list("-created_date", 100).catch(() => []),
      ]);
      setUsers(u);
      setReports(r);
      setSuggestions(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user?.role !== "admin") {
    return (
      <EmptyState
        icon={Shield}
        title="Admin only"
        description="This area is reserved for PUBLIC admins."
      />
    );
  }

  async function toggleVerified(u) {
    const next = !u.is_verified;
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, is_verified: next } : x))
    );
    try {
      await base44.entities.User.update(u.id, { is_verified: next });
    } catch {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_verified: !next } : x))
      );
    }
  }

  async function unpublishTrack(id) {
    await base44.entities.Track.update(id, { is_published: false });
  }

  async function dismissReport(id) {
    await base44.entities.Report.update(id, { status: "reviewed" });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function updateSuggestionStatus(id, status) {
    const prev = suggestions;
    setSuggestions((list) =>
      list.map((s) => (s.id === id ? { ...s, status } : s))
    );
    try {
      await base44.entities.Suggestion.update(id, { status });
    } catch {
      setSuggestions(prev);
    }
  }

  const filtered = users.filter((u) =>
    (u.display_name || u.full_name || u.email || "")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
        <Shield size={22} /> Admin
      </h1>
      <p className="text-sm text-foreground/50 mb-6">
        Verify artists, review reports, and triage community ideas.
      </p>

      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto no-scrollbar">
        {[
          { id: "users", label: "Users", icon: Users },
          {
            id: "reports",
            label: `Reports${reports.length ? ` (${reports.length})` : ""}`,
            icon: Flag,
          },
          {
            id: "suggestions",
            label: `Ideas${suggestions.length ? ` (${suggestions.length})` : ""}`,
            icon: Lightbulb,
          },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground/50"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : tab === "users" ? (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users by name or email"
            className="w-full max-w-md px-3 py-2 mb-4 rounded-full border border-border bg-background text-sm"
          />
          <div className="space-y-1">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-foreground/[0.02]"
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-foreground/10 grid place-items-center font-semibold">
                    {(u.display_name || u.email || "?").charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate flex items-center gap-1">
                    {u.display_name || u.full_name || "Unnamed"}
                    {u.is_verified && <Shield size={12} />}
                  </div>
                  <div className="text-xs text-foreground/50 truncate">
                    {u.email}
                  </div>
                </div>
                <Toggle
                  label="Verified"
                  on={!!u.is_verified}
                  onClick={() => toggleVerified(u)}
                  icon={Shield}
                />
              </div>
            ))}
          </div>
        </>
      ) : tab === "reports" ? (
        <div className="space-y-2">
          {reports.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No pending reports"
              description="The community is behaving."
            />
          ) : (
            reports.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-border">
                <div className="text-sm font-semibold">
                  Reported track: {r.track_id}
                </div>
                <p className="text-sm text-foreground/60 mt-1">{r.reason}</p>
                <div className="text-xs text-foreground/40 mt-1">
                  Reported by {r.reporter_id}
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() =>
                      unpublishTrack(r.track_id).then(() => dismissReport(r.id))
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500 text-white flex items-center gap-1"
                  >
                    <Music size={12} /> Unpublish
                  </button>
                  <button
                    onClick={() => dismissReport(r.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No community ideas yet"
              description="Suggestions submitted in the Suggestions page will appear here."
            />
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-foreground/60">
                    {s.category || "other"}
                  </div>
                  <select
                    value={s.status || "open"}
                    onChange={(e) => updateSuggestionStatus(s.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border border-border bg-background"
                  >
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="planned">Planned</option>
                    <option value="done">Shipped</option>
                  </select>
                </div>
                <div className="text-sm font-semibold mt-1">{s.title}</div>
                {s.details && (
                  <p className="text-sm text-foreground/60 mt-1">{s.details}</p>
                )}
                <div className="text-[11px] text-foreground/40 mt-2 flex items-center gap-2">
                  By {s.user_name || "anonymous"} · {(s.voter_ids || []).length}{" "}
                  vote(s)
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
        on
          ? "bg-foreground text-background"
          : "border border-border text-foreground/60"
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}