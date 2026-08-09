import { Plus } from "lucide-react";

function getOtherUser(conv, me) {
  const idx = conv.participant_ids.indexOf(me.id);
  const otherIdx = idx === 0 ? 1 : 0;
  return {
    id: conv.participant_ids[otherIdx],
    display_name: conv.participant_names[otherIdx] || "Unknown",
    avatar_url: conv.participant_avatars[otherIdx] || ""
  };
}

export default function ActiveRow({ conversations, me, onPick, onNew }) {
  const recent = conversations.slice(0, 15);

  return null;
































}