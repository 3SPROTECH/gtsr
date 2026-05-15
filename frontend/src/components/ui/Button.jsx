import { forwardRef } from 'react';
import clsx from 'clsx';

// Variantes inspirées de shadcn/ui
const VARIANTS = {
  default:    'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline:    'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
  secondary:  'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost:      'hover:bg-accent hover:text-accent-foreground',
  link:       'text-primary underline-offset-4 hover:underline',
  danger:     'border border-destructive/30 bg-background text-destructive hover:bg-destructive/10',
};

const SIZES = {
  default: 'h-9 px-3.5 py-2 text-sm',
  sm:      'h-8 px-3 text-[12px] gap-1',
  lg:      'h-10 px-6 text-sm',
  xs:      'h-7 px-2.5 text-[11px] gap-1',
  icon:    'h-9 w-9',
};

export const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'default', asChild = false, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
