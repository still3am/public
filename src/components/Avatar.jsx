export default function Avatar({ user, size = 40, className = "" }) {
  if (!user) return null;
  const px = `${size}px`;
  const name =
    user.display_name || user.full_name || user.email || "?";
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        style={{ width: px, height: px }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: px, height: px, fontSize: Math.max(11, size * 0.4) }}
      className={`rounded-full bg-foreground/10 grid place-items-center font-semibold text-foreground/70 shrink-0 ${className}`}
    >
      {name.trim().charAt(0) || "?"}
    </div>
  );
}