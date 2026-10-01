import { useState } from "react";
import { SendHorizontal } from "lucide-react";

export default function MessageComposer({ onSend, onTyping }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await onSend(body);
    } catch {
      // Keep the message so it isn't lost when the send fails.
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-end gap-2 py-3 border-t border-border bg-background">
      <textarea
        value={text}
        rows={1}
        placeholder="Write a message…"
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="flex-1 min-w-0 resize-none max-h-32 px-3.5 py-2.5 rounded-2xl bg-foreground/[0.05] text-sm outline-none selectable-content" />
      
      <button
        onClick={submit}
        disabled={!text.trim() || sending}
        aria-label="Send message"
        className="shrink-0 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40">
        
        <SendHorizontal size={17} />
      </button>
    </div>);

}