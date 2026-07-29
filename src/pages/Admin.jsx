import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import AdminStats from "@/components/admin/AdminStats";
import CreditsCard from "@/components/admin/CreditsCard";
import UsersManager from "@/components/admin/UsersManager";
import ApprovalsManager from "@/components/admin/ApprovalsManager";
import ReportsManager from "@/components/admin/ReportsManager";
import SuggestionsManager from "@/components/admin/SuggestionsManager";
import GenreTool from "@/components/admin/GenreTool";
import { ShieldAlert } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();

  if (user && user.role !== "admin") {
    return (
      <div className="px-4 md:px-8 main-content">
        <BackHeader title="Admin" />
        <div className="py-20 text-center">
          <ShieldAlert className="mx-auto mb-3 text-foreground/30" size={32} />
          <p className="text-sm text-foreground/60">This area is for admins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 main-content">
      <BackHeader title="Admin" />

      <div className="space-y-4 max-w-4xl">
        <AdminStats />
        <CreditsCard />
        <ApprovalsManager />
        <ReportsManager />
        <UsersManager />
        <SuggestionsManager />
        <GenreTool />
      </div>
    </div>
  );
}