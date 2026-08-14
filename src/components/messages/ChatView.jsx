import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, Send, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function ChatView({ conversation, onBack }) {
  const { user } = useAuth();
  const p = usePlayer();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const otherId = conversation?.participant_ids?.find((id) => id !== user?.id);
  const otherName = conversation?.participant_names?.[conversation?.participant_ids?.indexOf(otherId)] || "User";
  const otherAvatar = conversation?.participant_avatars?.[conversation?.participant_ids?.indexOf(otherId)] || "";

  async function loadMessages() {
    if (!conversation?.id) return;
    setLoading(true);
    try {
      const msgs = await base44.entities.Message.filter(
        { conversation_id: conversation.id },
        "created_date",
        500
      );
      setMessages(msgs || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // Subscribe to new messages in this conversation
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== conversation?.id) return;
      if (event.type === "create") {
        setMessages((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => (m.id === event.data.id ? event.data : m)));
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    if (!text.trim() || sending || !conversation?.id) return;
    setSending(true);
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        recipient_id: otherId,
        sender_name: user.display_name || user.full_name || "",
        sender_avatar_url: user.avatar_url || "",
        text: text.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
      // Update conversation preview
      await base44.entities.Conversation.update(conversation.id, {
        last_message_text: text.trim(),
        last_message_at: new Date().toISOString(),
        last_sender_id: user.id,
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  function playTrack(track) {
    try {
      const t = typeof track === "string" ? JSON.parse(track) : track;
      if (t?.id) p.playTrackAt([t]);
    } catch {}
  }

  const isCurrentTrack = (trackData) => {
    try {
      const t = typeof trackData === "string" ? JSON.parse(trackData) : trackData;
      return t?.id && p.currentTrack?.id === t.id;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
        <button onClick={onBack} className="md:hidden p-1 -ml-1 text-foreground/60 hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        {otherAvatar ? (
          <img src={otherAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-foreground/10 grid place-items-center text-sm font-semibold">
            {otherName?.charAt(0) || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{otherName}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10">
            <EmptyState icon={MessageCircle} title="No messages yet" description={`Say hi to ${otherName}!`} />
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${mine ? "order-2" : ""}`}>
                  {/* Track attachment */}
                  {m.track && (() => {
                    const t = typeof m.track === "string" ? JSON.parse(m.track) : m.track;
                    if (!t?.id) return null;
                    const playing = isCurrentTrack(m.track) && p.isPlaying;
                    return (
                      <button
                        onClick={() => playTrack(m.track)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl mb-1 w-full max-w-[280px] text-left transition ${
                          mine ? "bg-primary/10" : "bg-foreground/[0.06]"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
                          {t.cover_art_url && (
                            <img src={t.cover_art_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{t.title}</div>
                          <div className="text-xs text-foreground/50 truncate">{t.artist || ""}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-foreground text-background grid place-items-center shrink-0">
                          {playing ? <Pause size={14} /> : <Play size={14} />}
                        </div>
                      </button>
                    );
                  })()}
                  {/* Text bubble */}
                  {m.text && (
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm break-words ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-foreground/[0.08] text-foreground rounded-bl-md"
                      }`}
                    >
                      {m.text}
                    </div>
                  )}
                  <div className={`text-[10px] text-foreground/30 mt-0.5 ${mine ? "text-right" : "text-left"}`}>
                    {m.created_date ? new Date(m.created_date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-3 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…"
            className="flex-1 px-4 py-2.5 rounded-full bg-foreground/[0.06] text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-30 shrink-0 active:scale-95 transition"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}