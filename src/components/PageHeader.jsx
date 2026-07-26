export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="mb-7 md:mb-9">
      {eyebrow &&
      <div className="text-[11px] uppercase tracking-[0.22em] text-foreground/40 font-semibold mb-2 hidden">
          {eyebrow}
        </div>
      }
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0 hidden">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-[1.05]">
            {title}
          </h1>
          {subtitle &&
          <p className="text-sm md:text-base text-foreground/55 mt-2 max-w-xl">
              {subtitle}
            </p>
          }
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>);

}