import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clear = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 4000);
    return () => clearTimeout(t);
  }, [toast, clear]);

  if (!toast) return null;
  const variants = {
    success: 'bg-emerald-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-brand-600 text-white',
  };
  return (
    <div className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-md shadow-lg text-sm ${variants[toast.type] || variants.info}`}>
      {toast.message}
    </div>
  );
}

export const toast = {
  success: (message) => useUiStore.getState().pushToast({ type: 'success', message }),
  error:   (message) => useUiStore.getState().pushToast({ type: 'error', message }),
  info:    (message) => useUiStore.getState().pushToast({ type: 'info', message }),
};

// Extrait le message le plus parlant d'une erreur axios (validation Zod, AppError, etc.)
export function extractApiError(err, fallback = 'Erreur') {
  const data = err?.response?.data?.error;
  if (!data) return err?.message || fallback;
  // Erreurs de validation Zod (renvoyées avec details)
  if (data.code === 'VALIDATION_ERROR' && Array.isArray(data.details) && data.details.length) {
    return data.details.map(d => {
      const field = (d.path || []).join('.');
      return field ? `${field} : ${d.message}` : d.message;
    }).join(' · ');
  }
  return data.message || fallback;
}
