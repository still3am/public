import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music } from "lucide-react";

function Digit({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => setDisplay(value), [value]);
  return (
    <span className="relative inline-flex h-8 w-5 md:h-10 md:w-7 overflow-hidden">
      <span className="absolute inset-0 bg-foreground/[0.06] rounded-[4px] border border-foreground/10" />
      <span className="absolute left-0 right-0 top-1/2 h-px bg-foreground/[0.12] z-10" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          initial={{ y: "105%", opacity: 0.2 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-105%", opacity: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 grid place-items-center text-[1.1rem] md:text-xl font-extrabold leading-none font-mono text-foreground"
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function ScoreboardTrackCount({ count = 0 }) {
  const [padded, setPadded] = useState(() => String(count).padStart(4, "0"));
  useEffect(() => {
    setPadded(String(count).padStart(4, "0"));
  }, [count]);
  const digits = padded.split("");
  return (
    <div className="inline-flex items-center gap-2.5 md:gap-3 px-3.5 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 tabular-nums shadow-sm">
      <span className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-emerald-500/50 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/70" />
      </span>
      <span className="flex gap-[3px]">
        {digits.map((d, i) => (
          <Digit key={i} value={d} />
        ))}
      </span>
      <span className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-foreground/70">
        <Music size={13} className="hidden sm:block" />
        <span>{count === 1 ? "track" : "tracks"}</span>
      </span>
    </div>
  );
}