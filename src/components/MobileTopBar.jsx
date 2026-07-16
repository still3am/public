import { Link, useLocation } from "react-router-dom";

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
  "/admin": "Admin"
};

export default function MobileTopBar() {
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const title = TITLES[loc.pathname];

  if (!isHome && !title) return null;

  return null;
















}