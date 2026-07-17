import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function BottomSheetSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => (o.value ?? o) === value);
  const label = current?.label ?? current ?? value ?? placeholder;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`tap-target inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-white hover:bg-foreground/[0.02] px-1 py-1 ${className}`}>
        
        <span className={current ? "text-foreground font-medium" : "text-foreground/40"}>
          {label}
        </span>
        <ChevronDown size={16} className="text-foreground/40 shrink-0" />
      </button>
      {open &&
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}>
        
          <div
          className="bg-background w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-3 shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}>
          
            <div className="mx-auto w-10 h-1 rounded-full bg-foreground/20 mb-3" />
            <div className="space-y-1">
              {options.map((opt) => {
              const v = opt.value ?? opt;
              const l = opt.label ?? opt;
              const isActive = v === value;
              return (
                <button
                  key={v}
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`tap-target w-full text-left px-3 rounded-lg text-sm transition flex items-center justify-between ${
                  isActive ? "bg-foreground text-background" : "hover:bg-foreground/[0.04]"}`
                  }>
                  
                    <span className="min-w-0 truncate">{l}</span>
                    {isActive && <Check size={16} className="shrink-0" />}
                  </button>);

            })}
            </div>
          </div>
        </div>
      }
    </>);

}