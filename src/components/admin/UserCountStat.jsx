import { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function UserCountStat() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    (async () => {
      const users = await base44.entities.User.list("-created_date", 5000);
      setCount((users || []).length);
    })();
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl ring-1 ring-inset ring-border bg-foreground/[0.03] px-4 py-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0">
        <Users size={17} className="text-foreground/60" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold tracking-tight tabular-nums leading-none flex items-center gap-2">
          {count === null ? (
            <Loader2 size={16} className="animate-spin text-foreground/40" />
          ) : (
            count.toLocaleString()
          )}
        </div>
        <p className="text-xs text-foreground/55 mt-1">
          {count === 1 ? "registered user" : "registered users"}
        </p>
      </div>
    </div>
  );
}