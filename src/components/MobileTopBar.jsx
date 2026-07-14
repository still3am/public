import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Upload } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function MobileTopBar() {
  const { user } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 py-3">
      <Link to="/" className="flex items-center gap-2">
        <Logo size={22} />
        <span className="text-base font-extrabold tracking-tight">PUBLIC.</span>
      </Link>
      <div className="flex items-center gap-2">
        {user?.can_upload && (
          <Link
            to="/upload"
            className="px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload size={14} /> Upload
          </Link>
        )}
      </div>
    </header>
  );
}