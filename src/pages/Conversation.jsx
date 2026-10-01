import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  User } from
"lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageComposer from "@/components/messages/MessageComposer";
import { dayLabel, displayNameOf, otherParticipant } from "@/lib/messaging";

export default function Conversation() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const bottomRef = useRef(null);
  const typingSentRef = useRef(0);

  const other = otherParticipant(conv, user?.id);
  const name = other?.name || "Unknown";

  const fetchThread = useCallback(async () => {
    if (!id || !user?.id) return;
    const [rows, msgs] = await Promise.all([
      base44.entities.Conversation.filter({ id }, "-created_date", 1),
      base44.entities.Message.filter({ conversation_id: id }, "-created_date", 150),
    ]);
    setConv(rows?.[0] || null);
    setMessages((msgs || []).slice().reverse());
  }, [id, user?.id]);

  useEffect(() => {
    fetchThread().finally(() => setLoading(false));
  }, [fetchThread]);

  // Live delivery — reload whenever a message reaches this thread.
  useEffect(() => {
    if (!id) return;
    const reload = coalesce(fetchThread, 600);
    const unsubMsg = base44.entities.Message.subscribe(() => reload());
    const unsubConv = base44.entities.Conversation.subscribe(() => reload());
    return () => {
      reload.cancel();
      unsubMsg();
      unsubConv();
    };
  }, [id, fetchThread]);

  // Anything addressed to me is read the moment it's on screen.
  useEffect(() => {
    const unread = messages.filter((m) => m.recipient_id === user?.id && !m.read);
    if (!unread.length) return;
    setMessages((prev) =>
    prev.map((m) => m.recipient_id === user?.id ? { ...m, read: true } : m)
    );
    base44.entities.Message.bulkUpdate(unread.map((m) => ({ id: m.id, read: true }))).catch(() => {});
  }, [messages, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Expires a stale "typing…" hint even when no further event arrives.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const otherTyping = useMemo(
    () =>
    !!conv?.typing_user_id &&
    conv.typing_user_id === other?.id &&
    Date.now() - (Date.parse(conv.typing_at) || 0) < 8000,
    [conv, other?.id, tick]
  );

  async function send(text) {
    if (!user?.id || !conv || !other) return;
    const created = await base44.entities.Message.create({
      conversation_id: conv.id,
      sender_id: user.id,
      recipient_id: other.id,
      sender_name: displayNameOf(user),
      sender_avatar_url: user.avatar_url || "",
      text
    });
    setMessages((prev) => [...prev, created]);
    base44.entities.Conversation.update(conv.id, {
      last_message_text: text,
      last_message_at: new Date().toISOString(),
      last_sender_id: user.id,
      typing_user_id: "",
      typing_at: ""
    }).catch(() => {});
  }

  function handleTyping() {
    if (!conv || !user?.id) return;
    const now = Date.now();
    if (now - typingSentRef.current < 2500) return;
    typingSentRef.current = now;
    base44.entities.Conversation.update(conv.id, {
      typing_user_id: user.id,
      typing_at: new Date().toISOString()
    }).catch(() => {});
  }

  async function toggleFlag(field) {
    if (!conv) return;
    const next = !conv[field];
    setMenuOpen(false);
    setConv((c) => ({ ...c, [field]: next }));
    try {
      await base44.entities.Conversation.update(conv.id, { [field]: next });
    } catch {
      setConv((c) => ({ ...c, [field]: !next }));
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="animate-spin inline text-foreground/40" size={22} />
      </div>);

  }

  if (!conv || !other) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Conversation not found"
        description="This conversation is no longer available." />);


  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100dvh-9rem)]">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <button
          onClick={() => nav(-1)}
          className="tap-target rounded-full hover:bg-foreground/[0.06]"
          aria-label="Back">
          
          <ArrowLeft size={20} />
        </button>

        <Link to={`/profile/${other.id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar user={{ full_name: name, avatar_url: other.avatar_url }} size={36} />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{name}</div>
            <div className="text-[11px] text-foreground/55 truncate">
              {otherTyping ? "typing…" : "View profile"}
            </div>
          </div>
        </Link>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-full hover:bg-accent"
            aria-label="Conversation options">
            
            <MoreHorizontal size={18} />
          </button>
          {menuOpen &&
          <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border border-border rounded-xl shadow-2xl py-1">
                <button
                onClick={() => toggleFlag("is_pinned")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                
                  {conv.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  {conv.is_pinned ? "Unpin conversation" : "Pin conversation"}
                </button>
                <button
                onClick={() => toggleFlag("is_muted")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                
                  {conv.is_muted ? <Bell size={15} /> : <BellOff size={15} />}
                  {conv.is_muted ? "Unmute conversation" : "Mute conversation"}
                </button>
                <Link
                to={`/profile/${other.id}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                
                  <User size={15} /> View profile
                </Link>
              </div>
            </>
          }
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
        {messages.length === 0 ?
        <p className="text-sm text-foreground/50 text-center py-10">
            No messages yet — say hi to {name}.
          </p> :

        messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDay =
          !prev ||
          format(new Date(prev.created_date), "yyyy-MM-dd") !==
          format(new Date(m.created_date), "yyyy-MM-dd");
          return (
            <div key={m.id}>
                {showDay &&
              <div className="text-[11px] uppercase tracking-wider text-foreground/45 text-center py-3">
                    {dayLabel(m.created_date)}
                  </div>
              }
                <MessageBubble message={m} mine={m.sender_id === user?.id} />
              </div>);

        })
        }
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={send} onTyping={handleTyping} />
    </div>);

}