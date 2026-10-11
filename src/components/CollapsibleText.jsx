import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Long text is clamped on small screens and gets a small expand/collapse
 * control beneath it. The control only appears when the text is genuinely cut
 * off, so wider screens — where the clamp is lifted — never show it.
 */
export default function CollapsibleText({
  text,
  className = "",
  clampClass = "max-h-40 md:max-h-none" })
{
  const [expanded, setExpanded] = useState(false);
  const [cutOff, setCutOff] = useState(false);
  const bodyRef = useRef(null);

  // Fresh text starts collapsed again.
  useEffect(() => setExpanded(false), [text]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    const measure = () => setCutOff(el.scrollHeight > el.clientHeight + 4);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, expanded, clampClass]);

  return (
    <div>
      <div
        ref={bodyRef}
        className={`overflow-hidden ${expanded ? "" : clampClass} ${className}`}>
        {text}
      </div>
      {cutOff &&
      <div className="flex justify-center">
          <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/55 hover:text-foreground transition active:scale-95">
          
            {expanded ? "Show less" : "Read more"}
            <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          
          </button>
        </div>
      }
    </div>);

}