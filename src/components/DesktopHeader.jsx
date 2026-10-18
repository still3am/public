import { useEffect,useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";


export const DESKTOP_PAGES = {
  "": { label: "Home", section: "Discover" }, search: { label: "Search", section: "Discover" }, top: { label: "Top charts", section: "Discover" }, recent: { label: "Recently added", section: "Discover" },
  track: { label: "Song", section: "Music" }, playlist: { label: "Playlist", section: "Your music" }, mix: { label: "Made for you", section: "Your music" },
  library: { label: "Library", section: "Your music" }, downloads: { label: "Offline music", section: "Your music" }, profile: { label: "Profile", section: "Community" },
  artist: { label: "Artist", section: "Discover" }, records: { label: "Artists", section: "Discover" }, notifications: { label: "Notifications", section: "Community" },
  suggestions: { label: "Ideas", section: "Community" }, lounge: { label: "Listening room", section: "Community" }, upload: { label: "Upload music", section: "Create" },
  "my-uploads": { label: "Your uploads", section: "Create" }, "unfinished-uploads": { label: "Unfinished uploads", section: "Create" }, "artist-dashboard": { label: "Artist dashboard", section: "Create" },
  admin: { label: "Admin", section: "Manage" }, settings: { label: "Song transitions", section: "Settings" }, support: { label: "Support", section: "PUBLIC" }, privacy: { label: "Privacy", section: "PUBLIC" }, terms: { label: "Community & terms", section: "PUBLIC" }
};
export default function DesktopHeader() {
  const location = useLocation(),navigate = useNavigate();
  const search = useCallback(() => {
    if (location.pathname !== "/search") navigate("/search");
    requestAnimationFrame(() => document.querySelector('[data-desktop-search]')?.focus());
  },[location.pathname,navigate]);
  useEffect(() => {
    const key = (event) => {if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && window.matchMedia("(min-width:768px)").matches) {event.preventDefault();search();}};
    window.addEventListener("keydown", key);return () => window.removeEventListener("keydown", key);
  }, [search]);
  return null;



}