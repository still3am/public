import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Logo from "@/components/Logo";

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
"/artist"]
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
    <div className="md:hidden sticky top-0 inset-x-0 z-30 h-[calc(3.5rem+env(safe-area-inset-top))] bg-background/85 backdrop-blur border-b border-border flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
      <div className="w-10 flex items-center">
        {showBack && (
          <button
            onClick={() => nav(-1)}
            className="p-2 -ml-2 hover:bg-foreground/5 rounded-full"
            aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
        )}
      </div>
      <span className="text-sm font-extrabold tracking-tight truncate max-w-[65%]">
        {title === "PUBLIC." ? <Logo size={24} /> : title}
      </span>
      <div className="w-10" />
    </div>
  );

















}