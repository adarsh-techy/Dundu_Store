import { Link } from 'react-router-dom';
import Button from './Button';

export default function EmptyState({ icon: Icon, emoji, title, description, action, to, onAction, compact = false }) {
  return (
    <div className={`text-center ${compact ? 'py-10' : 'py-20'} animate-fade-up`}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-elevated border border-line">
        {Icon ? <Icon className="h-7 w-7 text-primary" /> : <span className="text-3xl">{emoji || '🛍️'}</span>}
      </div>
      <p className="font-display text-xl text-ink">{title}</p>
      {description && <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto">{description}</p>}
      {action && (
        <div className="mt-6">
          {to ? (
            <Link to={to}><Button pill>{action}</Button></Link>
          ) : (
            <Button pill onClick={onAction}>{action}</Button>
          )}
        </div>
      )}
    </div>
  );
}
