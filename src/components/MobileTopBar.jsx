import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";

const TITLES = {
  "/search": "Search",
  "/library": "Library",
  "/liked": "Liked Songs",
  "/upload": "Upload",
  "/profile": "Profile",
  "/discover": "Discover",
  "/top": "Top Charts",
  "/recent": "Recently Added",
  "/notifications": "Notifications",
  "/admin": "Admin",
};

export default function MobileTopBar() {
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const title = TITLES[loc.pathname];

  if (!isHome && !title) return null;

  return (
    <header className="md:hidden sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border top-bar-safe">
      <div className="h-14 px-4 flex items-center">
        {isHome ? (
          <Link to="/" className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-extrabold tracking-tight text-lg leading-none">
              PUBLIC.
            </span>
          </Link>
        ) : (
          <h1 className="text-lg font-extrabold tracking-tight leading-none">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}