import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// One navigation row inside Library (the PUBLIC OFFLINE / Public Record set).
/** @param {any} props */
export default function LibraryEntryRow({ to, icon: Icon, label, subtitle }) {
  return (
    <Link
      to={to}
      className="library-shortcut block rounded-2xl border border-border bg-card hover:bg-accent transition group">
      <div className="flex items-center gap-3.5">
        



        
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold tracking-tight">{label}</div>
          {subtitle &&
          <div className="shortcut-subtitle text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
          }
        </div>
        <ChevronRight
          size={18}
          className="shortcut-chevron text-muted-foreground group-hover:translate-x-0.5 transition shrink-0" />
        
      </div>
    </Link>);

}