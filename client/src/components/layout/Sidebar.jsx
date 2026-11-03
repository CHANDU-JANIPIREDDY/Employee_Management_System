import { NavLink } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CircleUserRound,
  Clock3,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, testId: 'nav-dashboard' },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['ADMIN'], testId: 'nav-employees' },
  { to: '/attendance', label: 'Attendance', icon: Clock3, testId: 'nav-attendance' },
  { to: '/leaves', label: 'Leave Management', icon: CalendarDays, testId: 'nav-leaves' },
  { to: '/departments', label: 'Departments', icon: Building2, roles: ['ADMIN'], testId: 'nav-departments' },
  { to: '/profile', label: 'Profile', icon: CircleUserRound, testId: 'nav-profile' },
  { to: '/settings', label: 'Settings', icon: Settings, testId: 'nav-settings' },
];

export function Sidebar({ collapsed, mobileOpen, onNavigate, onLogout }) {
  const { user } = useAuth();
  const items = ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-950 text-slate-300 transition-all duration-200',
      collapsed ? 'w-[76px]' : 'w-[260px]',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      <div className={cn('flex items-center gap-3 px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500 text-sm font-semibold text-white">S</div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Smart HR</p>
            <p className="truncate text-xs text-slate-400">Employee system</p>
          </div>
        ) : null}
        <button className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-white/5 lg:hidden" onClick={onNavigate} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              data-testid={item.testId}
              onClick={onNavigate}
              className={({ isActive }) => cn('nav-link', collapsed && 'justify-center px-2', isActive && 'nav-link-active')}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3">
        <button type="button" data-testid="nav-logout" title="Logout" onClick={onLogout} className={cn('nav-link w-full', collapsed && 'justify-center px-2')}>
          <LogOut className="h-5 w-5" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}
