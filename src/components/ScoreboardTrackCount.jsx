import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music } from "lucide-react";

function Digit({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => setDisplay(value), [value]);
  return (
    <span className="relative inline-flex h-7 w-5 md:h-9 md:w-7 overflow-hidden font-mono">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 grid place-items-center text-[1.05rem] md:text-2xl font-extrabold leading-none">
          
          {display}
        </motion.span>
      </AnimatePresence>
    </span>);

}

export default function ScoreboardTrackCount({ count = 0 }) {
  const digits = String(count).split("");
  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-foreground/[0.04] border border-foreground/10 tabular-nums">
      
      <span className="text-[1.05rem] md:text-2xl font-extrabold font-mono leading-none flex">
        {digits.map((d, i) =>
        <Digit key={i} value={d} />
        )}
      </span>
      <span className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-foreground/70">
        
        <span>{count === 1 ? "track" : "tracks"}</span>
      </span>
    </div>);

}