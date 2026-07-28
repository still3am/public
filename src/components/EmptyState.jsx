export default function EmptyState({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 hidden">
      {Icon &&
      <div className="w-16 h-16 rounded-full bg-foreground/[0.04] grid place-items-center mb-4 hidden">
          <Icon size={28} className="text-foreground/40" />
        </div>
      }
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description &&
      <p className="text-sm text-foreground/50 max-w-sm mb-4">{description}</p>
      }
      {action}
    </div>);

}