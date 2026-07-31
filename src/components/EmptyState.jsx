export default function EmptyState({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl grid place-items-center bg-foreground/[0.05] text-foreground/35 mb-4">
          <Icon size={24} />
        </div>
      )}
      {title && (
        <h3 className="text-base font-bold text-foreground">{title}</h3>
      )}
      {description && (
        <p className="mt-1.5 text-sm text-foreground/55 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}