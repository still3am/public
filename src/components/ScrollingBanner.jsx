export default function ScrollingBanner() {
  const text = "Made by the people, for the people.";
  return (
    <div className="w-full overflow-hidden bg-foreground text-background border-b border-border/40 select-none isolate relative z-10">
      <div className="flex whitespace-nowrap animate-marquee py-1.5 will-change-transform">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="text-[11px] font-semibold uppercase tracking-[0.25em] px-6">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}