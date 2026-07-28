import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Wand2, Loader2 } from "lucide-react";

export default function GenreTool() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);

  async function run(force = false) {
    if (busy) return;
    setBusy(true);
    setInfo(null);
    let total = 0;
    try {
      while (true) {
        const res = await base44.functions.invoke("classifyGenres", { force });
        const d = res?.data || {};
        total += d.processed || 0;
        setInfo({ total, done: !d.has_more });
        if (!d.has_more) break;
      }
      toast({ title: `Classified ${total} track${total !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Classification failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return null;







































}