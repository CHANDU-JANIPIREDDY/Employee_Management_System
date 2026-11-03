import { useEffect, useRef, useState } from 'react';

export function Menu({ label = 'Actions', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn btn-ghost px-2 py-1 text-xs" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ children, onClick, danger = false }) {
  return (
    <button type="button" className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${danger ? 'text-rose-600' : 'text-slate-700'}`} onClick={onClick} role="menuitem">
      {children}
    </button>
  );
}
