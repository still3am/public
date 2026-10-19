import { Fragment } from "react";

/** @param {any} props */
function Row({ item, onPick, roomy }) {
  const Icon = item.icon;
  return (
    <button
      role="menuitem"
      disabled={item.disabled}
      onClick={() => onPick(item)}
      className={`w-full flex items-center gap-3 px-4 text-left transition active:bg-accent hover:bg-accent disabled:opacity-60
        ${roomy ? "py-3 text-[15px]" : "py-2 text-sm"}
        ${item.danger ? "text-destructive" : item.active ? "text-foreground font-semibold" : ""}`}
    >
      <Icon
        size={roomy ? 20 : 16}
        className={item.spin ? "animate-spin" : ""}
        fill={item.fill ? "currentColor" : "none"}
      />
      <span className="flex-1 truncate">{item.label}</span>
    </button>
  );
}

/** Standard actions, divided into groups, then any surface-specific extras. */
/** @param {any} props */
export default function TrackMenuList({ standard, manage, extras, onPick, roomy, children }) {
  return (
    <div role="menu" className="py-1">
      {standard.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && item.group !== standard[i - 1].group && <div className="my-1 h-px bg-border" />}
          <Row item={item} onPick={onPick} roomy={roomy} />
        </Fragment>
      ))}
      {children&&<><div className="my-1 h-px bg-border"/>{children}</>}
      {[...extras, ...manage].length > 0 && <div className="my-1 h-px bg-border" />}
      {[...extras, ...manage].map((item) => (
        <Row key={item.label} item={item} onPick={onPick} roomy={roomy} />
      ))}
    </div>
  );
}