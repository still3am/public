import { useMixEngine } from "@/hooks/useMixEngine";
import MixDeck from "@/components/mix/MixDeck";
import Crossfader from "@/components/mix/Crossfader";
import { Headphones } from "lucide-react";

export default function MixTable() {
  const engine = useMixEngine();

  return (
    <div className="px-4 pt-6 pb-32 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-foreground/5 grid place-items-center">
          <Headphones size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-none">Mix Table</h1>
          <p className="text-sm text-muted-foreground">Load any two tracks and blend them live.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <MixDeck index={0} label="DECK A" engine={engine} />
        <MixDeck index={1} label="DECK B" engine={engine} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card/50 backdrop-blur p-4">
        <Crossfader value={engine.crossfader} onChange={engine.setCrossfader} />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Tip: drag the crossfader to blend the decks — center keeps both at equal power.
      </p>
    </div>
  );
}