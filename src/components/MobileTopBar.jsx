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

  return null;

















}