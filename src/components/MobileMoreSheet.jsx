import {Music2} from 'lucide-react';
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  X,
  ChevronRight,
  Upload,
  BarChart3,
  Clock,
  Lightbulb,
  Shield,
  Bell } from
"lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";

const ITEMS = [
{ to: "/upload", icon: Upload, label: "Upload" },
{ to: "/top", icon: BarChart3, label: "Top Charts" },
{ to: "/recent", icon: Clock, label: "Recently Added" },
{ to: "/notifications", icon: Bell, label: "Notifications" },
{ to: "/music-requests", icon: Music2, label: "Music Requests" },
{ to: "/suggestions", icon: Lightbulb, label: "Suggestions" }];


/** @param {any} props */
export default function MobileMoreSheet({ onClose }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const unread = useUnreadCount();
  const items = user?.role === "admin" ?
  [...ITEMS, { to: "/admin", icon: Shield, label: "Admin" }] :
  ITEMS;
  useEffect(() => {
    const root = document.documentElement;
    const hadModalClass = root.classList.contains("modal-open");
    const previousOverflow = document.body.style.overflow;
    root.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      if (!hadModalClass) root.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  function go(to) {
    nav(to);
    onClose();
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="More pages" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose?.();}}} className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-h-[80dvh] flex flex-col bg-card rounded-t-3xl border border-border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        
        <div aria-hidden="true" className="w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4 shrink-0" />
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="text-lg font-extrabold tracking-tight">More</h2>
          <button
            onClick={onClose}
            type="button"
            className="mobile-more-close w-11 h-11 grid place-items-center rounded-full hover:bg-foreground/10"
            aria-label="Close">
            
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2 min-h-0 overflow-y-auto overscroll-contain">
          {items.map(({ to, icon: Icon, label }) =>
          <button
            key={to}
            onClick={() => go(to)}
            className={`relative w-full min-h-[64px] flex items-center justify-start gap-3 p-3.5 rounded-2xl transition text-left shrink-0 ${
            loc.pathname === to ?
            "bg-foreground/5 text-foreground" :
            "bg-foreground/[0.02] hover:bg-foreground/[0.05] text-foreground"}`
            }>
            
              <span className="w-10 h-10 rounded-xl bg-foreground/[0.06] grid place-items-center shrink-0"><Icon size={18} className="text-foreground/70" /></span>
              <span className="text-sm font-bold flex-1 min-w-0">{label}</span>
              {to === "/notifications" && unread > 0 &&
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center shrink-0">
                  {unread > 99 ? "99+" : unread}
                </span>
            }
              <ChevronRight size={16} className="text-foreground/30 shrink-0" />
            </button>
          )}
        </div>
        

        
      </div>
    </div>);

}