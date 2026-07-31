import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import Avatar from "@/components/Avatar";
import { Loader2, Send } from "lucide-react";

export default function Conversation() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  async function load() {
    if (!user?.id) return;
    const [a, b] = await Promise.all([
      base44.entities.Message.filter(
        { sender_id: user.id, recipient_id: userId },
        "created_date",
        500
      ).catch(() => []),
      base44.entities.Message.filter(
        { sender_id: userId, recipient_id: user.id },
        "created_date",
        500
      ).catch(() => []),
    ]);
    const all = [...(a || []), ...(b || [])].sort(
      (x, y) => new Date(x.created_date) - new Date(y.created_date)
    );
    setMessages(all);
    setLoading(false);

    // Mark everything they sent us as read.
    const unread = all.filter((m) => m.recipient_id === user.id && !m.read);
    if (unread.length) {
      await base44.entities.Message.bulkUpdate(
        unread.map((m) => ({ id: m.id, read: true }))
      ).catch(() => {});
    }
  }

  useEffect(() => {
    base44.entities.User.get(userId).then(setPartner).catch(() => setPartner(null));
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load();
    const unsub = base44.entities.Message.subscribe(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || !user || sending) return;
    setSending(true);
    setBody("");
    try {
      const created = await base44.entities.Message.create({
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || "Someone",
        recipient_id: userId,
        recipient_name: partner?.display_name || partner?.full_name || "",
        body: text,
      });
      setMessages((prev) => [...prev, created]);
    } finally {
      setSending(false);
    }
  }

  const partnerName =
    partner?.display_name || partner?.full_name || partner?.email || "Conversation";

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 main-content flex flex-col">
      <BackHeader title={partnerName} />

      <div className="flex items-center gap-3 py-4 border-b border-border mb-4">
        <Avatar user={partner || { display_name: partnerName }} size={40} />
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{partnerName}</div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : (
        <div className="flex-1 space-y-2 pb-4">
          {messages.length === 0 && (
            <p className="text-sm text-foreground/50 text-center py-10">
              No messages yet — say hello.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm break-words ${
                    mine
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-foreground/[0.07] rounded-bl-md"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md py-3 flex items-center gap-2 border-t border-border">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 min-w-0 bg-transparent border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-foreground/30"
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          className="shrink-0 w-11 h-11 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40 active:scale-95 transition"
          aria-label="Send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}