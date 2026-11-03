import { Button } from './Button';

export function Pagination({ page, totalPages, total, onPage }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>{total} result{total === 1 ? '' : 's'}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="page-prev">Previous</Button>
        <span className="min-w-16 text-center text-slate-700">Page {page} of {totalPages}</span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)} data-testid="page-next">Next</Button>
      </div>
    </div>
  );
}
