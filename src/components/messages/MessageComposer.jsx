import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";

export default function MessageComposer({
  onSend,
  onSendImage,
  onTyping,
  editing = null,
  onCancelEdit,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const editingId = editing?.id;

  // Entering or leaving edit mode swaps the input to that message's text.
  useEffect(() => {
    setText(editing ? editing.text || "" : "");
    if (editing) inputRef.current?.focus();
  }, [editingId]);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    if (!editing) setText("");
    try {
      await onSend(body);
    } catch {
      // Keep the message so it isn't lost when the send fails.
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const attach = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    try {
      await onSendImage?.(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-end gap-2 py-3 bg-background">
      {!editing &&
      <>
          <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={attach} />
        
          <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Attach a photo"
          className="shrink-0 w-10 h-10 rounded-full grid place-items-center hover:bg-accent disabled:opacity-40">
          
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
        </>
      }

      <textarea
        ref={inputRef}
        value={text}
        rows={1}
        placeholder={editing ? "Edit message…" : "Write a message…"}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape" && editing) {
            onCancelEdit?.();
          }
        }}
        className="flex-1 min-w-0 resize-none max-h-32 px-3.5 py-2.5 rounded-2xl bg-foreground/[0.05] text-sm outline-none selectable-content" />
      

      {editing &&
      <button
        onClick={onCancelEdit}
        aria-label="Cancel edit"
        className="shrink-0 w-10 h-10 rounded-full grid place-items-center hover:bg-accent">
        
          <X size={18} />
        </button>
      }

      <button
        onClick={submit}
        disabled={!text.trim() || sending}
        aria-label={editing ? "Save edit" : "Send message"}
        className="shrink-0 w-10 h-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40">
        
        {editing ? <Check size={17} /> : <SendHorizontal size={17} />}
      </button>
    </div>);

}