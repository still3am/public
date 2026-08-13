import { Star } from "lucide-react";

const MESSAGES = [
  "Made by the people, for the people.",
  "New Music Weekly",
];

function MarqueeItem({ text, icon }) {
  return (
    <span className="inline-flex items-center gap-3 px-6 text-[11px] font-semibold uppercase tracking-[0.25em]">
      {text}
      {icon}
    </span>
  );
}

export default function ScrollingBanner() {
  const items = [];
  for (let i = 0; i < 8; i++) {
    const msg = MESSAGES[i % MESSAGES.length];
    items.push(
      <MarqueeItem
        key={i}
        text={msg}
        icon={
          <Star
            size={9}
            className="fill-background/60 text-background/60 shrink-0"
            strokeWidth={0}
          />
        }
      />
    );
  }

  return (
    <div className="w-full overflow-hidden bg-foreground text-background border-b border-border/40 select-none isolate relative z-10">
      <div className="flex whitespace-nowrap animate-marquee py-2 will-change-transform">
        {items}
      </div>
      {/* edge fades for a cleaner scroll loop */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-foreground to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-foreground to-transparent" />
    </div>
  );
}