import { useId } from 'react';

export default function Input({ label, error, hint, icon: Icon, className = '', id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold tracking-wide text-muted">{label}</label>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint pointer-events-none" aria-hidden="true" />}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          className={`input ${Icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
