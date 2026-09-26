export default function Spinner({ size = 'md', className = '', inline = false }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  const svg = (
    <svg className={`animate-spin ${s} text-primary`} fill="none" viewBox="0 0 24 24" role="status" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
  if (inline) return svg;
  return <div className={`flex justify-center items-center py-16 ${className}`}>{svg}</div>;
}
