/** @param {any} props */
export default function EmptyState({ title, description, action, icon: Icon }) {
  return (
    <div className="empty-state flex flex-col items-center justify-center text-center py-16 sm:py-20 px-6 rounded-3xl border border-dashed border-border/70 bg-card/40 hidden">
      {Icon &&
      <div className="w-14 h-14 rounded-2xl grid place-items-center bg-foreground/[0.05] text-foreground/35 mb-4">
          <Icon size={24} />
        </div>
      }
      {title &&
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      }
      {description &&
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-sm">{description}</p>
      }
      {action && <div className="mt-5">{action}</div>}
    </div>);

}