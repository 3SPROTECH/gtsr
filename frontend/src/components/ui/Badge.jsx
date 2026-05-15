import clsx from 'clsx';

const VARIANTS = {
  // ----- Variants génériques (thème) -----
  default:    'border-transparent bg-primary text-primary-foreground',
  secondary:  'border-transparent bg-secondary text-secondary-foreground',
  destructive:'border-transparent bg-destructive text-destructive-foreground',
  outline:    'border-border text-foreground',
  success:    'border-success/30 bg-success-subtle text-success',
  warning:    'border-warning/30 bg-warning-subtle text-warning',
  info:       'border-info/30 bg-info-subtle text-info',
  muted:      'border-border bg-muted text-muted-foreground',

  // ----- Statuts de ticket (palette dédiée) -----
  'status-open':       'border-transparent bg-[#DBEAFE] text-[#1E40AF]',
  'status-progress':   'border-transparent bg-[#FEF3C7] text-[#92400E]',
  'status-done':       'border-transparent bg-[#D1FAE5] text-[#065F46]',
  'status-cancelled':  'border-transparent bg-[#FEE2E2] text-[#991B1B]',

  // ----- Priorités -----
  'priority-low':      'border-transparent bg-[#D1FAE5] text-[#065F46]',
  'priority-medium':   'border-transparent bg-[#FEF3C7] text-[#92400E]',
  'priority-high':     'border-transparent bg-[#FFE8D6] text-[#9A3412]',
  'priority-critical': 'border-transparent bg-[#FEE2E2] text-[#991B1B]',

  // ----- Grades G1 → G5 -----
  'grade-G1': 'border-transparent bg-[#D1FAE5] text-[#065F46]',
  'grade-G2': 'border-transparent bg-[#ECFCCB] text-[#3F6212]',
  'grade-G3': 'border-transparent bg-[#FEF3C7] text-[#92400E]',
  'grade-G4': 'border-transparent bg-[#FFE8D6] text-[#9A3412]',
  'grade-G5': 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
};

export function Badge({ className, variant = 'default', children, ...rest }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border',
        VARIANTS[variant] || VARIANTS.default,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
