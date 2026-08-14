import { Music, Sparkles, Wrench, MessageSquare, ArrowBigUp } from "lucide-react";

const CATEGORY_META = {
  feature: { label: "Feature", icon: Sparkles, color: "text-violet-600 dark:text-violet-400" },
  music: { label: "Music", icon: Music, color: "text-amber-600 dark:text-amber-400" },
  improvement: { label: "Improvement", icon: Wrench, color: "text-blue-600 dark:text-blue-400" },
  other: { label: "Other", icon: MessageSquare, color: "text-foreground/60" },
};

const STATUS_META = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  done: "Shipped",
};

export default function SuggestionCard({ s, onVote, hasVoted }) {
  const meta = CATEGORY_META[s.category] || CATEGORY_META.other;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-foreground/[0.02] transition">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <button
          onClick={onVote}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition ${
            hasVoted
              ? "bg-foreground text-background border-foreground"
              : "border-border text-foreground/60 hover:bg-foreground/5"
          }`}
          aria-label="Vote"
        >
          <ArrowBigUp size={18} />
        </button>
        <span className="text-xs font-bold mt-1">{(s.voter_ids || []).length}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${meta.color}`}
          >
            <Icon size={11} /> {meta.label}
          </span>
          {s.status && s.status !== "open" && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-foreground/[0.06] text-foreground/70">
              {STATUS_META[s.status] || s.status}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold leading-snug">{s.title}</h3>
        {s.details && (
          <p className="text-xs text-foreground/60 mt-1 leading-relaxed line-clamp-3">
            {s.details}
          </p>
        )}
        <div className="text-[11px] text-foreground/40 mt-2">
          By {s.user_name || "a PUBLIC member"}
        </div>
      </div>
    </div>
  );
}