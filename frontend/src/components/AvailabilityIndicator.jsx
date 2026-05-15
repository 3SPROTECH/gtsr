import clsx from 'clsx';
import { AVAILABILITY_LABELS, AVAILABILITY_DOT } from '../utils/enums';

/**
 * Petit dot coloré (+ label optionnel) indiquant la disponibilité d'un utilisateur.
 * Vert = disponible, orange = occupé, gris = absent.
 *
 *   <AvailabilityIndicator value={user.availability} />          // dot seul
 *   <AvailabilityIndicator value={user.availability} showLabel/> // dot + libellé
 */
export function AvailabilityIndicator({ value, showLabel = false, className = '', size = 'sm' }) {
  if (!value) return null;
  const dot = AVAILABILITY_DOT[value] || 'bg-muted-foreground/40';
  const label = AVAILABILITY_LABELS[value] || value;
  const dotSize = size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';

  return (
    <span
      className={clsx('inline-flex items-center gap-1.5', className)}
      title={label}
      aria-label={`Statut : ${label}`}
    >
      <span className={clsx('rounded-full ring-2 ring-background shrink-0', dotSize, dot)} />
      {showLabel && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}
