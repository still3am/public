import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// One navigation row inside Library (the PUBLIC OFFLINE / Public Record set).
export default function LibraryEntryRow({ to, icon: Icon, label, subtitle }) {
  return (
    <Link
      to={to}
      className="block mb-5 rounded-2xl ring-1 ring-inset ring-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] hover:from-foreground/[0.09] hover:to-foreground/[0.04] transition p-4 group">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center bg-foreground/[0.06] text-foreground/70">
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold tracking-tight">{label}</div>
          {subtitle && (
            <div className="text-xs text-foreground/55 mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        <ChevronRight
          size={18}
          className="text-foreground/40 group-hover:translate-x-0.5 transition shrink-0"
        />
      </div>
    </Link>
  );
}