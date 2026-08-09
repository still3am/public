import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import MessageBubble from "@/components/messages/MessageBubble";
import TrackSendSheet from "@/components/messages/TrackSendSheet";
import MessageContextMenu from "@/components/messages/MessageContextMenu";
import MediaViewer from "@/components/messages/MediaViewer";
import { ArrowLeft, ArrowUp, Music2, Users, Loader2, ImageIcon, X, Reply } from "lucide-react";

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

export default function ChatView({ conversation, otherUser, onBack, onMessagesRead }) {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTrackSheet, setShowTrackSheet] = useState(false);
  const [contextMessage, setContextMessage] = useState(null);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUser, setTypingUser] = useState("");
  const [typingAt, setTypingAt] = useState("");
  const [, setTick] = useState(0);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingRef = useRef(0);
  const typingTimerRef = useRef(null);

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
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Subscribe to message changes
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

  // Subscribe to conversation updates for typing indicator
  useEffect(() => {
    const unsubscribe = base44.entities.Conversation.subscribe((event) => {
      if (event.data?.id !== conversation.id) return;
      if (event.type === "update") {
        setTypingUser(event.data.typing_user_id || "");
        setTypingAt(event.data.typing_at || "");
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Re-render every second to re-evaluate typing indicator freshness
  useEffect(() => {
    if (!typingUser || typingUser === me.id) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [typingUser, me.id]);

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      base44.entities.Conversation.update(conversation.id, {
        typing_user_id: "",
        typing_at: "",
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const unread = messages.filter((m) => m.recipient_id === me.id && !m.read);
    if (unread.length === 0) return;
    base44.entities.Message.bulkUpdate(
      unread.map((m) => ({ id: m.id, read: true }))
    ).catch(() => {});
    onMessagesRead?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const isOtherTyping = typingUser && typingUser !== me.id && typingAt &&
    Date.now() - new Date(typingAt).getTime() < 5000;

  function updateTyping() {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      base44.entities.Conversation.update(conversation.id, {
        typing_user_id: me.id,
        typing_at: new Date().toISOString(),
      }).catch(() => {});
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      base44.entities.Conversation.update(conversation.id, {
        typing_user_id: "",
        typing_at: "",
      }).catch(() => {});
      lastTypingRef.current = 0;
    }, 4000);
  }

  function clearTyping() {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    lastTypingRef.current = 0;
    base44.entities.Conversation.update(conversation.id, {
      typing_user_id: "",
      typing_at: "",
    }).catch(() => {});
  }

  function buildReplyPreview() {
    if (!replyTo) return "";
    const senderName = replyTo.sender_id === me.id
      ? "You"
      : (replyTo.sender_name || otherUser.display_name);
    return JSON.stringify({
      sender_name: senderName,
      text: replyTo.text || "",
      media_type: replyTo.media_type || "",
    });
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    clearTyping();
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: me.id,
        recipient_id: otherUser.id,
        sender_name: me.display_name || me.full_name || "",
        sender_avatar_url: me.avatar_url || "",
        text: trimmed,
        reply_to_id: replyTo?.id || "",
        reply_preview: buildReplyPreview(),
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      setReplyTo(null);
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
    clearTyping();
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
        reply_to_id: replyTo?.id || "",
        reply_preview: buildReplyPreview(),
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      setReplyTo(null);
      await base44.entities.Conversation.update(conversation.id, {
        last_message_text: `🎵 ${track.title}`,
        last_message_at: new Date().toISOString(),
        last_sender_id: me.id,
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  async function handleMediaSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Please select an image or video file." });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large. Max 50MB." });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendMedia(file_url, isVideo ? "video" : "image");
    } catch {
      toast({ title: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  async function sendMedia(url, type) {
    if (sending) return;
    setSending(true);
    clearTyping();
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: me.id,
        recipient_id: otherUser.id,
        sender_name: me.display_name || me.full_name || "",
        sender_avatar_url: me.avatar_url || "",
        media_url: url,
        media_type: type,
        reply_to_id: replyTo?.id || "",
        reply_preview: buildReplyPreview(),
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      setReplyTo(null);
      await base44.entities.Conversation.update(conversation.id, {
        last_message_text: type === "image" ? "📷 Photo" : "🎥 Video",
        last_message_at: new Date().toISOString(),
        last_sender_id: me.id,
      }).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  async function handleReact(emoji) {
    if (!contextMessage) return;
    let reactions = {};
    try { reactions = JSON.parse(contextMessage.reactions || "{}"); } catch {}
    const ids = reactions[emoji] || [];
    const idx = ids.indexOf(me.id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      if (ids.length === 0) delete reactions[emoji];
      else reactions[emoji] = ids;
    } else {
      reactions[emoji] = [...ids, me.id];
    }
    try {
      await base44.entities.Message.update(contextMessage.id, {
        reactions: JSON.stringify(reactions),
      });
    } catch {}
  }

  async function handleDelete() {
    if (!contextMessage) return;
    try {
      await base44.entities.Message.delete(contextMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== contextMessage.id));
    } catch {}
  }

  function handleCopy() {
    if (!contextMessage?.text) return;
    navigator.clipboard?.writeText(contextMessage.text).catch(() => {});
  }

  function handleReply() {
    if (!contextMessage) return;
    setReplyTo(contextMessage);
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
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold truncate text-foreground">{otherUser.display_name}</h2>
          {isOtherTyping && (
            <p className="text-[12px] text-foreground/50 truncate">typing…</p>
          )}
        </div>
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
            <p className="text-sm text-center max-w-xs">No messages yet. Say hi, send a song, or share a photo.</p>
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
                      myId={me.id}
                      isFirstInGroup={isFirstInGroup}
                      showReadReceipt={isLastFromMe}
                      onLongPress={(msg) => setContextMessage(msg)}
                      onMediaClick={(url, type) => setViewerMedia({ url, type })}
                    />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-foreground/[0.04] border-t border-border/30 flex items-center gap-2">
          <Reply size={16} className="text-foreground/40 shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-foreground/30 pl-2">
            <div className="text-[11px] font-semibold text-foreground/60 truncate">
              {replyTo.sender_id === me.id ? "You" : (replyTo.sender_name || otherUser.display_name)}
            </div>
            <div className="text-[12px] text-foreground/50 truncate">
              {replyTo.text || (replyTo.media_type === "image" ? "📷 Photo" : replyTo.media_type === "video" ? "🎥 Video" : replyTo.track_id ? "🎵 Song" : "")}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-foreground/10" aria-label="Cancel reply">
            <X size={16} className="text-foreground/50" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="px-2.5 py-2.5 bg-background border-t border-border/30">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition hover:bg-foreground/5 text-foreground disabled:opacity-40"
            aria-label="Send photo or video"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </button>
          <button
            onClick={() => setShowTrackSheet(true)}
            disabled={sending}
            className="w-9 h-9 rounded-full grid place-items-center shrink-0 transition hover:bg-foreground/5 text-foreground disabled:opacity-40"
            aria-label="Send a song"
          >
            <Music2 size={20} />
          </button>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); updateTyping(); }}
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

      {contextMessage && (
        <MessageContextMenu
          message={contextMessage}
          isMine={contextMessage.sender_id === me.id}
          myId={me.id}
          onReact={handleReact}
          onReply={handleReply}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onClose={() => setContextMessage(null)}
        />
      )}

      {viewerMedia && (
        <MediaViewer
          url={viewerMedia.url}
          type={viewerMedia.type}
          onClose={() => setViewerMedia(null)}
        />
      )}

      {showTrackSheet && (
        <TrackSendSheet onSend={sendTrack} onClose={() => setShowTrackSheet(false)} />
      )}
    </div>
  );
}