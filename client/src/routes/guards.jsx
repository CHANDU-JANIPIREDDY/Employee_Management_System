import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/Spinner';

function ScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7fb]">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Spinner className="h-5 w-5 text-indigo-600" />
        Loading workspace
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <ScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children || <Outlet />;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <ScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <ScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
