export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="space-y-3 p-4" data-testid="loading-skeleton">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, column) => <Skeleton key={column} className="h-8" />)}
        </div>
      ))}
    </div>
  );
}
