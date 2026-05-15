export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin text-brand-600" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size={36} />
    </div>
  );
}
