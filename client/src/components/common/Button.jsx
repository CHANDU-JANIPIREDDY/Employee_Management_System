import { cn } from '../../utils/format';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
};

export function Button({ variant = 'primary', loading = false, children, className, ...props }) {
  return (
    <button className={cn(VARIANTS[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
