const colors = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  red: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
