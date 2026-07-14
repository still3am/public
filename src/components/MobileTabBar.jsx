import { NavLink } from "react-router-dom";
import { Home, Search, Heart, Library, User } from "lucide-react";

export default function MobileTabBar() {
  const items = [
    { to: "/", icon: Home, label: "Home", end: true },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/liked", icon: Heart, label: "Liked" },
    { to: "/library", icon: Library, label: "Library" },
    { to: "/profile", icon: User, label: "Me" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/85 backdrop-blur-xl border-t border-border grid grid-cols-5 h-16">
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              isActive ? "text-foreground" : "text-foreground/40"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}