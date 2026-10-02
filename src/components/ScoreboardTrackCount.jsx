import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music } from "lucide-react";
import { useUploadsEnabled } from "@/hooks/useUploadsEnabled";

function Digit({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => setDisplay(value), [value]);
  return (
    <span className="relative inline-flex h-12 w-8 md:h-16 md:w-11 overflow-hidden rounded-md shadow-inner">
      <span className="absolute inset-0 bg-gradient-to-b from-foreground/[0.10] to-foreground/[0.03] border border-foreground/15" />
      <span className="absolute left-0 right-0 top-1/2 h-px bg-foreground/[0.18] z-10 shadow-[0_1px_0_0_hsl(var(--background)/0.4)]" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          initial={{ y: "108%", opacity: 0.1 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-108%", opacity: 0.1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 grid place-items-center text-2xl md:text-3xl font-extrabold leading-none font-mono text-foreground">
          
          {display}
        </motion.span>
      </AnimatePresence>
    </span>);

}

export default function ScoreboardTrackCount({ count = 0 }) {
  const [padded, setPadded] = useState(() => String(count).padStart(4, "0"));
  const { enabled } = useUploadsEnabled();
  useEffect(() => {
    setPadded(String(count).padStart(4, "0"));
  }, [count]);
  const digits = padded.split("");
  const dotColor = enabled ? "bg-emerald-500" : "bg-red-500";
  const glow = enabled ? "shadow-emerald-500/70" : "shadow-red-500/70";
  const ringColor = enabled ? "bg-emerald-500/50" : "bg-red-500/50";
  return null;
















}