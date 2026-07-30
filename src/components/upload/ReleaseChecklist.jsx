import { Check, X } from "lucide-react";

export default function ReleaseChecklist({ hasGenre, hasArtist, hasCover, isAdmin }) {
  const rules = [
    { ok: hasGenre, label: "Genre" },
    { ok: hasArtist, label: "Artist" },
    { ok: hasCover, label: "Cover" },
  ];
  const meets = hasGenre && hasArtist && hasCover;

  return (
    <div
      className={`rounded-xl px-3 py-2.5 space-y-2 ring-1 ring-inset ${
        meets
          ? "bg-emerald-500/[0.07] ring-emerald-500/25"
          : "bg-foreground/[0.03] ring-border"
      }`}
    >
      <div className="flex flex-wrap gap-1.5">
        {rules.map((r) => (
          <span
            key={r.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              r.ok
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-foreground/[0.06] text-foreground/45"
            }`}
          >
            {r.ok ? <Check size={11} /> : <X size={11} />}
            {r.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-foreground/55 leading-snug">
        {meets
          ? isAdmin
            ? "Ready — goes live on PUBLIC instantly when you upload."
            : "Eligible for public release — an admin reviews it before it goes live."
          : "Saving to your library only. A genre, an artist name and a cover image are required to release it on PUBLIC."}
      </p>
    </div>
  );
}