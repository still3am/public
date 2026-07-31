import { NavLink } from "react-router-dom";

import {
  Home,
  Upload,
  Search,
  TrendingUp,
  Clock,
  Library as LibraryIcon,
  MessageSquare,
  Shield,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

const navLinkCls = ({ isActive }) =>
`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
isActive ?
"bg-foreground/[0.06] text-foreground" :
"text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"}`;


export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-background h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center">
        <Logo width="100%" />
      </div>
      <nav className="px-3 flex-1 flex flex-col gap-1 overflow-y-auto pb-2">
        <NavLink to="/" className={navLinkCls} end>
          <Home size={18} /> Home
        </NavLink>
        <NavLink to="/upload" className={navLinkCls}>
          <Upload size={18} /> Upload
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
        <NavLink to="/messages" className={navLinkCls}>
          <MessageSquare size={18} /> Messages
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