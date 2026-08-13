import { useNavigate, useLocation } from "react-router-dom";
import {
  X,
  Upload,
  BarChart3,
  Clock,
  Heart,
  Lightbulb,
  Library as LibraryIcon,
  Shield,
  Bell,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";

const ITEMS = [
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/top", icon: BarChart3, label: "Top Charts" },
  { to: "/recent", icon: Clock, label: "Recently Added" },
  { to: "/library", icon: LibraryIcon, label: "Library" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/suggestions", icon: Lightbulb, label: "Suggestions" },
];

export default function MobileMoreSheet({ onClose }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const unread = useUnreadCount();
  const items = user?.role === "admin"
    ? [...ITEMS, { to: "/admin", icon: Shield, label: "Admin" }]
    : ITEMS;
  function go(to) {
    nav(to);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-[min(94vw,28rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-[accordion-down_.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold">More</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-3">
          {items.map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              onClick={() => go(to)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition tap-target ${
                loc.pathname === to
                  ? "bg-foreground/5 text-foreground"
                  : "hover:bg-foreground/[0.03] text-foreground/70"
              }`}
            >
              <Icon size={22} />
              {to === "/notifications" && unread > 0 && (
                <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold grid place-items-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
        <div className="px-3 pb-3">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}