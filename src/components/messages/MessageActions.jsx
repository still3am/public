import { useEffect, useState } from "react";
import { Check, Copy, Pencil, Reply, Smile, Trash2 } from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/messaging";

const ITEM =
"w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left";

export default function MessageActions({ message, mine, onReact, onReply, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The menu is anchored to one message, so it closes when the thread moves.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Message actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1.5 rounded-full text-foreground/45 hover:text-foreground hover:bg-foreground/[0.06] transition opacity-100 md:opacity-0 md:group-hover:opacity-100">
        
        <Smile size={15} />
      </button>

      {open &&
      <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
          role="menu"
          className={`absolute bottom-full mb-1 z-50 w-44 bg-popover border border-border rounded-xl shadow-2xl py-1 ${
          mine ? "right-0" : "left-0"}`
          }>
          
            <div className="flex items-center justify-between px-1.5 pb-1 mb-1 border-b border-border">
              {QUICK_REACTIONS.map((emoji) =>
            <button
              key={emoji}
              onClick={() => {
                setOpen(false);
                onReact?.(emoji);
              }}
              aria-label={`React ${emoji}`}
              className="w-7 h-7 rounded-full grid place-items-center text-base hover:bg-accent">
              
                  {emoji}
                </button>
            )}
            </div>

            <button
            onClick={() => {
              setOpen(false);
              onReply?.(message);
            }}
            className={ITEM}>
            
              <Reply size={15} /> Reply
            </button>

            {message.text &&
          <button
            onClick={() => {
              setOpen(false);
              copy();
            }}
            className={ITEM}>
            
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy text"}
              </button>
          }

            {mine &&
          <button
            onClick={() => {
              setOpen(false);
              onEdit?.(message);
            }}
            className={ITEM}>
            
                <Pencil size={15} /> Edit message
              </button>
          }

            {mine &&
          <button
            onClick={() => {
              setOpen(false);
              onDelete?.(message);
            }}
            className={`${ITEM} text-destructive`}>
            
                <Trash2 size={15} /> Delete message
              </button>
          }
          </div>
        </>
      }
    </div>);

}