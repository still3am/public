import { QUICK_REACTIONS } from "@/lib/messaging";

export default function MessageReactions({ reactions, myId, onReact }) {
  const entries = Object.entries(reactions || {}).filter(([, ids]) => ids?.length);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([emoji, ids]) => {
        const mineReacted = ids.includes(myId);
        return (
          <button
            key={emoji}
            onClick={() => onReact?.(emoji)}
            aria-label={`${emoji} ${ids.length}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition ${
            mineReacted ?
            "bg-foreground text-background border-foreground" :
            "bg-background border-border text-foreground/70 hover:border-foreground/40"}`
            }>
            
            <span>{emoji}</span>
            <span className="font-semibold tabular-nums">{ids.length}</span>
          </button>);

      })}
    </div>);

}