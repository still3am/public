import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import Logo from "@/components/Logo";

const TITLES = {
  "/": "Home",
  "/search": "Search",
  "/library": "Library",
  "/liked": "Liked Songs",
  "/upload": "Upload",
  "/profile": "Profile",
  "/discover": "Discover",
  "/top": "Top Charts",
  "/recent": "Recently Added",
  "/notifications": "Notifications",
  "/admin": "Admin"
};

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/track/")) return "Track";
  if (pathname.startsWith("/playlist/")) return "Playlist";
  if (pathname.startsWith("/profile/")) return "Profile";
  return "PUBLIC";
}

export default function MobileTopBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const title = titleFor(loc.pathname);
  return (
    <header className="md:hidden sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border top-bar-safe hidden">
      <div className="px-4 h-14 flex items-center justify-between hidden">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo size={22} />
          <span className="font-extrabold tracking-tight">PUBLIC.</span>
        </Link>
        <div className="text-sm font-semibold text-foreground/70 truncate mx-3 flex-1 text-center">
          {title}
        </div>
        <button
          onClick={() => nav("/search")}
          className="p-2 -mr-2 shrink-0"
          aria-label="Search">
          
          <SearchIcon size={20} />
        </button>
      </div>
    </header>);

}