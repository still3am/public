import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import BackHeader from "@/components/BackHeader";
import AdminStats from "@/components/admin/AdminStats";
import GenreTool from "@/components/admin/GenreTool";
import ReportsManager from "@/components/admin/ReportsManager";
import SuggestionsManager from "@/components/admin/SuggestionsManager";

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStats = useCallback(async () => {
    if (user?.role !== "admin") { setLoading(false); return; }
    setLoading(true);
    try {
      const [tracks, users, reports, suggestions, playlists, unclassified] = await Promise.all([
        base44.entities.Track.filter({}, "-created_date", 500).catch(() => []),
        base44.entities.User.list("-created_date", 500).catch(() => []),
        base44.entities.Report.filter({ status: "pending" }, "-created_date", 200).catch(() => []),
        base44.entities.Suggestion.filter({ status: "open" }, "-created_date", 200).catch(() => []),
        base44.entities.Playlist.filter({}, "-created_date", 200).catch(() => []),
        base44.entities.Track.filter({ genre: "Other" }, "-created_date", 500).catch(() => []),
      ]);
      setStats({
        tracks: tracks.length,
        users: users.length,
        pendingReports: reports.length,
        openSuggestions: suggestions.length,
        playlists: playlists.length,
        unclassified: unclassified.length,
      });
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 pb-24">
      <BackHeader title="Admin" />
      <AdminStats stats={stats} loading={loading} onRefresh={loadStats} lastUpdated={lastUpdated} />
      <div className="mt-4 space-y-4">
        <GenreTool onChanged={loadStats} />
        <ReportsManager onChanged={loadStats} />
        <SuggestionsManager onChanged={loadStats} />
      </div>
    </div>
  );
}