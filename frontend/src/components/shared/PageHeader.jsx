import { Icon } from '../Icons';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export function PageHeader({ icon, title, description, breadcrumbs = [], actions, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Icon glyph={icon} size="md" />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-border">/</span>}
                  {b.to ? <Link to={b.to} className="hover:text-foreground">{b.label}</Link> : <span>{b.label}</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
