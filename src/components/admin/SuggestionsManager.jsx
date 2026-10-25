import {reportActionError} from "@/lib/actionError";
import {setAdminSuggestionStatus} from '@/lib/adminData';
import {readAdminRows} from "@/lib/adminData";
import { useEffect, useState, useRef } from "react";
import { adminDatabase } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Lightbulb, Loader2, Trash2 } from "lucide-react";
import BottomSheetSelect from "@/components/BottomSheetSelect";

const STATUSES = ["open", "reviewing", "planned", "in_progress", "done"];

export default function SuggestionsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [error,setError]=useState(false);
  const [busy, setBusy] = useState("");
  const lock=useRef(false),version=useRef(0);

  async function load() {
    const request=++version.current;setError(false);try {
      const r=await readAdminRows(adminDatabase,"Suggestion",{},"-created_date");
      if(request===version.current)setItems(r);
    } catch {
      if(request===version.current){setError(true);setItems(previous=>previous===null?[]:previous);}
    }
  }

  useEffect(() => { load();return()=>{version.current++;}; }, []);

  async function setStatus(id, status) {
    if(lock.current)return;
    lock.current=true;version.current++;setBusy(id);
    try {
      const saved=await setAdminSuggestionStatus(adminDatabase,id,status);
      setItems((prev) => (prev || []).map((s) => (s.id === id ? { ...s,...saved } : s)));
      toast({ title: saved.notificationPending ? 'Status saved · some notifications need a retry' : 'Status updated' });
    } catch(error) {reportActionError(error,"Couldn’t update this suggestion. Please try again.");} finally {
      lock.current=false;setBusy("");
    }
  }

  async function remove(id) {
    if(lock.current||!window.confirm("Delete this completed suggestion?"))return;
    lock.current=true;version.current++;setBusy(id);
    try {
      await adminDatabase.entities.Suggestion.delete(id);
      setItems((prev) => (prev || []).filter((s) => s.id !== id));
      toast({ title: "Suggestion deleted" });
    } catch(error) {reportActionError(error,"Couldn’t update this suggestion. Please try again.");} finally {
      lock.current=false;setBusy("");
    }
  }

  const list = items || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb size={15} /> Suggestions
        </div>
        <button disabled={!!busy} onClick={load} className="text-xs text-foreground/50 hover:text-foreground">Refresh</button>
      </div>
      {error&&<p role="alert" className="text-sm mb-4">Suggestions could not load. Use Refresh to retry.</p>}
      {items === null ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-foreground/40" /></div>
      ) : list.length === 0 ? (
        <div className="text-xs text-foreground/50 py-6 text-center">{error?"Suggestions unavailable.":"No suggestions yet."}</div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="p-3 rounded-lg bg-foreground/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  {s.notificationPending&&<button className="text-xs underline min-h-11" disabled={!!busy} onClick={()=>setStatus(s.id,s.status)}>Retry completion notifications</button>}
                  {s.details && <div className="text-xs text-foreground/50 mt-0.5 line-clamp-2">{s.details}</div>}
                  <div className="text-[11px] text-foreground/40 mt-1">
                    {s.user_name || "Anonymous"} · {s.category} · {s.voter_ids?.length || 0} votes
                  </div>
                </div>
                {busy === s.id ? (
                  <Loader2 size={15} className="animate-spin shrink-0" />
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <BottomSheetSelect
                      value={s.status}
                      options={STATUSES}
                      onChange={(v) => setStatus(s.id, v)}
                      className="text-xs px-2 capitalize"
                    />
                    {s.status === "done" && (
                      <button
                        onClick={() => remove(s.id)}
                        className="w-7 h-7 rounded-full grid place-items-center text-destructive hover:bg-destructive/10 transition active:scale-95"
                        aria-label="Delete suggestion"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}