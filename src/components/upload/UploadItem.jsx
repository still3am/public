import { Music2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

const STATUS_LABEL = {
  processing: "Preparing…",
  uploading: "Uploading…",
  finalizing: "Almost done…",
  done: "Uploaded",
  error: "Failed"
};

export default function UploadItem({ item, onRemove }) {
  const busy = item.status !== "done" && item.status !== "error";
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-foreground/5 grid place-items-center shrink-0">
        {item.cover ? (
          <img src={item.cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music2 size={20} className="opacity-40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{item.title || item.name}</p>
          {item.explicit && (
            <span className="text-[9px] font-bold px-1 rounded bg-foreground/10 shrink-0">E</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.artist || "Unknown artist"}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {busy && <Loader2 size={11} className="animate-spin" />}
          {item.status === "done" && <CheckCircle2 size={12} className="text-green-500" />}
          {item.status === "error" && <AlertCircle size={12} className="text-red-500" />}
          <span
            className={`text-[10px] font-medium ${
              item.status === "error" ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {item.status === "error" && item.error ? item.error : STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>
      {!busy && (
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 rounded-full hover:bg-foreground/5 shrink-0"
          aria-label="Remove from list"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}