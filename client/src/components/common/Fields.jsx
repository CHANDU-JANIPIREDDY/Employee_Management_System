import { forwardRef } from 'react';
import { cn } from '../../utils/format';

export function Field({ label, error, required, children }) {
  return (
    <label className="block">
      {label ? (
        <span className="field-label">
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="field-message" role="alert">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ label, error, required, className, ...props }, ref) {
  return (
    <Field label={label} error={error} required={required}>
      <input ref={ref} className={cn('field', error && 'field-error', className)} {...props} />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, required, className, ...props }, ref) {
  return (
    <Field label={label} error={error} required={required}>
      <textarea ref={ref} className={cn('field min-h-24 resize-y', error && 'field-error', className)} {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, required, children, className, ...props }, ref) {
  return (
    <Field label={label} error={error} required={required}>
      <select ref={ref} className={cn('field', error && 'field-error', className)} {...props}>
        {children}
      </select>
    </Field>
  );
});
