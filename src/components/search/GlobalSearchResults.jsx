import { useEffect, useRef } from "react";
import { Music, Disc3 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Image } from "@/components/ui/image";

function Row({ item, isActive, onPick, onHover, rowRef }) {
  const Icon = item.kind === "artist" ? Disc3 : Music;
  return (
    <button
      type="button"
      ref={rowRef}
      onClick={() => onPick(item)}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
        isActive ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]"
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground/[0.06] grid place-items-center shrink-0">
        {item.kind === "person" ? (
          <Avatar user={item.user} size={40} />
        ) : item.image ? (
          <Image src={item.image} fittingType="fill" alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon size={16} className="text-foreground/40" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-foreground/50 truncate">{item.subtitle}</div>
        )}
      </div>

      <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/35 shrink-0">
        {item.label}
      </span>
    </button>
  );
}

export default function GlobalSearchResults({ groups, activeIndex, onPick, onActive }) {
  const refs = useRef([]);

  // Keep the keyboard-selected row visible as the arrow keys move through it.
  useEffect(() => {
    refs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let cursor = 0;
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-foreground/40">
            {g.label}
          </div>
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const index = cursor;
              cursor += 1;
              return (
                <Row
                  key={`${it.kind}-${it.id}`}
                  item={it}
                  rowRef={(el) => (refs.current[index] = el)}
                  isActive={index === activeIndex}
                  onPick={onPick}
                  onHover={() => onActive(index)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}