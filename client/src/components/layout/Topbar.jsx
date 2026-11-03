import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeeService, notificationService } from '../../services';
import { useDebounce } from '../../hooks/useDebounce';
import { timeAgo } from '../../utils/format';
import { Avatar } from '../common/Avatar';

export function Topbar({ collapsed, onToggleCollapse, onOpenMobile }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => notificationService.list({ limit: 8 }).then((body) => {
      if (!active) return;
      setNotes(body.data || []);
      setUnread(body.unreadCount || 0);
    }).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (user?.role !== 'ADMIN' || debounced.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    let active = true;
    employeeService.list({ search: debounced.trim(), limit: 5 }).then((body) => {
      if (active) setResults(body.data || []);
    }).catch(() => {
      if (active) setResults([]);
    });
    return () => { active = false; };
  }, [debounced, user?.role]);

  async function markOne(note) {
    if (!note.read) {
      await notificationService.read(note.id);
      setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, read: true } : item)));
      setUnread((count) => Math.max(0, count - 1));
    }
    setNotesOpen(false);
    if (note.link) navigate(note.link);
  }

  async function markAll() {
    await notificationService.readAll();
    setNotes((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onOpenMobile} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <button className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:inline-flex" onClick={onToggleCollapse} aria-label="Toggle sidebar">
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
      {user?.role === 'ADMIN' ? (
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9"
            placeholder="Search employees by name, ID, or email"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Search employees"
          />
          {searchOpen && results.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {results.map((employee) => (
                <button
                  key={employee.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery('');
                    navigate(`/employees/${employee.id}`);
                  }}
                >
                  <span>
                    <span className="font-medium text-slate-800">{employee.fullName}</span>
                    <span className="ml-2 text-slate-400">{employee.employeeId}</span>
                  </span>
                  <span className="text-xs text-slate-400">{employee.department?.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : <div className="flex-1" />}
      <p className="hidden text-sm text-slate-500 lg:block">{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(now)}</p>
      <div className="relative">
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications" onClick={() => setNotesOpen((open) => !open)}>
          <Bell className="h-5 w-5" />
          {unread > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">{unread}</span> : null}
        </button>
        {notesOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600" onClick={markAll}>
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notes.length === 0 ? <p className="px-3 py-6 text-center text-sm text-slate-500">You're all caught up.</p> : notes.map((note) => (
                <button key={note.id} className="flex w-full gap-3 px-3 py-3 text-left hover:bg-slate-50" onClick={() => markOne(note)}>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${note.read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{note.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{note.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(note.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative">
        <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-50" onClick={() => setMenuOpen((open) => !open)}>
          <Avatar name={user?.name} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-4 text-slate-800">{user?.name}</span>
            <span className="block text-xs text-slate-400">{user?.role === 'ADMIN' ? 'Admin' : 'Employee'}</span>
          </span>
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Profile</button>
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Settings</button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
