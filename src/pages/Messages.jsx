import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, MessageCircle, PenLine, Search } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import SendTrackModal from "@/components/SendTrackModal";
import { useToast } from "@/components/ui/use-toast";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const convos = await base44.entities.Conversation
        .filter({ participant_ids: user.id }, "-last_message_at", 200)
        .catch(() => []);
      setConversations(convos || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Conversation.subscribe((event) => {
      if (event.type === "create") {
        setConversations((prev) => [event.data, ...prev]);
      } else if (event.type === "update") {
        setConversations((prev) => {
          const updated = prev.filter((c) => c.id !== event.data.id);
          return [event.data, ...updated];
        });
      } else if (event.type === "delete") {
        setConversations((prev) => prev.filter((c) => c.id !== event.data.id));
      }
    });
    return unsub;
  }, [load]);

  // Search for new users to message
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("searchUsers", { q: searchQuery.trim() });
        const users = res?.data?.results || [];
        setSearchResults(users.filter((u) => u.id !== user?.id));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function startConversationWith(targetUser) {
    try {
      // Check if conversation already exists
      let convo = conversations.find(
        (c) => c.participant_ids?.includes(targetUser.id) && c.participant_ids?.length === 2
      );
      if (!convo) {
        convo = await base44.entities.Conversation.create({
          participant_ids: [user.id, targetUser.id],
          participant_names: [
            user.display_name || user.full_name || "",
            targetUser.display_name || targetUser.full_name || "",
          ],
          participant_avatars: [user.avatar_url || "", targetUser.avatar_url || ""],
        });
      }
      setActiveConvo(convo);
      setShowNew(false);
      setSearchQuery("");
    } catch {
      toast({ title: "Could not start conversation", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-0 md:px-4 md:py-4">
      <div className="md:rounded-2xl md:border md:border-border overflow-hidden bg-card md:h-[calc(100vh-9rem)] flex flex-col md:flex-row">
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${activeConvo ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h1 className="text-lg font-extrabold tracking-tight">Messages</h1>
            <button
              onClick={() => setShowNew((v) => !v)}
              className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center active:scale-95 transition"
              aria-label="New message"
            >
              <PenLine size={16} />
            </button>
          </div>

          {showNew ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/[0.06] text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2">
                {searching && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-foreground/40" size={18} />
                  </div>
                )}
                {!searching && searchResults.length === 0 && searchQuery.trim() && (
                  <p className="text-sm text-foreground/40 text-center py-6">No users found.</p>
                )}
                {!searching &&
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startConversationWith(u)}
                      className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-foreground/[0.04] transition text-left"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-foreground/10 grid place-items-center text-xs font-semibold shrink-0">
                          {(u.display_name || u.full_name || "?").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {u.display_name || u.full_name || "Unknown"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {conversations.length === 0 ? (
                <div className="px-4 py-10">
                  <EmptyState
                    icon={MessageCircle}
                    title="No conversations"
                    description="Tap the pencil to search for someone and start chatting."
                  />
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  activeId={activeConvo?.id}
                  onSelect={setActiveConvo}
                  currentUserId={user?.id}
                />
              )}
            </div>
          )}
        </div>

        {/* Chat view */}
        <div className={`flex-1 ${activeConvo ? "flex" : "hidden md:flex"} flex-col`}>
          {activeConvo ? (
            <ChatView conversation={activeConvo} onBack={() => setActiveConvo(null)} />
          ) : (
            <div className="flex-1 grid place-items-center">
              <EmptyState
                icon={MessageCircle}
                title="Select a conversation"
                description="Choose a conversation or start a new one."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}