import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ChatView from "@/components/messages/ChatView";
import NewMessageSheet from "@/components/messages/NewMessageSheet";
import ConversationActions from "@/components/messages/ConversationActions";
import ConversationItem from "@/components/messages/ConversationItem";
import { Loader2, SquarePen, Search, Plus } from "lucide-react";

export default function Messages() {
  const { user: me } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadMap, setUnreadMap] = useState({});
  const [actionsConv, setActionsConv] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!me) return;
    try {
      const convs = await base44.entities.Conversation.filter(
        { participant_ids: me.id },
        "-last_message_at",
        200
      );
      setConversations(convs || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [me]);

  const refreshUnread = useCallback(async () => {
    if (!me) return;
    try {
      const unread = await base44.entities.Message.filter(
        { recipient_id: me.id, read: false },
        "-created_date",
        1000
      );
      const map = {};
      (unread || []).forEach((m) => {
        map[m.conversation_id] = (map[m.conversation_id] || 0) + 1;
      });
      setUnreadMap(map);
    } catch {}
  }, [me]);

  useEffect(() => {
    loadConversations();
    refreshUnread();
  }, [loadConversations, refreshUnread]);

  useEffect(() => {
    const unsubConv = base44.entities.Conversation.subscribe((event) => {
      if (event.type === "create") {
        const c = event.data;
        if (c.participant_ids?.includes(me?.id)) {
          setConversations((prev) => {
            if (prev.some((x) => x.id === c.id)) return prev;
            return [c, ...prev];
          });
        }
      } else if (event.type === "update") {
        const c = event.data;
        setConversations((prev) => {
          const updated = prev.map((x) => (x.id === c.id ? c : x));
          return updated.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
          });
        });
      }
    });

    const unsubMsg = base44.entities.Message.subscribe((event) => {
      if (event.type === "create" && event.data?.recipient_id === me?.id) {
        loadConversations();
        refreshUnread();
      }
    });

    return () => {
      unsubConv();
      unsubMsg();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  function getOtherUser(conv) {
    const idx = conv.participant_ids.indexOf(me.id);
    const otherIdx = idx === 0 ? 1 : 0;
    return {
      id: conv.participant_ids[otherIdx],
      display_name: conv.participant_names[otherIdx] || "Unknown",
      avatar_url: conv.participant_avatars[otherIdx] || "",
    };
  }

  async function startConversationWith(user) {
    setShowNew(false);
    const existing = conversations.find(
      (c) => c.participant_ids.includes(user.id) && c.participant_ids.length === 2
    );
    if (existing) {
      setActiveConv(existing);
      return;
    }
    try {
      const conv = await base44.entities.Conversation.create({
        participant_ids: [me.id, user.id],
        participant_names: [me.display_name || me.full_name || "", user.display_name || ""],
        participant_avatars: [me.avatar_url || "", user.avatar_url || ""],
        last_message_text: "",
        last_message_at: new Date().toISOString(),
        last_sender_id: "",
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
    } catch {
      // Could not create conversation
    }
  }

  function openConversation(conv) {
    setActiveConv(conv);
    setUnreadMap((prev) => ({ ...prev, [conv.id]: 0 }));
  }

  function handleBack() {
    setActiveConv(null);
    refreshUnread();
  }

  async function handlePin(conv) {
    try {
      await base44.entities.Conversation.update(conv.id, { is_pinned: !conv.is_pinned });
    } catch {}
  }

  async function handleMute(conv) {
    try {
      await base44.entities.Conversation.update(conv.id, { is_muted: !conv.is_muted });
    } catch {}
  }

  async function handleDeleteConv(conv) {
    try {
      await base44.entities.Message.deleteMany({ conversation_id: conv.id });
      await base44.entities.Conversation.delete(conv.id);
      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      if (activeConv?.id === conv.id) setActiveConv(null);
    } catch {}
  }

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const other = getOtherUser(c);
        return other.display_name.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
  });

  const activeOther = activeConv ? getOtherUser(activeConv) : null;

  return (
    <div className="md:flex md:h-[calc(100vh-10rem)] md:rounded-2xl md:overflow-hidden md:border md:border-border/50">
      {/* Conversation list */}
      <div className={`md:w-80 md:border-r md:border-border/50 md:flex md:flex-col bg-background ${activeConv ? "hidden md:flex" : "flex flex-col"}`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h1 className="text-[28px] font-bold tracking-tight">Messages</h1>
          <button
            onClick={() => setShowNew(true)}
            className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center shadow-sm active:scale-95 transition"
            aria-label="New message"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="relative px-3 pb-2">
          <Search size={15} className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-foreground/[0.07] text-sm border-0 focus:outline-none placeholder:text-foreground/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {loading ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="animate-spin text-foreground/30" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-foreground/40 px-6 text-center">
              <SquarePen size={28} className="mb-3" />
              <p className="text-sm">
                {search ? "No conversations match your search." : "No conversations yet. Tap the + to start one."}
              </p>
            </div>
          ) : (
            sorted.map((conv) => {
              const other = getOtherUser(conv);
              const isActive = activeConv?.id === conv.id;
              const isUnread = conv.last_sender_id && conv.last_sender_id !== me.id;
              const unreadCount = unreadMap[conv.id] || 0;
              return (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  other={other}
                  me={me}
                  isActive={isActive}
                  unreadCount={unreadCount}
                  isUnread={isUnread}
                  onOpen={openConversation}
                  onLongPress={(c) => setActionsConv(c)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className={`flex-1 bg-background ${activeConv ? "flex flex-col h-[calc(100vh-15rem)] md:h-auto" : "hidden md:flex md:flex-col"}`}>
        {activeConv && activeOther ? (
          <ChatView
            conversation={activeConv}
            otherUser={activeOther}
            onBack={handleBack}
            onMessagesRead={refreshUnread}
          />
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-foreground/30">
            <SquarePen size={36} className="mb-3" />
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </div>

      {showNew && (
        <NewMessageSheet onPick={startConversationWith} onClose={() => setShowNew(false)} />
      )}

      {actionsConv && (
        <ConversationActions
          conversation={actionsConv}
          onPin={() => handlePin(actionsConv)}
          onMute={() => handleMute(actionsConv)}
          onDelete={() => handleDeleteConv(actionsConv)}
          onClose={() => setActionsConv(null)}
        />
      )}
    </div>
  );
}