import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Search, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

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
  const location = useLocation(),navigate = useNavigate(),{ user } = useAuth();
  const page = DESKTOP_PAGES[location.pathname.split("/")[1]] || { label: "PUBLIC", section: "Music" };
  const search = () => {
    if (location.pathname !== "/search") navigate("/search");
    requestAnimationFrame(() => document.querySelector('[data-desktop-search]')?.focus());
  };
  useEffect(() => {
    const key = (event) => {if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && window.matchMedia("(min-width:768px)").matches) {event.preventDefault();search();}};
    window.addEventListener("keydown", key);return () => window.removeEventListener("keydown", key);
  }, [location.pathname, navigate]);
  return <header className="desktop-header hidden">
  <div className="desktop-header-context"><button type="button" className="desktop-header-back" aria-label="Back" onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate("/")}><ChevronLeft size={19} /></button><span>{page.section}</span><span aria-hidden="true">/</span><strong>{page.label}</strong></div>
  <div className="desktop-header-actions"><button type="button" className="desktop-search-trigger" onClick={search}><Search size={16} /><span>Search PUBLIC</span><kbd>⌘ / Ctrl K</kbd></button>{!user && <Link to="/register" className="desktop-join-link">Join PUBLIC<ArrowUpRight size={15} /></Link>}</div>
 </header>;
}