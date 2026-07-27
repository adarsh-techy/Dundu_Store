const variants = {
  primary: { backgroundColor: '#e91e8c', color: '#fff', border: 'none' },
  outline: { backgroundColor: 'transparent', color: '#e91e8c', border: '1.5px solid #e91e8c' },
  ghost: { backgroundColor: 'transparent', color: '#bbb', border: 'none' },
  dark: { backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #2e2e2e' },
};

export default function Button({
  children, variant = 'primary', size = 'md',
  className = '', loading = false, fullWidth = false, style = {}, ...props
}) {
  const sizeClass = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }[size];

  return (
    <button
      className={`${sizeClass} ${fullWidth ? 'w-full' : ''} font-medium rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ ...variants[variant], ...style }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
