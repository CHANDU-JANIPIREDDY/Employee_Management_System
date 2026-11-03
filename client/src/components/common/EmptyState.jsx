export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" data-testid="empty-state">
      {Icon ? <Icon className="mb-3 h-8 w-8 text-slate-300" /> : null}
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
