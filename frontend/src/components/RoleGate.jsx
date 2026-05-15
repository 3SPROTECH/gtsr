import { useAuthStore } from '../stores/authStore';

// Affichage conditionnel selon rôle
export function RoleGate({ roles, children, fallback = null }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!roles.includes(role)) return fallback;
  return children;
}
