import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Play,
  Heart,
  Users,
  Music,
  Loader2,
  TrendingUp,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { formatNumber } from "@/lib/audio-utils";
import EmptyState from "@/components/EmptyState";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-inset ring-border p-4">
      <div className="w-9 h-9 rounded-xl bg-foreground/[0.06] grid place-items-center mb-2.5">
        <Icon size={16} className="text-foreground/70" />
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs text-foreground/50 font-medium">{label}</div>
    </div>
  );
}

export default function ArtistDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [t, followsToMe] = await Promise.all([
          base44.entities.Track.filter({ uploader_id: user.id }, "-play_count", 100),
          base44.entities.Follow.filter({ following_id: user.id }, "-created_date", 1000),
        ]);
        if (cancelled) return;
        setTracks(t);
        setFollowers(followsToMe.length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (user?.is_artist !== true) {
    return (
      <div className="max-w-md mx-auto px-5 pt-16">
        <EmptyState
          icon={Sparkles}
          title="Artist mode is off"
          description="Turn on Artist Mode in your profile settings to unlock analytics and artist tools."
          action={
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold"
            >
              Go to Profile
            </Link>
          }
        />
      </div>
    );
  }

  const totalPlays = tracks.reduce((s, t) => s + (t.play_count || 0), 0);
  const totalLikes = tracks.reduce((s, t) => s + (t.like_count || 0), 0);
  const chartData = tracks
    .slice(0, 10)
    .map((t) => ({
      name: t.title.length > 14 ? t.title.slice(0, 14) + "…" : t.title,
      plays: t.play_count || 0,
      likes: t.like_count || 0,
    }))
    .filter((d) => d.plays > 0 || d.likes > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 pt-4 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full border border-border grid place-items-center shrink-0 hover:bg-foreground/5 transition"
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <TrendingUp size={22} /> Artist Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Play} label="Total Plays" value={formatNumber(totalPlays)} />
        <StatCard icon={Heart} label="Total Likes" value={formatNumber(totalLikes)} />
        <StatCard icon={Users} label="Followers" value={formatNumber(followers)} />
        <StatCard icon={Music} label="Tracks" value={formatNumber(tracks.length)} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-card ring-1 ring-inset ring-border p-4 mb-6">
          <h2 className="text-sm font-bold mb-4">Plays by Track</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-25}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--foreground))", fillOpacity: 0.05 }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="plays" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Track breakdown */}
      <div className="rounded-2xl bg-card ring-1 ring-inset ring-border p-4">
        <h2 className="text-sm font-bold mb-3">Track Breakdown</h2>
        {tracks.length === 0 ? (
          <p className="text-sm text-foreground/50 text-center py-8">
            No tracks uploaded yet. Upload your first track to see analytics.
          </p>
        ) : (
          <div className="space-y-1">
            {tracks.map((t, i) => (
              <Link
                key={t.id}
                to={`/track/${t.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition"
              >
                <span className="text-xs font-bold text-foreground/30 w-5 text-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-foreground/40">{t.genre}</div>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="inline-flex items-center gap-1 text-foreground/60">
                    <Play size={12} /> {formatNumber(t.play_count || 0)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-foreground/60">
                    <Heart size={12} /> {formatNumber(t.like_count || 0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}