import { Ban, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function UserRow({ u, uploads = 0, busy, onToggleBlock, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Avatar user={u} size={36} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
          {u.full_name || u.email}
          {u.role === "admin" && (
            <span className="chip !py-0.5 !px-2 !text-[10px]">admin</span>
          )}
          {u.is_blocked && (
            <span className="chip !py-0.5 !px-2 !text-[10px] text-destructive border-destructive/40">
              blocked
            </span>
          )}
        </div>
        <div className="text-xs text-foreground/50 truncate">{u.email}</div>
        <div className="text-[11px] text-foreground/40 mt-0.5">
          Joined {new Date(u.created_date).toLocaleDateString()} · {uploads}{" "}
          {uploads === 1 ? "upload" : "uploads"}
        </div>
      </div>
      {busy ? (
        <Loader2 size={16} className="animate-spin text-foreground/40 shrink-0" />
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleBlock(u)}
            className="p-2 rounded-full hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition"
            title={u.is_blocked ? "Unblock user" : "Block user"}>
            {u.is_blocked ? <ShieldCheck size={16} /> : <Ban size={16} />}
          </button>
          <button
            onClick={() => onDelete(u)}
            className="p-2 rounded-full hover:bg-destructive/10 text-foreground/60 hover:text-destructive transition"
            title="Delete user">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}