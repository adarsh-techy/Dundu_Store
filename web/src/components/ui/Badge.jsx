const COLORS = {
  pink: 'bg-primary/15 text-primary-soft border-primary/30',
  red: 'bg-danger/15 text-danger border-danger/25',
  green: 'bg-success/15 text-success border-success/25',
  yellow: 'bg-warning/15 text-warning border-warning/25',
  blue: 'bg-info/15 text-info border-info/25',
  gray: 'bg-white/5 text-muted border-line',
  solid: 'bg-primary text-white border-primary',
};

export default function Badge({ children, color = 'gray', className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${COLORS[color]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
