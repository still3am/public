import { useEffect } from "react";
import { Check, X } from "lucide-react";

function mmss(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function VoiceRecorderBar({ elapsed, error, onSend, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
      {error ? (
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-destructive">
          {error}
        </span>
      ) : (
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-semibold tabular-nums">{mmss(elapsed)}</span>
          <span className="text-xs text-foreground/50 truncate">Recording…</span>
        </span>
      )}

      <button
        onClick={onCancel}
        aria-label={error ? "Dismiss" : "Cancel recording"}
        className="shrink-0 w-10 h-10 rounded-full grid place-items-center hover:bg-accent"
      >
        <X size={18} />
      </button>

      {!error && (
        <button
          onClick={onSend}
          aria-label="Send voice note"
          className="shrink-0 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center"
        >
          <Check size={17} />
        </button>
      )}
    </div>
  );
}