export default function PageHeader({ eyebrow, title, subtitle, children }) {
  if (!eyebrow && !title && !subtitle && !children) return null;
  return (
    <div className="mb-6 md:mb-8">
      {eyebrow &&
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-2">
          {eyebrow}
        </div>
      }
      {title &&
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
      }
      {subtitle &&
      <p className="text-sm text-foreground/60 max-w-2xl mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      }
      {children}
    </div>);
}