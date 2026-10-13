import LoadError from '@/components/LoadError';
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer } from
"recharts";
import {
  Play,
  Heart,
  Users,
  Music,
  Loader2,
  ArrowLeft,
  Sparkles } from
"lucide-react";
import { formatNumber } from "@/lib/audio-utils";
import { readAllPages } from "@/lib/readPages";
import EmptyState from "@/components/EmptyState";

/** @param {any} props */
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-inset ring-border p-4">
      <div className="w-9 h-9 rounded-xl bg-foreground/[0.06] grid place-items-center mb-2.5">
        <Icon size={16} className="text-foreground/70" />
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs text-foreground/50 font-medium">{label}</div>
    </div>);

}

export default function ArtistDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loaded,setLoaded]=useState(false);
  const [tracks, setTracks] = useState([]);
  const [totals, setTotals] = useState(null);
  const [followers, setFollowers] = useState(null);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("plays");
  const visibleTracks=useMemo(()=>{const term=query.trim().toLowerCase();const rows=tracks.filter(t=>!term||[t.title,t.genre,t.artist].some(value=>(value||"").toLowerCase().includes(term)));rows.sort((a,b)=>sort==="likes"?(b.like_count||0)-(a.like_count||0):sort==="title"?(a.title||"").localeCompare(b.title||""):(b.play_count||0)-(a.play_count||0));return rows;},[tracks,query,sort]);
  const [error,setError]=useState(false),[retry,setRetry]=useState(0);

  useEffect(() => {
    if (!user?.is_artist){setLoading(false);return;}
    let cancelled = false;setError(false);setLoading(true);
    async function load() {
      try {
        const [t, sums, followerCount] = await Promise.all([
        // Every upload follows the server cursor, so the track list and the
        // chart aren't cut off at one page.
        readAllPages((options) =>
        base44.entities.Track.filter(
          { uploader_id: user.id },
          { sort: "-play_count", ...options }
        )
        ),
        // Plays and likes are summed on the server over ALL of the artist's
        // songs, so the headline numbers don't stop at the first page either.
        base44.entities.Track.aggregate({
          query: { uploader_id: user.id },
          sum: ["play_count", "like_count"]
        }).catch(()=>null),
        base44.entities.Follow.count({ following_id: user.id }).catch(()=>null)]
        );
        if (cancelled) return;
        setTracks(t);setLoaded(true);
        setTotals(sums?.rows?.[0] || null);
        setFollowers(followerCount);
      } catch {if(!cancelled)setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id,user?.is_artist,retry]);

  if(error&&!loaded)return <LoadError onRetry={()=>setRetry(n=>n+1)}/>;
  if (loading&&!loaded) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }

  if (user?.is_artist !== true) {
    return (
      <div className="max-w-md mx-auto pt-16">
        <EmptyState
          icon={Sparkles}
          title="Artist mode is off"
          description="Turn on Artist Mode in your profile settings to unlock analytics and artist tools."
          action={
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold">
            
              Go to Profile
            </Link>
          } />
        
      </div>);

  }

  const totalPlays =
  totals?.sum_play_count ?? tracks.reduce((s, t) => s + (t.play_count || 0), 0);
  const totalLikes =
  totals?.sum_like_count ?? tracks.reduce((s, t) => s + (t.like_count || 0), 0);
  const chartData = tracks.
  slice(0, 10).
  map((t) => ({
    name: (t.title||"Untitled").length > 14 ? (t.title||"Untitled").slice(0, 14) + "…" : t.title||"Untitled",
    plays: t.play_count || 0,
    likes: t.like_count || 0
  })).
  filter((d) => d.plays > 0 || d.likes > 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full border border-border grid place-items-center shrink-0 hover:bg-foreground/5 transition"
          aria-label="Back to profile">
          
          <ArrowLeft size={18} />
        </Link>
        <h1 className="min-w-0 flex-1 text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
           Artist Dashboard
        </h1>
        <button aria-label="Refresh artist analytics" className="playlist-action ml-auto text-xs" disabled={loading} onClick={()=>setRetry(value=>value+1)}>{loading?"Refreshing…":"Refresh"}</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Play} label="Total Plays" value={formatNumber(totalPlays)} />
        <StatCard icon={Heart} label="Total Likes" value={formatNumber(totalLikes)} />
        <StatCard icon={Users} label="Followers" value={followers===null?"—":formatNumber(followers)} />
        <StatCard icon={Music} label="Tracks" value={formatNumber(tracks.length)} />
      </div>

      {/* Chart */}
      {chartData.length > 0 &&
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
              interval={0} />
            
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
              cursor={{ fill: "hsl(var(--foreground))", fillOpacity: 0.05 }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12
              }} />
            
              <Bar dataKey="plays" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }

      {/* Track breakdown */}
      <div className="rounded-2xl bg-card ring-1 ring-inset ring-border p-4">
        <h2 className="text-sm font-bold mb-3">Track Breakdown</h2><div className="collection-tools"><input aria-label="Search track analytics" placeholder="Search your tracks" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Sort track analytics" value={sort} onChange={e=>setSort(e.target.value)}><option value="plays">Most played</option><option value="likes">Most liked</option><option value="title">Title A–Z</option></select></div>
        {tracks.length === 0 ?
        <p className="text-sm text-foreground/50 text-center py-8">
            No tracks uploaded yet. Upload your first track to see analytics.
          </p> :

        <div className="space-y-1">
            {visibleTracks.map((t, i) =>
          <Link
            key={t.id}
            to={`/track/${t.id}`}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition">
            
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
          )}
          </div>
        }
      </div>
    </div>);

}