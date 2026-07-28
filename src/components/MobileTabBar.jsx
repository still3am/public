import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, User, Plus } from "lucide-react";
import MobileMoreSheet from "@/components/MobileMoreSheet";

const TABS = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/profile", label: "Me", Icon: User },
];

function TabButton({ to, label, Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center gap-1 flex-1 h-full px-1.5 rounded-xl transition ${
          isActive ? "text-foreground" : "text-foreground/45 hover:text-foreground/70"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute top-1.5 h-1 rounded-full bg-foreground transition-all duration-200 ${
              isActive ? "w-6 opacity-100" : "w-0 opacity-0"
            }`}
          />
          <span
            className={`grid place-items-center w-9 h-9 rounded-full transition ${
              isActive ? "bg-foreground/[0.08]" : ""
            }`}
          >
            <Icon
              size={21}
              strokeWidth={isActive ? 2.4 : 2}
              className="transition"
            />
          </span>
          <span
            className={`text-[10px] font-medium tracking-tight transition ${
              isActive ? "opacity-100" : "opacity-80"
            }`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  function handleTab(to, e) {
    if (loc.pathname === to) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (to !== "/" && loc.pathname.startsWith(to + "/")) {
      e.preventDefault();
      nav(to);
    }
  }

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-background/85 backdrop-blur-xl border-t border-border tab-bar-safe">
        <div className="flex items-stretch h-16">
          {left.map(({ to, label, Icon, end }) => (
            <TabButton
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              end={end}
              onClick={(e) => handleTab(to, e)}
            />
          ))}

          <div className="flex items-center justify-center flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-12 h-12 rounded-full bg-foreground text-background grid place-items-center shadow-lg shadow-foreground/20 -translate-y-1 active:scale-95 transition"
              aria-label="More pages"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>

          {right.map(({ to, label, Icon, end }) => (
            <TabButton
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              end={end}
              onClick={(e) => handleTab(to, e)}
            />
          ))}
        </div>
      </nav>
      {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}