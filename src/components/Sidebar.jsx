import { NavLink } from "react-router-dom";

import { useEffect, useState } from "react";
import {
  Home,
  Search,
  TrendingUp,
  Clock,
  Bell,
  Library as LibraryIcon,
  Shield,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const navLinkCls = ({ isActive }) =>
`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
isActive ?
"bg-foreground/[0.06] text-foreground" :
"text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"}`;


export default function Sidebar() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Notification.
    filter({ user_id: user.id, read: false }, "-created_date", 50).
    then((r) => setUnread(r.length)).
    catch(() => {});
  }, [user?.id]);

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-background h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center">
        <Logo width="100%" />
      </div>
      <nav className="px-3 flex-1 flex flex-col gap-1 overflow-y-auto pb-2">
        <NavLink to="/" className={navLinkCls} end>
          <Home size={18} /> Home
        </NavLink>
        <NavLink to="/search" className={navLinkCls}>
          <Search size={18} /> Search
        </NavLink>
        <NavLink to="/top" className={navLinkCls}>
          <TrendingUp size={18} /> Top Charts
        </NavLink>
        <NavLink to="/recent" className={navLinkCls}>
          <Clock size={18} /> Recently Added
        </NavLink>
        <NavLink to="/library" className={navLinkCls}>
          <LibraryIcon size={18} /> Library
        </NavLink>
        <NavLink to="/notifications" className={navLinkCls}>
          <Bell size={18} /> Notifications
          {unread > 0 &&
          <span className="ml-auto bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unread > 99 ? "99+" : unread}
            </span>
          }
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/admin" className={navLinkCls}>
            <Shield size={18} /> Admin
          </NavLink>
        )}
      </nav>
      <div className="p-3 border-t border-border space-y-2 pb-28">
        <ThemeToggle />
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.03]">
          
          <Avatar user={user} size={36} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate flex items-center gap-1">
              {user?.display_name || user?.full_name || "You"}
            </div>
          </div>
        </NavLink>
      </div>
    </aside>);

}