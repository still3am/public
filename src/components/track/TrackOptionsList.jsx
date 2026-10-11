import { Fragment } from "react";

function Row({ item, dark, onClose }) {
  const Icon = item.icon;
  return (
    <button
      role="menuitem"
      onClick={() => {
        item.onClick?.();
        onClose?.();
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium text-left transition ${
        dark ? "hover:bg-white/10 active:bg-white/15" : "hover:bg-accent active:bg-accent"
      } ${item.danger ? (dark ? "text-red-300" : "text-destructive") : ""}`}
    >
      <Icon size={16} className={item.active ? "fill-current" : "opacity-70"} />
      <span className="flex-1 truncate">{item.label}</span>
    </button>
  );
}

export default function TrackOptionsList({ groups = [], dark = false, onClose }) {
  const visible = groups.filter((g) => g && g.length);
  return (
    <>
      {visible.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <div className={`h-px mx-3 my-1 ${dark ? "bg-white/10" : "bg-border"}`} />}
          {group.map((item, i) => (
            <Row key={i} item={item} dark={dark} onClose={onClose} />
          ))}
        </Fragment>
      ))}
    </>
  );
}