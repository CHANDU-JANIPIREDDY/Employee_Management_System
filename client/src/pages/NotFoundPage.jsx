import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7fb] px-6">
      <div className="text-center">
        <p className="text-sm font-medium text-indigo-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">That screen is not part of the workspace.</p>
        <Link className="btn btn-primary mt-6" to="/">Back to dashboard</Link>
      </div>
    </div>
  );
}
