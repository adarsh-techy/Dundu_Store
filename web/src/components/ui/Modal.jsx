import { useEffect } from 'react';
import { X } from 'lucide-react';

/** Bottom sheet on mobile, centred dialog on desktop. */
export default function Modal({ open, onClose, title, children, footer, size = 'sm' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className={`w-full ${width} card rounded-b-none md:rounded-b-[1.125rem] animate-slide-up max-h-[92vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
            <p className="font-semibold text-ink">{title}</p>
            <button onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-white/5" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 pb-5 pt-2 shrink-0 safe-bottom">{footer}</div>}
      </div>
    </div>
  );
}
