import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/format';

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ems-sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem('ems-sidebar-collapsed', String(!value));
      return !value;
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {mobileOpen ? <button className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div className={cn('min-h-screen transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]')}>
        <Topbar collapsed={collapsed} onToggleCollapse={toggleCollapsed} onOpenMobile={() => setMobileOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="page-enter mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
