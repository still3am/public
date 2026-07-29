import { useAuth } from "@/lib/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import GenreTool from "@/components/admin/GenreTool";
import ReportsManager from "@/components/admin/ReportsManager";
import SuggestionsManager from "@/components/admin/SuggestionsManager";
import ApprovalsManager from "@/components/admin/ApprovalsManager";

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const handleBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav("/");
  };

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 pb-24">
      <div className="flex items-center gap-3 min-h-[3.5rem] py-3 mb-5 top-bar-safe">
        <button
          onClick={handleBack}
          className="tap-target rounded-full hover:bg-foreground/[0.06]"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
          <Shield size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight leading-tight">Admin Console</h1>
          <p className="text-xs text-foreground/50 truncate">Reports, suggestions & library tools</p>
        </div>
      </div>

      <div className="space-y-4">
        <ApprovalsManager />
        <GenreTool />
        <ReportsManager />
        <SuggestionsManager />
      </div>
    </div>
  );
}