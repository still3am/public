import { NavLink } from "react-router-dom";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

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

const EASE = "transition-all duration-300 ease-out";

export default function Sidebar() {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebarCollapsed();

  const links = [
    ...NAV,
    ...(user?.role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  // Labels fade/slide but never unmount, so nothing pops during the width change.
  const fadeCls = collapsed
    ? "opacity-0 -translate-x-1 pointer-events-none"
    : "opacity-100 translate-x-0";

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg text-sm font-medium whitespace-nowrap overflow-hidden px-3 py-2 ${
      isActive
        ? "bg-foreground/[0.06] text-foreground"
        : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03]"
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 relative border-r border-border bg-background h-screen sticky top-0 overflow-hidden transition-[width] duration-300 ease-out ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      <button
        onClick={toggle}
        className="absolute top-2 right-2 z-10 text-foreground/30 hover:text-foreground transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
      </button>

      <div className="flex items-center py-6 px-3 h-[76px]">
        <div className={`w-[184px] shrink-0 pl-3 ${EASE} ${fadeCls}`}>
          <Logo width="100%" />
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden pb-2 px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} className={navLinkCls} end={end} title={label}>
            <Icon size={18} className="shrink-0" />
            <span className={`shrink-0 ${EASE} ${fadeCls}`}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border space-y-2 pb-28 p-3">
        <div className={`${EASE} ${fadeCls}`}>
          <ThemeToggle />
        </div>
        <NavLink
          to="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-foreground/[0.03]"
          title={user?.display_name || user?.full_name || "You"}
        >
          <Avatar user={user} size={32} />
          <div className={`min-w-0 shrink-0 ${EASE} ${fadeCls}`}>
            <div className="text-sm font-semibold whitespace-nowrap">
              {user?.display_name || user?.full_name || "You"}
            </div>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}