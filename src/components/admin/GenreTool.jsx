import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Wand2, Loader2 } from "lucide-react";

export default function GenreTool() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  async function run(force = false) {
    if (busy) return;
    setBusy(true);
    setInfo(null);
    let total = 0,skip=0,unmatched=0;
    try {
      while (true) {
        const res = await base44.functions.invoke("classifyGenres", { force,skip });
        const d = res?.data || {};
        total += d.processed || 0;unmatched += d.unmatched || 0;
        if(d.retry_required)throw new Error(d.error||"Catalog lookup paused. Retry shortly.");
        if(d.has_more&&(!Number.isInteger(d.skip)||d.skip<=skip))throw new Error("Classifier did not advance");
        skip=d.skip||skip;
        setInfo({ total, unmatched, done: !d.has_more });
        if (!d.has_more) break;
      }
      toast({ title: `Classified ${total} track${total !== 1 ? "s" : ""}` });
    } catch (error) {
      toast({ title: error.message || "Catalog lookup failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Wand2 size={15} /> Match catalog genres
          </div>
          <div className="text-xs text-foreground/50 mt-0.5">
            Matches catalog genres. Songs without a confident match stay unchanged.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => run(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-border hover:bg-foreground/5 disabled:opacity-50 transition"
          >
            Match all songs
          </button>
          <button
            onClick={() => run(false)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50 active:scale-95 transition"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {busy ? "Classifying…" : "Match missing genres"}
          </button>
        </div>
      </div>
      {info && (
        <div className="text-xs text-foreground/50 mt-2">
          {busy
            ? `Classified ${info.total} so far…`
            : info.total
              ? `Done — ${info.total} track${info.total !== 1 ? "s" : ""} updated.`
              : "No confident updates found. Existing genres were kept."}
        </div>
      )}
    </div>
  );
}