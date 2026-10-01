import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, UserPlus } from "lucide-react";
import Avatar from "@/components/Avatar";

// Avatar row for the people who can edit a playlist, with the owner's invite
// control. Renders nothing for a solo playlist owned by someone else.
export default function PlaylistCollaborators({ playlist, isOwner, onManage }) {
  const ids = playlist.collaborator_ids || [];
  const [people, setPeople] = useState([]);
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) {
      setPeople([]);
      return;
    }
    let alive = true;
    base44.functions
      .invoke("usersByIds", { ids })
      .then((res) => {
        if (!alive) return;
        setPeople(
          (res?.data?.users || []).map((u) => ({
            id: u.id,
            name: u.display_name || u.full_name || "Listener",
            avatar_url: u.avatar_url || "",
          }))
        );
      })
      .catch(() => alive && setPeople([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!ids.length && !isOwner) return null;

  return (
    <div className="flex items-center gap-2.5 mb-4 justify-center md:justify-start">
      {people.length > 0 && (
        <div className="flex items-center -space-x-2">
          {people.slice(0, 4).map((m) => (
            <Avatar key={m.id} user={m} size={26} className="ring-2 ring-background" />
          ))}
        </div>
      )}
      <span className="text-xs text-foreground/50 truncate">
        {ids.length ? `${ids.length + 1} collaborators` : "Solo playlist"}
      </span>
      {isOwner && (
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1 text-xs font-bold text-foreground/65 hover:text-foreground transition shrink-0"
        >
          {ids.length ? <Users size={13} /> : <UserPlus size={13} />}
          {ids.length ? "Manage" : "Invite"}
        </button>
      )}
    </div>
  );
}