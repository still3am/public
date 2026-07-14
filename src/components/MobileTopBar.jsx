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
  return null;



















}