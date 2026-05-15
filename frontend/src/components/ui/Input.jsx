import { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={clsx(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:bg-muted',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:bg-muted resize-y',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Label = forwardRef(function Label({ className, children, required, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={clsx('text-xs font-medium text-foreground mb-1.5 block leading-none', className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
});
