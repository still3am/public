import { useEffect, useState } from "react";
import { ShieldCheck, Music2, Flag, Lightbulb, Wand2, Ban, CloudSun } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import ApprovalsManager from "@/components/admin/ApprovalsManager";
import SuggestionsManager from "@/components/admin/SuggestionsManager";
import ReportsManager from "@/components/admin/ReportsManager";
import GenreTool from "@/components/admin/GenreTool";
import UploadSwitch from "@/components/admin/UploadSwitch";
import WeatherPreview from "@/components/admin/WeatherPreview";

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("approvals");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (user !== undefined && user !== null && user.role !== "admin") {
      setDenied(true);
    }
  }, [user]);

  const tabs = [
    { id: "approvals", icon: ShieldCheck, label: "Approvals" },
    { id: "reports", icon: Flag, label: "Reports" },
    { id: "suggestions", icon: Lightbulb, label: "Suggestions" },
    { id: "genre", icon: Wand2, label: "Genre Tool" },
    { id: "uploads", icon: Ban, label: "Uploads" },
    { id: "weather", icon: CloudSun, label: "Weather Preview" }
  ];

  return (
    <div className="min-h-dvh pb-24 md:pb-12">
      <BackHeader title="Admin" />

      {denied ? (
        <div className="max-w-3xl mx-auto px-5 mt-20 text-center text-muted-foreground">
          <Music2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">You don't have access to this area.</p>
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-30 -mx-2 px-2 pt-2 pb-2 bg-background/80 backdrop-blur border-b border-border tab-strip flex gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map(t => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-4">
            {tab === "approvals" && <ApprovalsManager />}
            {tab === "reports" && <ReportsManager />}
            {tab === "suggestions" && <SuggestionsManager />}
            {tab === "genre" && <GenreTool />}
            {tab === "uploads" && <UploadSwitch />}
            {tab === "weather" && (
              <div className="space-y-3">
                <p className="text-sm text-foreground/55">
                  Tap a condition to preview the live hero weather animations.
                </p>
                <WeatherPreview />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}