import { format, isToday, isYesterday, isThisYear } from "date-fns";
import { base44 } from "@/api/base44Client";

export function displayNameOf(user, fallback = "Someone") {
  return (
    user?.display_name ||
    user?.full_name ||
    (user?.email ? user.email.split("@")[0] : "") ||
    fallback
  );
}

// participant_names / participant_avatars are indexed to match participant_ids,
// so the other member's details come straight off the conversation record.
export function otherParticipant(conv, myId) {
  const ids = conv?.participant_ids || [];
  const i = ids.findIndex((pid) => pid && pid !== myId);
  if (i < 0) return null;
  return {
    id: ids[i],
    name: conv.participant_names?.[i] || "",
    avatar_url: conv.participant_avatars?.[i] || "",
  };
}

export async function findOrCreateConversation(me, other) {
  const rows = await base44.entities.Conversation.filter(
    { participant_ids: { $in: [me.id, other.id] } },
    "-last_message_at",
    25
  );
  const found = (rows || []).find((c) => {
    const ids = c.participant_ids || [];
    return ids.length === 2 && ids.includes(me.id) && ids.includes(other.id);
  });
  if (found) return found;

  return base44.entities.Conversation.create({
    participant_ids: [me.id, other.id],
    participant_names: [displayNameOf(me, ""), displayNameOf(other, "")],
    participant_avatars: [me.avatar_url || "", other.avatar_url || ""],
    last_message_text: "",
    last_message_at: new Date().toISOString(),
  });
}

export function shortTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, isThisYear(d) ? "MMM d" : "MMM d, yyyy");
}

export function dayLabel(iso) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, isThisYear(d) ? "MMMM d" : "MMMM d, yyyy");
}