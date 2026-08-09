import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MessageBubble from "@/components/messages/MessageBubble";
import TrackSendSheet from "@/components/messages/TrackSendSheet";
import { ArrowLeft, ArrowUp, Music2, Users, Loader2 } from "lucide-react";

function groupTimestamp(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function ChatView({ conversation, otherUser, onBack }) {
  const { user: me } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTrackSheet, setShowTrackSheet] = useState(false);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  async function loadMessages() {
    try {
      const msgs = await base44.entities.Message.filter(
        { conversation_id: conversation.id },
        "created_date",
        500
      );
      setMessages(msgs || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== conversation.id) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => (m.id === event.data.id ? event.data : m)));
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unread = messages.filter((m) => m.recipient_id === me.id && !m.read);
    if (unread.length === 0) return;
    base44.entities.Message.bulkUpdate(
      unread.map((m) => ({ id: m.id, read: true }))
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: me.id,
        recipient_id: otherUser.id,
        sender_name: me.display_name || me.full_name || "",
        sender_avatar_url: me.avatar_url || "",
        text: trimmed,
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      await base44.entities.Conversation.update(conversation.id, {
        last_message_text: trimmed,
        last_message_at: new Date().toISOString(),
        last_sender_id: me.id,
      }).catch(() => {});
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  async function sendTrack(track) {
    setShowTrackSheet(false);
    if (sending) return;
    setSending(true);
    try {
      const minimalTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist || track.uploader_name || "",
        uploader_name: track.uploader_name || "",
        uploader_id: track.uploader_id || "",
        cover_art_url: track.cover_art_url || "",
        audio_url: track.audio_url,
        duration_seconds: track.duration_seconds || 0,
        genre: track.genre || "Other",
        explicit: track.explicit || false,
      };
      const msg = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: me.id,
        recipient_id: otherUser.id,
        sender_name: me.display_name || me.full_name || "",
        sender_avatar_url: me.avatar_url || "",
        track_id: track.id,
        track: JSON.stringify(minimalTrack),
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      await base44.entities.Conversation.update(conversation.id, {
        last_message_text: `🎵 ${track.title}`,
        last_message_at: new Date().toISOString(),
        last_sender_id: me.id,
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-foreground/5 transition"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-foreground/10 grid place-items-center text-sm font-bold text-foreground/50">
            {(otherUser.display_name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="text-[16px] font-semibold truncate text-foreground">
          {otherUser.display_name}
        </h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="animate-spin text-foreground/30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
            <Users size={28} className="mb-3" />
            <p className="text-sm text-center max-w-xs">
              No messages yet. Say hi or send a song.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((m, i) => {
              const isMine = m.sender_id === me.id;
              const prev = i > 0 ? messages[i - 1] : null;
              const next = i < messages.length - 1 ? messages[i + 1] : null;
              const timeGap = prev ? new Date(m.created_date) - new Date(prev.created_date) : Infinity;
              const senderChanged = !prev || prev.sender_id !== m.sender_id;
              const showTimestamp = !prev || senderChanged || timeGap > 5 * 60 * 1000;
              const isFirstInGroup = !prev || prev.sender_id !== m.sender_id || timeGap > 60 * 1000;
              const isLastFromMe = isMine && (!next || next.sender_id !== me.id);

              return (
                <div key={m.id}>
                  {showTimestamp && (
                    <div className="text-center text-[11px] text-foreground/40 my-3 font-medium">
                      {groupTimestamp(m.created_date)}
                    </div>
                  )}
                  <div className={isFirstInGroup ? "mt-1.5" : ""}>
                    <MessageBubble
                      message={m}
                      isMine={isMine}
                      isFirstInGroup={isFirstInGroup}
                      showReadReceipt={isLastFromMe}
                    />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-2.5 py-2.5 bg-background border-t border-border/30">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowTrackSheet(true)}
            className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition hover:bg-foreground/5 text-foreground"
            aria-label="Send a song"
          >
            <Music2 size={22} />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder="Message"
            rows={1}
            className="flex-1 resize-none max-h-32 px-4 py-2 rounded-[20px] bg-foreground/[0.06] text-[15px] leading-relaxed border-0 focus:outline-none placeholder:text-foreground/40"
            style={{ minHeight: "38px" }}
          />
          {hasText && (
            <button
              onClick={sendText}
              disabled={sending}
              className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition disabled:opacity-40 bg-foreground text-background"
              aria-label="Send"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          )}
        </div>
      </div>

      {showTrackSheet && (
        <TrackSendSheet onSend={sendTrack} onClose={() => setShowTrackSheet(false)} />
      )}
    </div>
  );
}