export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-7 md:mb-9">
      {eyebrow &&
      <div className="text-[11px] uppercase tracking-[0.22em] text-foreground/40 font-semibold mb-2 hidden">
          {eyebrow}
        </div>
      }
      <div className="flex items-end justify-between gap-4 flex-wrap">
        








        
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>);

}