import { useState } from "react";
import { NavLink } from "react-router-dom";

import {
  Home,
  Upload,
  Search,
  TrendingUp,
  Clock,
  Library as LibraryIcon,
  Shield,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/search", label: "Search", icon: Search },
  { to: "/top", label: "Top Charts", icon: TrendingUp },
  { to: "/recent", label: "Recently Added", icon: Clock },
  { to: "/library", label: "Library", icon: LibraryIcon },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "1"
  );

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const links = [
    ...NAV,
    ...(user?.role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg text-sm font-medium transition ${
      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
    } ${
      isActive
        ? "bg-foreground/[0.06] text-foreground"
        : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 relative border-r border-border bg-background h-screen sticky top-0 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        onClick={toggle}
        className="absolute top-2 right-2 z-10 text-foreground/30 hover:text-foreground transition"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
      </button>
      <div
        className={`flex items-center py-6 ${
          collapsed ? "px-2 justify-center" : "px-6"
        }`}
      >
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <Logo width="100%" />
          </div>
        )}
      </div>
      <nav
        className={`flex-1 flex flex-col gap-1 overflow-y-auto pb-2 ${
          collapsed ? "px-2" : "px-3"
        }`}
      >
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} className={navLinkCls} end={end} title={label}>
            <Icon size={18} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
      <div
        className={`border-t border-border space-y-2 pb-28 ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        {!collapsed && <ThemeToggle />}
        <NavLink
          to="/profile"
          className={`flex items-center gap-3 rounded-lg hover:bg-foreground/[0.03] ${
            collapsed ? "justify-center py-2" : "px-2 py-2"
          }`}
          title={user?.display_name || user?.full_name || "You"}
        >
          <Avatar user={user} size={collapsed ? 28 : 36} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1">
                {user?.display_name || user?.full_name || "You"}
              </div>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}