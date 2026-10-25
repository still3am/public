import {Music2} from 'lucide-react';
import {canUploadMusic} from '@/lib/creatorAccess';
import { NavLink } from "react-router-dom";
import { Home, GalleryVerticalEnd, Search, TrendingUp, Clock, Library as LibraryIcon, Disc3, Upload, Bell, ChevronsLeft, ChevronsRight, ListMusic, CloudOff, FolderOpen, BarChart3, Shield, Lightbulb, LifeBuoy } from "lucide-react";
import { useMyPlaylists } from "@/hooks/useMyPlaylists";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { useAuth } from "@/lib/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";
import Avatar from "@/components/Avatar";
import publicWordmark from "@/assets/public-wordmark.svg";
import publicMonogram from "@/assets/public-monogram.svg";
import ThemeToggle from "@/components/ThemeToggle";

export default function Sidebar() {
  const { user } = useAuth(),{ collapsed, toggle } = useSidebarCollapsed(),unread = useUnreadCount(),{ playlists } = useMyPlaylists();
  const groups = [
  { label: "Discover", links: [["/", "Home", Home, true], ["/search", "Search", Search], ["/moments", "Moments", GalleryVerticalEnd], ["/top", "Top charts", TrendingUp], ["/recent", "Recently added", Clock], ["/records", "Artists", Disc3]] },
  ...(user ? [{ label: "Your music", links: [["/library", "Library", LibraryIcon], ["/downloads", "Offline music", CloudOff], ["/notifications", "Notifications", Bell]] }] : []),
  { label: "Create & connect", links: [...(canUploadMusic(user)?[["/upload", "Upload music", Upload]]:[]), ...(canUploadMusic(user) ? [["/my-uploads", "Your uploads", FolderOpen], ...(user.creator_role=== "artist" ? [["/artist-dashboard", "Artist dashboard", BarChart3]] : [])] : []), ["/music-requests", "Music Requests", Music2], ["/suggestions", "Ideas", Lightbulb], ...(user?.role === "admin" ? [["/admin", "Admin", Shield]] : [])] }];

  const linkClass = ({ isActive }) => "desktop-nav-link " + (isActive ? "is-active" : "");
  return <aside data-collapsed={collapsed} className={"desktop-sidebar hidden md:flex flex-col shrink-0 relative isolate z-10 border-r border-border sidebar-surface bg-background h-dvh sticky top-0 overflow-hidden transition-[width] duration-300 ease-out " + (collapsed ? "w-[68px]" : "w-64")}>
  <div className="desktop-sidebar-brand"><NavLink to="/" aria-label="PUBLIC home" className="desktop-brand-link">{collapsed ? <img src={publicMonogram} width={28} height={28} alt="" aria-hidden="true" className="logo-dark-invert shrink-0" /> : <img src={publicWordmark} width={146} height={31} alt="" aria-hidden="true" className="logo-dark-invert shrink-0" />}</NavLink><button type="button" onClick={toggle} className="desktop-sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}</button></div>
  <nav aria-label="Main navigation" className="desktop-sidebar-nav">
   {groups.map((group) => <div className="desktop-nav-group" key={group.label}><p className="desktop-nav-label" aria-hidden={collapsed}>{group.label}</p>{group.links.map(([to, label, Icon, end]) => <NavLink to={to} key={to} end={end} title={label} aria-label={label} className={linkClass}><span className="desktop-nav-icon"><Icon size={18} />{to === "/notifications" && unread > 0 && <span className="desktop-unread-dot" />}</span><span className="desktop-nav-text">{label}</span>{to === "/notifications" && unread > 0 && <span className="desktop-unread-count">{unread > 99 ? "99+" : unread}</span>}</NavLink>)}</div>)}
   {user && !!playlists?.length && <div className="desktop-nav-group"><p className="desktop-nav-label" aria-hidden={collapsed}>Your playlists</p>{playlists.slice(0, 8).map((pl) => <NavLink to={"/playlist/" + pl.id} key={pl.id} title={pl.name} aria-label={pl.name} className={linkClass}><ListMusic size={17} /><span className="desktop-nav-text">{pl.name}</span></NavLink>)}</div>}
  </nav>
  <footer className="desktop-sidebar-footer"><NavLink to="/support" title="Help & support" aria-label="Help & support" className={linkClass}><LifeBuoy size={18} /><span className="desktop-nav-text">Help & support</span></NavLink><ThemeToggle labelClassName="desktop-nav-text" /><NavLink to={user ? "/profile" : "/login"} className="desktop-account-link" title={user?.display_name || user?.full_name || "Sign in"} aria-label={user ? "Your profile" : "Sign in"}><Avatar user={user} size={32} /><span className="desktop-nav-text"><strong>{user?.display_name || user?.full_name || "Sign in"}</strong></span></NavLink></footer>
 </aside>;
}