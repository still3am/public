import { loadAdminMembers } from '@/lib/adminMembers';
import { adminDatabase } from '@/api/base44Client';
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutDashboard, Music2, Flag, Users, LifeBuoy, Settings2, ChevronRight, RefreshCw, Loader2, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import "@/components/admin/admin-dashboard.css";

const MusicRequests = lazy(() => import("@/pages/MusicRequests"));
const Music = lazy(() => import("@/components/admin/ApprovalsManager"));
const Reports = lazy(() => import("@/components/admin/ReportsManager"));
const Members = lazy(() => import("@/components/admin/UsersManager"));
const Support = lazy(() => import("@/components/admin/SupportInbox"));
const Feedback = lazy(() => import("@/components/admin/SuggestionsManager"));
const Uploads = lazy(() => import("@/components/admin/UploadSwitch"));
const Banner = lazy(() => import("@/components/admin/BannerEditor"));
const SECTIONS = [
{ id: "overview", label: "Overview", icon: LayoutDashboard, description: "What needs your attention." },
{ id: "music", label: "Music", icon: Music2, description: "Review uploads and manage music on PUBLIC." },
{ id: "requests", label: "Music Requests", icon: Music2, description: "See the songs listeners want and link approved recordings." },
{ id: "reports", label: "Reports", icon: Flag, description: "Review reported content and protect the community." },
{ id: "members", label: "Members", icon: Users, description: "Find accounts and manage community access." },
{ id: "support", label: "Support", icon: LifeBuoy, description: "Help members and review their feedback." },
{ id: "settings", label: "Settings", icon: Settings2, description: "Control uploads and the app announcement banner." }];

const METRICS = [
{ key: "pending", label: "Awaiting approval", section: "music", icon: Music2 },
{ key: "reports", label: "Open reports", section: "reports", icon: Flag },
{ key: "support", label: "Support requests", section: "support", icon: LifeBuoy },
{ key: "members", label: "Registered members", section: "members", icon: Users }];

function Dashboard() {
  const [params, setParams] = useSearchParams(),[stats, setStats] = useState({}),[loading, setLoading] = useState(false),[failed, setFailed] = useState(false),[feedback, setFeedback] = useState(false);
  const version = useRef(0),section = SECTIONS.find((item) => item.id === params.get("section")) || SECTIONS[0];
  const choose = (id) => {setParams(id === "overview" ? {} : { section: id });};
  async function refresh() {
    const request = ++version.current;setLoading(true);setFailed(false);
    const results = await Promise.allSettled([base44.entities.Track.count({ approval_status: "pending" }), base44.entities.Report.count({ status: "pending" }), base44.entities.SupportTicket.count({ status: "open" }), loadAdminMembers(adminDatabase).then((rows) => rows.length)]);
    if (request !== version.current) return;
    setStats((previous) => {const next = { ...previous };results.forEach((result, index) => {if (result.status === "fulfilled" && typeof result.value === "number") next[METRICS[index].key] = result.value;});return next;});
    setFailed(results.some((result) => result.status === "rejected"));setLoading(false);
  }
  useEffect(() => {if (section.id === "overview") refresh();return () => {version.current++;};}, [section.id]);
  return <div className="admin-workspace">
  <header className="admin-workspace-header"><div><p className="eyebrow"><ShieldCheck size={13} className="hidden" />PUBLIC ADMIN</p><h1>Keep PUBLIC moving.</h1><p>Your community. The essentials, in one place.</p></div><Link to="/">View PUBLIC<ArrowUpRight size={16} /></Link></header>
  <div className="admin-workspace-layout"><nav className="admin-section-nav" aria-label="Admin sections">{SECTIONS.map((item) => <button type="button" key={item.id} onClick={() => choose(item.id)} aria-current={section.id === item.id ? "page" : undefined}><item.icon size={18} /><span>{item.label}</span></button>)}</nav>
   <div className="admin-workspace-main"><header className="admin-section-heading"><div><h2>{section.label}</h2><p>{section.description}</p></div>{section.id === "overview" && <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh dashboard counts"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>}</header>
    {section.id === "overview" ? <>
     {failed && <p className="admin-refresh-note" role="status">Some counts couldn’t refresh. Open a section to review it or try Refresh.</p>}
     <div className="admin-metrics">{METRICS.map((metric) => <button type="button" key={metric.key} onClick={() => choose(metric.section)}><metric.icon size={19} /><strong>{typeof stats[metric.key] === "number" ? stats[metric.key].toLocaleString() : "—"}</strong><span>{metric.label}<ChevronRight size={14} /></span></button>)}</div>
     <section className="admin-quick-actions"><h3>Start here</h3>{[{ id: "music", title: "Review music", copy: "Approve submissions or take a release off PUBLIC." }, { id: "reports", title: "Review reports", copy: "Investigate reported tracks, artists, and profiles." }, { id: "support", title: "Help a member", copy: "Read requests and post private replies." }].map((action) => <button key={action.id} onClick={() => choose(action.id)}><span><strong>{action.title}</strong><small>{action.copy}</small></span><ChevronRight size={18} /></button>)}</section>
     <Link className="admin-recovery-link" to="/unfinished-uploads"><Music2 size={19} /><span><strong>Unfinished uploads</strong><small>Find music that still needs release details.</small></span><ArrowUpRight size={18} /></Link>
    </> : <Suspense fallback={<div className="admin-panel-loading"><Loader2 size={22} className="animate-spin" /><span>Opening {section.label.toLowerCase()}…</span></div>}>
     {section.id === "music" && <Music />}{section.id === "requests" && <MusicRequests embedded />}{section.id === "reports" && <Reports />}{section.id === "members" && <Members />}
     {section.id === "support" && <><div className="admin-support-switch" role="group" aria-label="Support view"><button aria-pressed={!feedback} onClick={() => setFeedback(false)}>Requests</button><button aria-pressed={feedback} onClick={() => setFeedback(true)}>Suggestions</button></div>{feedback ? <Feedback /> : <Support />}</>}
     {section.id === "settings" && <div className="admin-settings-grid"><section><h3>Upload access</h3><Uploads /></section><section><h3>Announcements</h3><Banner /></section></div>}
    </Suspense>}
   </div>
  </div>
 </div>;
}
export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <div className="py-12 grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (user?.role !== "admin") return <div className="p-8 text-center"><p>You do not have access to this area.</p><Link to="/" className="underline">Return home</Link></div>;
  return <Dashboard key={user.id} />;
}