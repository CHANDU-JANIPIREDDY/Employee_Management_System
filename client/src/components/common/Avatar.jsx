import { useState } from 'react';
import { cn, colorFromName, initials } from '../../utils/format';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export function Avatar({ name, src, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={cn('rounded-full object-cover', SIZES[size])}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', SIZES[size])}
      style={{ backgroundColor: colorFromName(name) }}
    >
      {initials(name)}
    </span>
  );
}
