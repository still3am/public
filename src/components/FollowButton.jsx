import { useState } from "react";
import { UserCheck, UserPlus, Loader2 } from "lucide-react";
import { useFollow } from "@/context/FollowContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

/**
 * The one Follow / Following control, shared by profiles, search results, the
 * artist page and the track options menu. State comes from the shared graph, so
 * every instance agrees the moment one of them is tapped.
 *
 * variant: "pill" (icon + label) or "icon" (circular button, as on profiles).
 */
export default function FollowButton({
  id,
  type = "user",
  name = "",
  variant = "pill",
  size = 15,
  className = "",
  onChange,
}) {
  const { user } = useAuth();
  const { isFollowing, toggle } = useFollow();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!id) return null;
  // Your own profile has no follow control.
  if (type === "user" && id === user?.id) return null;

  const following = isFollowing(id, type);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.id) {
      toast({ title: `Sign in to follow ${name || "this artist"}` });
      return;
    }
    setBusy(true);
    try {
      const res = await toggle({ id, type, name });
      if (res) onChange?.(res.following);
    } catch {
      toast({ title: "Couldn't update follow", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const icon = busy ? (
    <Loader2 size={size} className="animate-spin" />
  ) : following ? (
    <UserCheck size={size} />
  ) : (
    <UserPlus size={size} />
  );

  const title = following
    ? `Following${name ? ` ${name}` : ""} — tap to unfollow`
    : `Follow${name ? ` ${name}` : ""}`;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        title={title}
        aria-label={title}
        aria-pressed={following}
        className={
          className ||
          `w-10 h-10 md:w-12 md:h-12 rounded-full grid place-items-center transition ${
            following ? "border border-border" : "bg-foreground text-background"
          }`
        }>
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      aria-label={title}
      aria-pressed={following}
      className={
        className ||
        `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition active:scale-95 ${
          following
            ? "border border-border text-foreground/70 hover:bg-accent"
            : "bg-foreground text-background"
        }`
      }>
      {icon}
      {following ? "Following" : "Follow"}
    </button>
  );
}