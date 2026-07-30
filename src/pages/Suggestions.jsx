import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/EmptyState";
import SuggestionCard from "@/components/SuggestionCard";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
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
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState("recent");

  async function load() {
    setLoading(true);
    try {
      const rows = await base44.entities.Suggestion.list("-created_date", 100).catch(
        () => []
      );
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e?.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(s) {
    const meId = user?.id;
    if (!meId) return;
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
      setItems(prevItems);
    }
  }

  const hasVoted = (s) => !!user?.id && (s.voter_ids || []).includes(user.id);

  const sortedItems =
  sort === "top" ?
  [...items].sort(
    (a, b) =>
    (b.voter_ids?.length || 0) - (a.voter_ids?.length || 0)
  ) :
  items;

  return (
    <PullToRefresh onRefresh={load}>
      <div>
        <PageHeader
          eyebrow="Community Voice"
          title={
          <span className="flex items-center gap-2">
               Suggestions
            </span>
          }
          subtitle="PUBLIC is made by the people, for the people. Tell us what feature you'd love, the music you want to hear, or how this platform can be even better. Vote on ideas you care about." />
        

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
                  onClick={() => setCategory(c.id)}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short, punchy title"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium mb-2"
            maxLength={120} />
          
          <textarea
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

        {items.length > 0 &&
        <div className="flex items-center gap-1.5 mb-4">
            {[
          { id: "recent", label: "Recent" },
          { id: "top", label: "Top voted" }].
          map((opt) =>
          <button
            key={opt.id}
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
            {sortedItems.map((s) =>
          <SuggestionCard
            key={s.id}
            s={s}
            hasVoted={hasVoted(s)}
            onVote={() => vote(s)} />

          )}
          </div>
        }
      </div>
    </PullToRefresh>);

}