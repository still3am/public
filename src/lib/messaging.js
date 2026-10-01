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

// The quick-reaction set offered on every message.
export const QUICK_REACTIONS = ["❤️", "🔥", "😂", "👏", "🙌", "😮"];

// reactions is stored as a JSON string of { emoji: [user_ids] }.
export function parseReactions(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function toggleReaction(json, emoji, userId) {
  const all = { ...parseReactions(json) };
  const list = all[emoji] || [];
  const next = list.includes(userId)
    ? list.filter((id) => id !== userId)
    : [...list, userId];
  if (next.length) all[emoji] = next;
  else delete all[emoji];
  return Object.keys(all).length ? JSON.stringify(all) : "";
}

export function parseReply(json) {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// An attachment carries no text, so the inbox row, a reply quote and the bubble
// all label it from its media type.
export function attachmentLabel(mediaType) {
  if (mediaType === "image") return "📷 Photo";
  if (mediaType === "audio") return "🎤 Voice message";
  if (mediaType === "video") return "🎬 Video";
  return "Attachment";
}