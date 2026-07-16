import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Search, Library, User, Plus } from "lucide-react";
import MobileMoreSheet from "@/components/MobileMoreSheet";

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/85 backdrop-blur-xl border-t border-border tab-bar-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive ? "text-foreground" : "text-foreground/40"
              }`
            }
          >
            <Home size={20} />
            Home
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive ? "text-foreground" : "text-foreground/40"
              }`
            }
          >
            <Search size={20} />
            Search
          </NavLink>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center shadow-lg active:scale-95 transition"
              aria-label="More pages"
            >
              <Plus size={22} />
            </button>
          </div>
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive ? "text-foreground" : "text-foreground/40"
              }`
            }
          >
            <Library size={20} />
            Library
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                isActive ? "text-foreground" : "text-foreground/40"
              }`
            }
          >
            <User size={20} />
            Me
          </NavLink>
        </div>
      </nav>
      {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}