export default function PageHeader({ eyebrow, title, subtitle, children }) {
  // The title is desktop-only: on mobile the sticky top bar already shows the
  // page name, so rendering it here too would print it twice.
  return (
    <div className="mb-7 md:mb-9">
      {eyebrow &&
      <div className="hidden md:block text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-2">
          {eyebrow}
        </div>
      }
      {title &&
      <h1 className="hidden md:block text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
      }
      {subtitle &&
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      }
      {children}
    </div>);
}