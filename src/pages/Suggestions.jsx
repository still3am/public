import {readAllPages} from "@/lib/readPages";
import LoadError from '@/components/LoadError';
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/EmptyState";
import SuggestionCard from "@/components/SuggestionCard";
import PullToRefresh from "@/components/PullToRefresh";
import {
  Lightbulb,
  Loader2,
  Sparkles,
  Music as MusicIcon,
  Wrench,
  MessageSquare } from
"lucide-react";

const CATEGORIES = [
{ id: "feature", label: "Feature idea", icon: Sparkles },
{ id: "music", label: "Music I want", icon: MusicIcon },
{ id: "improvement", label: "Improvement", icon: Wrench },
{ id: "other", label: "Other", icon: MessageSquare }];


export default function Suggestions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error,setError]=useState(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState("recent");
  const [filter,setFilter]=useState("all"),[query,setQuery]=useState("");
  const voteLocks=useRef(new Set()),submitLock=useRef(false),loadVersion=useRef(0);

  async function load() {
    const request=++loadVersion.current;setLoading(true);setError(false);
    try {
      const rows=await readAllPages(opts=>base44.entities.Suggestion.filter({},{sort:"-created_date",...opts}));
      if(request===loadVersion.current)setItems(rows);
    } catch {if(request===loadVersion.current)setError(true);
    } finally {
      if(request===loadVersion.current)setLoading(false);
    }
  }

  useEffect(() => {
    load();return()=>{loadVersion.current++;};
  }, []);

  async function submit(e) {
    e?.preventDefault();
    if (!title.trim() || !user?.id || submitLock.current) return;
    submitLock.current=true;setSubmitting(true);
    try {
      const created = await base44.entities.Suggestion.create({
        user_id: user?.id || "",
        user_name: user?.display_name || user?.full_name || "Anonymous",
        category,
        title: title.trim(),
        details: details.trim(),
        voter_ids: [user?.id].filter(Boolean)
      });
      setTitle("");
      setDetails("");
      setCategory("feature");
      setItems((prev) => [created, ...prev.filter(Boolean)]);
    } catch {window.dispatchEvent(new Event("public:error"));
    } finally {
      submitLock.current=false;setSubmitting(false);
    }
  }

  async function vote(s) {
    const meId = user?.id;
    if (!meId || voteLocks.current.has(s.id)) return;
    voteLocks.current.add(s.id);
    const voted = (s.voter_ids || []).includes(meId);
    const next = voted ?
    (s.voter_ids || []).filter((x) => x !== meId) :
    [...(s.voter_ids || []), meId];
    const prevItems = items;
    setItems((prev) =>
    prev.map((x) => x.id === s.id ? { ...x, voter_ids: next } : x)
    );
    try {
      const res = await base44.functions.invoke("voteSuggestion", {
        suggestion_id: s.id
      });
      if (res?.data?.voter_ids) {
        setItems((prev) =>
        prev.map((x) =>
        x.id === s.id ? { ...x, voter_ids: res.data.voter_ids } : x
        )
        );
      }
    } catch {
      setItems(current=>current.map(row=>row.id===s.id?{...row,voter_ids:s.voter_ids||[]}:row));
    }finally{voteLocks.current.delete(s.id);}
  }

  const hasVoted = (s) => !!user?.id && (s.voter_ids || []).includes(user.id);

  const sortedItems =
  sort === "top" ?
  [...items].sort(
    (a, b) =>
    (b.voter_ids?.length || 0) - (a.voter_ids?.length || 0)
  ) :
  items;

  const visibleItems=sortedItems.filter(item=>(filter==="all"||item.category===filter)&&(!query.trim()||[item.title,item.details,item.user_name].some(value=>(value||"").toLowerCase().includes(query.trim().toLowerCase()))));

  if(error&&!items.length)return <LoadError onRetry={load}/>;
  return (
    <PullToRefresh onRefresh={load}>
      <div className="collection-page suggestions-page">
        <header className="page-intro"><p className="eyebrow">PUBLIC</p><h1>Make PUBLIC better</h1><p>Share an idea. Support the ones you want to see.</p></header>

        

        <div className="suggestions-workspace">
        <aside className="suggestions-composer" aria-label="Share an idea">
        {!user &&
        <div className="rounded-2xl border border-border bg-card p-5 mb-8 text-center">
            <Lightbulb size={22} className="mx-auto text-foreground/40 mb-2" />
            <p className="text-sm font-semibold">Sign in to share an idea</p>
            <p className="text-xs text-foreground/50 mt-1 mb-3">
              Ideas are tied to your PUBLIC account so we can follow up on them.
            </p>
            <Link
            to="/login?returnTo=/suggestions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
              Sign in
            </Link>
          </div>
        }

        {user &&
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-4 mb-8">
          
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  aria-pressed={active} onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  active ?
                  "bg-foreground text-background" :
                  "border border-border text-foreground/60 hover:bg-foreground/5"}`
                  }>
                  
                  <Icon size={12} /> {c.label}
                </button>);

            })}
          </div>
          <input
            aria-label="Suggestion title" required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short, punchy title"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium mb-2"
            maxLength={120} />
          
          <textarea
            aria-label="Suggestion details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
            maxLength={800} />
          
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5">
              
              {submitting ?
              <Loader2 size={14} className="animate-spin" /> :

              <Lightbulb size={14} />
              }
              Submit idea
            </button>
          </div>
        </form>
        }

        </aside>
        <section className="suggestions-feed" aria-label="Community ideas">
        <div className="collection-tools"><input aria-label="Search suggestions" placeholder="Find an idea" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/><select aria-label="Filter suggestion category" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All ideas</option>{CATEGORIES.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}</select></div>
        {items.length > 0 &&
        <div className="flex items-center gap-1.5 mb-4">
            {[
          { id: "recent", label: "Recent" },
          { id: "top", label: "Top voted" }].
          map((opt) =>
          <button
            key={opt.id}
            aria-pressed={sort === opt.id}
            onClick={() => setSort(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            sort === opt.id ?
            "bg-foreground text-background border-foreground" :
            "border-border text-foreground/60 hover:bg-foreground/5"}`
            }>
            
                {opt.label}
              </button>
          )}
          </div>
        }

        {loading && !items.length ?
        <div className="py-16 grid place-items-center">
            <Loader2 className="animate-spin" />
          </div> :
        items.length === 0 ?
        <EmptyState
          icon={Lightbulb}
          title="No ideas yet"
          description="Be the first to share one." /> :


        <div className="space-y-2">
            {!visibleItems.length&&<div className="collection-empty"><h2>No matching ideas</h2><button className="playlist-action" onClick={()=>{setQuery("");setFilter("all");}}>Show all ideas</button></div>}
            {visibleItems.map((s) =>
          <SuggestionCard
            key={s.id}
            s={s}
            hasVoted={hasVoted(s)}
            onVote={() => vote(s)} />

          )}
          </div>
        }
        </section>
        </div>
      </div>
    </PullToRefresh>);

}