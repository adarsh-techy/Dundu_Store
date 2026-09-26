import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function SectionHeader({ eyebrow, title, subtitle, to, linkLabel = 'View all', className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-5 md:mb-7 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="font-display text-2xl md:text-[1.9rem] leading-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary shrink-0">
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
