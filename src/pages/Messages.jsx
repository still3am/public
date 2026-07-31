import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import NewMessageModal from "@/components/messages/NewMessageModal";
import { timeAgo } from "@/lib/audio-utils";
import { Loader2, MessageSquare, PenSquare } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  async function load() {
    if (!user?.id) return;
    const [sent, received] = await Promise.all([
      base44.entities.Message.filter({ sender_id: user.id }, "-created_date", 500).catch(() => []),
      base44.entities.Message.filter({ recipient_id: user.id }, "-created_date", 500).catch(() => []),
    ]);
    const all = [...(sent || []), ...(received || [])].sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date)
    );

    // Collapse to one row per conversation partner, newest message first.
    const byPartner = new Map();
    for (const m of all) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const partnerName = m.sender_id === user.id ? m.recipient_name : m.sender_name;
      if (!byPartner.has(partnerId)) {
        byPartner.set(partnerId, {
          partnerId,
          partnerName: partnerName || "Unknown",
          last: m,
          unread: 0,
        });
      }
      const t = byPartner.get(partnerId);
      if (m.recipient_id === user.id && !m.read) t.unread += 1;
    }
    setThreads([...byPartner.values()]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = base44.entities.Message.subscribe(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 main-content">
      <BackHeader title="Messages" />

      <div className="pt-3 pb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Messages</h1>
          <p className="text-sm text-foreground/50 mt-1.5">
            Talk music directly with anyone on PUBLIC.
          </p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-bold active:scale-95 transition"
        >
          <PenSquare size={14} /> New
        </button>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="animate-spin text-foreground/40" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Start a conversation and it'll show up here."
          action={
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold"
            >
              <PenSquare size={14} /> New message
            </button>
          }
        />
      ) : (
        <div className="space-y-0.5">
          {threads.map((t) => (
            <Link
              key={t.partnerId}
              to={`/messages/${t.partnerId}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-foreground/[0.04] transition"
            >
              <Avatar user={{ display_name: t.partnerName }} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{t.partnerName}</span>
                  <span className="text-[11px] text-foreground/40 shrink-0">
                    {timeAgo(t.last.created_date)}
                  </span>
                </div>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    t.unread ? "text-foreground font-semibold" : "text-foreground/50"
                  }`}
                >
                  {t.last.sender_id === user.id ? "You: " : ""}
                  {t.last.body}
                </p>
              </div>
              {t.unread > 0 && (
                <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-extrabold grid place-items-center">
                  {t.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {composing && <NewMessageModal onClose={() => setComposing(false)} />}
    </div>
  );
}