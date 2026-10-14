import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, User, MoreHorizontal, Library as LibraryIcon } from "lucide-react";
import MobileMoreSheet from "@/components/MobileMoreSheet";

const TABS = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/library", label: "Library", Icon: LibraryIcon },
  { to: "/profile", label: "Me", Icon: User },
];

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  function handleTab(to, event) {
    if (loc.pathname === to) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else if (to !== "/" && loc.pathname.startsWith(to + "/")) {
      event.preventDefault();
      nav(to);
    }
  }
  const moreActive = !["/", "/search", "/library", "/profile"].some(path => loc.pathname === path || (path !== "/" && loc.pathname.startsWith(path + "/")));
  return <>
    <nav aria-label="Main navigation" className="mobile-tab-bar md:hidden">
      <div className="mobile-nav-pill">
        {TABS.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} onClick={event => handleTab(to, event)} className={({ isActive }) => "mobile-nav-tab" + (isActive ? " is-active" : "")}>
          <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>)}
        <button type="button" onClick={() => setMoreOpen(true)} className={"mobile-nav-tab" + (moreOpen || moreActive ? " is-active" : "")} aria-label="More pages" aria-haspopup="dialog" aria-expanded={moreOpen}>
          <MoreHorizontal size={23} strokeWidth={1.9} aria-hidden="true" /><span>More</span>
        </button>
      </div>
      <NavLink to="/search" onClick={event => handleTab("/search", event)} className={({ isActive }) => "mobile-nav-search" + (isActive ? " is-active" : "")} aria-label="Search music and people">
        <Search size={26} strokeWidth={2} aria-hidden="true" />
      </NavLink>
    </nav>
    {moreOpen && <MobileMoreSheet onClose={() => setMoreOpen(false)} />}
  </>;
}
