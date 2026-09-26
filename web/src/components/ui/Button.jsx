const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-deep shadow-[0_8px_24px_-10px_rgba(233,30,140,.7)]',
  secondary: 'bg-elevated text-ink border border-line hover:border-line-strong',
  outline: 'bg-transparent text-primary border border-primary/70 hover:bg-primary/10',
  ghost: 'bg-transparent text-ink-2 hover:bg-white/5 hover:text-ink',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  white: 'bg-white text-black hover:bg-neutral-200',
  dark: 'bg-card text-ink border border-line hover:border-line-strong',
};

const SIZES = {
  xs: 'h-8 px-3 text-xs',
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  children, variant = 'primary', size = 'md', className = '',
  loading = false, fullWidth = false, pill = false, icon: Icon, ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold select-none
        ${pill ? 'rounded-full' : 'rounded-xl'} ${SIZES[size]} ${VARIANTS[variant]}
        ${fullWidth ? 'w-full' : ''}
        transition-all duration-200 active:scale-[.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
