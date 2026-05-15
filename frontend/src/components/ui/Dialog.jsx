import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

// Dialog inspiré shadcn - structure : Dialog > DialogContent (header + body + footer)
// API simple : <Dialog open onClose>{children}</Dialog>

export function Dialog({ open, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-popover text-popover-foreground border border-border rounded-xl shadow-xl',
          'flex flex-col max-h-[90vh] w-full animate-slide-in overflow-hidden',
          sizes[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, icon, description, onClose }) {
  return (
    <header className="px-6 py-5 border-b border-border flex items-start gap-4">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-foreground leading-snug">{children}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1.5 -m-1.5 rounded-md hover:bg-accent transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      )}
    </header>
  );
}

export function DialogBody({ children, className = '' }) {
  return <div className={clsx('flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>;
}

export function DialogFooter({ children }) {
  return (
    <footer className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2 shrink-0">
      {children}
    </footer>
  );
}
