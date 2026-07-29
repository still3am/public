import { Zap, ExternalLink } from "lucide-react";

export default function CreditsCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-foreground/5 grid place-items-center">
          <Zap size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold">Integration credits</div>
          <div className="text-xs text-foreground/50">
            Used by AI genre detection, lyrics, covers and uploads.
          </div>
        </div>
      </div>
      <p className="text-xs text-foreground/60 mb-3">
        Your live credit balance lives in your Base44 workspace and can't be read from inside the app
        on your current plan. Open credit usage to see exactly how many are left.
      </p>
      <a
        href="https://app.base44.com/settings/credits"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
      >
        View credit usage <ExternalLink size={13} />
      </a>
    </div>
  );
}