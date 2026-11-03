import { Button } from './Button';

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <span>{message}</span>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}
