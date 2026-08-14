import { useBannerMessages } from "@/hooks/useBannerMessages";

function MarqueeItem({ text }) {
  return (
    <span className="px-6 text-[11px] font-semibold uppercase tracking-[0.25em] shrink-0">
      {text}
      <span className="px-6 text-background/30">·</span>
    </span>
  );
}

export default function ScrollingBanner() {
  const { messages } = useBannerMessages();

  // Two identical halves — the -50% translate snaps the second half
  // exactly where the first started, so the loop is seamless.  Each half
  // needs enough items to overflow the viewport on mobile (otherwise the
  // gap between the last item of half 1 and the first of half 2 is visible
  // mid-loop).  shrink-0 on each item prevents flex from squishing them.
  const half = Array.from({ length: 6 }).map((_, i) => messages[i % messages.length]);
  const items = [...half, ...half];

  return (
    <div className="w-full overflow-hidden bg-foreground text-background border-b border-border/40 select-none isolate relative z-10">
      <div className="flex whitespace-nowrap animate-marquee py-2 will-change-transform">
        {items.map((text, i) => (
          <MarqueeItem key={i} text={text} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-foreground to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-foreground to-transparent" />
    </div>
  );
}