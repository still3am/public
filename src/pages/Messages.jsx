import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { coalesce } from "@/lib/coalesce";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import ConversationRow from "@/components/messages/ConversationRow";

export default function Messages() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [unreadByConversation, setUnreadByConversation] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [convs, unread] = await Promise.all([
      base44.entities.Conversation.filter(
        { participant_ids: { $in: [user.id] } },
        "-last_message_at",
        100
      ),
      base44.entities.Message.filter(
        { recipient_id: user.id, read: false },
        "-created_date",
        200
      ),
    ]);

    const counts = {};
    (unread || []).forEach((m) => {
      counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
    });
    setUnreadByConversation(counts);

    // Pinned conversations float to the top, then most recent first.
    const sorted = (convs || []).slice().sort((a, b) => {
      if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
      return (Date.parse(b.last_message_at) || 0) - (Date.parse(a.last_message_at) || 0);
    });
    setConversations(sorted);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const reload = coalesce(load, 800);
    const unsubMsg = base44.entities.Message.subscribe(() => reload());
    const unsubConv = base44.entities.Conversation.subscribe(() => reload());
    return () => {
      reload.cancel();
      unsubMsg();
      unsubConv();
    };
  }, [user?.id, load]);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Messages"
          subtitle="Direct conversations with anyone in the PUBLIC network." />
        

        {conversations === null ?
        <div className="py-16 text-center">
            <Loader2 className="animate-spin inline text-foreground/40" size={22} />
          </div> :
        conversations.length === 0 ?
        <EmptyState
          icon={MessageCircle}
          title="No messages yet"
          description="Open someone's profile and tap the message button to start a conversation." /> :


        <div className="pb-6">
            {conversations.map((c) =>
          <ConversationRow
            key={c.id}
            conversation={c}
            myId={user?.id}
            unread={unreadByConversation[c.id] || 0}
            onOpen={() => nav(`/messages/${c.id}`)} />

          )}
          </div>
        }
      </div>
    </PullToRefresh>);

}