import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Lightbulb, Loader2, Trash2 } from "lucide-react";

const STATUSES = ["open", "reviewing", "planned", "done"];

export default function SuggestionsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState("");

  async function load() {
    setItems(null);
    try {
      const r = await base44.entities.Suggestion.filter({}, "-created_date", 50);
      setItems(r);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setBusy(id);
    try {
      await base44.entities.Suggestion.update(id, { status });
      setItems((prev) => (prev || []).map((s) => (s.id === id ? { ...s, status } : s)));
      toast({ title: "Status updated" });
    } catch {} finally {
      setBusy("");
    }
  }

  async function remove(id) {
    setBusy(id);
    try {
      await base44.entities.Suggestion.delete(id);
      setItems((prev) => (prev || []).filter((s) => s.id !== id));
      toast({ title: "Suggestion deleted" });
    } catch {} finally {
      setBusy("");
    }
  }

  const list = items || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb size={15} /> Suggestions
        </div>
        <button onClick={load} className="text-xs text-foreground/50 hover:text-foreground">Refresh</button>
      </div>
      {items === null ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-foreground/40" /></div>
      ) : list.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">No suggestions yet.</div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="p-3 rounded-lg bg-foreground/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  {s.details && <div className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{s.details}</div>}
                  <div className="text-[11px] text-foreground/40 mt-1">
                    {s.user_name || "Anonymous"} · {s.category} · {s.voter_ids?.length || 0} votes
                  </div>
                </div>
                {busy === s.id ? (
                  <Loader2 size={15} className="animate-spin shrink-0" />
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={s.status}
                      onChange={(e) => setStatus(s.id, e.target.value)}
                      className="text-xs border border-border rounded-full px-2 py-1 bg-background"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    {s.status === "done" && (
                      <button
                        onClick={() => remove(s.id)}
                        className="w-7 h-7 rounded-full grid place-items-center text-destructive hover:bg-destructive/10 transition active:scale-95"
                        aria-label="Delete suggestion"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}