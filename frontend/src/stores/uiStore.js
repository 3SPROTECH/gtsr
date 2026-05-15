import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toast: null,
  pushToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
