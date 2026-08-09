import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MessageBubble from "@/components/messages/MessageBubble";
import TrackSendSheet from "@/components/messages/TrackSendSheet";
import { ArrowLeft, Send, Music2, Users, Loader2 } from "lucide-react";

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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

  // Real-time: subscribe to new messages in this conversation
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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark received messages as read
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
      // Update conversation's last message preview
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

  // Group messages by sender for avatar display
  let prevSenderId = null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-1 rounded-full hover:bg-foreground/5"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-foreground/10 grid place-items-center text-sm font-bold text-foreground/50">
            {(otherUser.display_name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{otherUser.display_name}</h2>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="animate-spin text-foreground/40" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
            <Users size={32} className="mb-3" />
            <p className="text-sm text-center max-w-xs">
              No messages yet. Say hi or send a song to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMine = m.sender_id === me.id;
            const showAvatar = m.sender_id !== prevSenderId;
            prevSenderId = m.sender_id;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isMine={isMine}
                showAvatar={showAvatar}
                senderAvatar={m.sender_avatar_url}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-3 py-3 border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowTrackSheet(true)}
            className="w-10 h-10 rounded-full grid place-items-center bg-foreground/5 hover:bg-foreground/10 transition shrink-0"
            aria-label="Send a song"
          >
            <Music2 size={18} />
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
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-border bg-card text-[15px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <button
            onClick={sendText}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full grid place-items-center bg-foreground text-background disabled:opacity-30 transition shrink-0"
            aria-label="Send"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {showTrackSheet && (
        <TrackSendSheet onSend={sendTrack} onClose={() => setShowTrackSheet(false)} />
      )}
    </div>
  );
}