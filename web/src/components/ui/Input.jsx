export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold tracking-wide" style={{ color: '#888' }}>{label}</label>
      )}
      <input
        className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors ${className}`}
        style={{
          backgroundColor: '#2a2a2a',
          border: error ? '1px solid #ef4444' : '1px solid #2e2e2e',
          color: '#f5f5f5',
        }}
        onFocus={(e) => { if (!error) e.target.style.borderColor = '#e91e8c'; }}
        onBlur={(e) => { if (!error) e.target.style.borderColor = '#2e2e2e'; }}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  );
}
