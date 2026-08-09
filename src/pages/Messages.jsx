import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ChatView from "@/components/messages/ChatView";
import NewMessageSheet from "@/components/messages/NewMessageSheet";
import ConversationActions from "@/components/messages/ConversationActions";
import ConversationItem from "@/components/messages/ConversationItem";
import ActiveRow from "@/components/messages/ActiveRow";
import { Loader2, Search, Plus, MessageCircle, X } from "lucide-react";

export default function Messages() {
  const { user: me } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});
  const [actionsConv, setActionsConv] = useState(null);
  const [filter, setFilter] = useState("all");

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
          const updated = prev.map((x) => x.id === c.id ? c : x);
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
      avatar_url: conv.participant_avatars[otherIdx] || ""
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
        last_sender_id: ""
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
    } catch {


      // Could not create conversation
    }}
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

  async function handleClearConv(conv) {
    try {
      await base44.entities.Message.deleteMany({ conversation_id: conv.id });
      await base44.entities.Conversation.update(conv.id, {
        last_message_text: "",
        last_message_at: "",
        last_sender_id: ""
      });
      setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, last_message_text: "", last_message_at: "", last_sender_id: "" } : c));
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

  const filtered = conversations.filter((c) => {
    const other = getOtherUser(c);
    const matchesSearch = !search.trim() || other.display_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
    filter === "all" ? true :
    filter === "unread" ? unreadMap[c.id] > 0 || c.last_sender_id && c.last_sender_id !== me.id :
    filter === "pinned" ? c.is_pinned :
    true;
    return matchesSearch && matchesFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
  });

  const activeOther = activeConv ? getOtherUser(activeConv) : null;

  return (
    <div className="h-[calc(100dvh-15rem)] md:h-[calc(100vh-10rem)] flex md:rounded-2xl md:overflow-hidden md:border md:border-border/50 md:shadow-sm">
      {/* Conversation list */}
      <div className={`flex-1 md:flex-none md:w-80 md:border-r md:border-border/50 flex flex-col overflow-hidden bg-background ${activeConv ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSearchOpen((v) => !v);
                  if (searchOpen) setSearch("");
                }}
                className={`w-9 h-9 rounded-full grid place-items-center transition ${searchOpen ? "bg-foreground/[0.06]" : "hover:bg-foreground/5"}`}
                aria-label="Search">
                
                {searchOpen ? <X size={20} /> : <Search size={20} />}
              </button>
              <button
                onClick={() => setShowNew(true)}
                className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center active:scale-95 transition"
                aria-label="New message">
                
                <Plus size={20} />
              </button>
            </div>
          </div>
          {searchOpen &&
          <div className="relative mt-2.5">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
              <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full pl-8 pr-3 py-2 rounded-full bg-foreground/[0.06] text-sm border-0 focus:outline-none focus:bg-foreground/[0.09] placeholder:text-foreground/40 transition-colors"
              autoFocus />
            
            </div>
          }
        </div>

        {/* Active row */}
        {!searchOpen && !loading && conversations.length > 0 &&
        <ActiveRow conversations={conversations} me={me} onPick={openConversation} onNew={() => setShowNew(true)} />
        }

        {/* Filter pills */}
        {!searchOpen &&
        <div className="flex gap-2 px-4 pb-2 pt-1">
            {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "pinned", label: "Pinned" }].
          map((f) =>
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
            filter === f.key ?
            "bg-foreground text-background" :
            "bg-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.1]"}`
            }>
            
                {f.label}
              </button>
          )}
          </div>
        }

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ?
          <div className="grid place-items-center py-20">
              <Loader2 className="animate-spin text-foreground/30" />
            </div> :
          sorted.length === 0 ?
          <div className="flex flex-col items-center justify-center min-h-full text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.05] grid place-items-center mb-4">
                <MessageCircle size={26} className="text-foreground/30" />
              </div>
              <p className="text-[15px] font-medium text-foreground/60 mb-1">
                {search ? "No results found" : filter === "unread" ? "No unread messages" : filter === "pinned" ? "No pinned chats" : "No conversations yet"}
              </p>
              <p className="text-[13px] text-foreground/40 mb-4 max-w-[200px]">
                {search ? "Try searching by a different name." : "Connect with people in your community to start chatting."}
              </p>
              {!search &&
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium active:scale-95 transition">
              
                  Start a conversation
                </button>
            }
            </div> :

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
                onLongPress={(c) => setActionsConv(c)} />);


          })
          }
        </div>
      </div>

      {/* Chat view */}
      <div className={`flex-1 bg-background overflow-hidden ${activeConv ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
        {activeConv && activeOther ?
        <ChatView
          conversation={activeConv}
          otherUser={activeOther}
          conversations={conversations}
          onBack={handleBack}
          onMessagesRead={refreshUnread}
          onShowActions={(c) => setActionsConv(c)} /> :


        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-foreground/[0.04] grid place-items-center mb-4">
              <MessageCircle size={30} className="text-foreground/25" />
            </div>
            <p className="text-[15px] font-medium text-foreground/50 mb-1">Your messages</p>
            <p className="text-[13px] text-foreground/40 max-w-[220px]">
              Select a conversation from the list to start chatting with your community
            </p>
          </div>
        }
      </div>

      {showNew &&
      <NewMessageSheet onPick={startConversationWith} onClose={() => setShowNew(false)} />
      }

      {actionsConv &&
      <ConversationActions
        conversation={actionsConv}
        onPin={() => handlePin(actionsConv)}
        onMute={() => handleMute(actionsConv)}
        onClear={() => handleClearConv(actionsConv)}
        onDelete={() => handleDeleteConv(actionsConv)}
        onClose={() => setActionsConv(null)} />

      }
    </div>);

}