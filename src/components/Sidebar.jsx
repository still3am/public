import { NavLink } from "react-router-dom";
import { Home, Search, Library, Heart, Upload, Shield } from "lucide-react";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/AuthContext";

const navLinkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? "bg-foreground/[0.06] text-foreground"
      : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
  }`;

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-white h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center gap-2.5">
        <Logo size={26} />
        <span className="text-base font-extrabold tracking-tight">PUBLIC.</span>
      </div>
      <nav className="px-3 flex-1 flex flex-col gap-1">
        <NavLink to="/" className={navLinkCls} end>
          <Home size={18} /> Home
        </NavLink>
        <NavLink to="/search" className={navLinkCls}>
          <Search size={18} /> Search
        </NavLink>
        <NavLink to="/library" className={navLinkCls}>
          <Library size={18} /> Library
        </NavLink>
        <NavLink to="/liked" className={navLinkCls}>
          <Heart size={18} /> Liked Songs
        </NavLink>
        <NavLink to="/upload" className={navLinkCls}>
          <Upload size={18} /> Upload
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={navLinkCls}>
            <Shield size={18} /> Admin
          </NavLink>
        )}
      </nav>
      <div className="p-3 border-t border-border pb-28">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.03]"
        >
          <Avatar user={user} size={36} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate flex items-center gap-1">
              {user?.display_name || user?.full_name || "You"}
              {user?.is_verified && (
                <Shield className="text-foreground" size={12} />
              )}
            </div>
            <div className="text-xs text-foreground/50 truncate">
              {user?.email}
            </div>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}