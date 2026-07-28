import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, User, Plus, Library as LibraryIcon } from "lucide-react";
import MobileMoreSheet from "@/components/MobileMoreSheet";

const TABS = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/library", label: "Library", Icon: LibraryIcon },
  { to: "/profile", label: "Me", Icon: User },
];

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  function handleTab(to, e) {
    if (loc.pathname === to) {
      // already at root of that section — just scroll to top
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (to !== "/" && loc.pathname.startsWith(to + "/")) {
      // already on a sub-route of this section — go back to its root
      e.preventDefault();
      nav(to);
    }
  }

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-background/85 backdrop-blur-xl border-t border-border tab-bar-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          {left.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={(e) => handleTab(to, e)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[10px] font-medium px-1.5 py-1 rounded-xl transition ${
                  isActive ? "text-foreground bg-foreground/[0.06]" : "text-foreground/40 hover:text-foreground/70"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}

          <div className="flex items-center justify-center">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shadow-lg active:scale-95 transition"
              aria-label="More pages"
            >
              <Plus size={22} />
            </button>
          </div>

          {right.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={(e) => handleTab(to, e)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[10px] font-medium px-1.5 py-1 rounded-xl transition ${
                  isActive ? "text-foreground bg-foreground/[0.06]" : "text-foreground/40 hover:text-foreground/70"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}