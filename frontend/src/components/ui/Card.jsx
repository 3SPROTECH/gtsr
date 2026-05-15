import clsx from 'clsx';
import { forwardRef } from 'react';

export const Card = forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={clsx('bg-card text-card-foreground border border-border rounded-xl overflow-hidden', className)} {...props} />;
});

export const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={clsx('px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-3', className)} {...props} />;
});

export const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h2 ref={ref} className={clsx('text-sm font-semibold leading-none tracking-tight flex items-center gap-2', className)} {...props} />;
});

export const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={clsx('text-xs text-muted-foreground mt-1', className)} {...props} />;
});

export const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={clsx('p-5', className)} {...props} />;
});

export const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={clsx('px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2', className)} {...props} />;
});
