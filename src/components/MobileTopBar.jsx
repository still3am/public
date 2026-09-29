import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Static titles for top-level routes.
const TITLES = {
  "/": "PUBLIC.",
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
  "/downloads": "Downloads",
  "/suggestions": "Suggestions",
  "/records": "Public Records",
  "/artist": "Artists",
  "/onboarding": "Choose your sound",
  "/settings/transitions": "Transitions",
  "/artist-dashboard": "Artist"
};

// Root destinations — these show a title but no back button.
const ROOTS = new Set([
"/",
"/search",
"/library",
"/liked",
"/upload",
"/profile",
"/discover",
"/top",
"/recent",
"/notifications",
"/admin",
"/downloads",
"/suggestions",
"/records",
"/artist",
"/onboarding"]
);

// Child routes with a dynamic id segment.
function childTitle(pathname) {
  if (pathname.startsWith("/track/")) return "Track";
  if (pathname.startsWith("/playlist/")) return "Playlist";
  if (pathname.startsWith("/records/")) return "Artist";
  if (pathname.startsWith("/profile/")) return "Profile";
  if (pathname.startsWith("/lounge/")) return "Lounge";
  return null;
}

export default function MobileTopBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  const title = TITLES[pathname] || childTitle(pathname);
  if (!title) return null;

  const showBack = !ROOTS.has(pathname);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 top-bar-safe hidden">
      <div className="flex items-center gap-1 px-2 h-12">
        {showBack ?
        <button
          onClick={() => nav(-1)}
          className="w-10 h-10 grid place-items-center rounded-full hover:bg-foreground/[0.06] active:scale-95 transition shrink-0"
          aria-label="Go back">
          
            <ChevronLeft size={22} />
          </button> :

        <span className="w-2 shrink-0" />
        }
        <h1 className="text-base font-extrabold tracking-tight truncate hidden">{title}</h1>
      </div>
    </header>);

}