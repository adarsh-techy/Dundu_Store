export default function Input({ label, error, className = '', labelClassName = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className={`text-xs font-medium uppercase tracking-wide ${labelClassName || 'text-gray-600'}`}>{label}</label>}
      <input
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'} bg-white ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>}
      <select
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'} bg-white ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>}
      <textarea
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none ${error ? 'border-red-400' : 'border-gray-200 focus:border-indigo-500'} bg-white ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
